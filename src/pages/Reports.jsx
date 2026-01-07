import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Form, Row, Col, Button, Spinner, InputGroup } from 'react-bootstrap';
import { Search, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasFullControl, hasExecutivePrivileges, normalizeRole, ROLE } from '../utils/roles';
import { formatRole } from '../utils/format.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Map status to attendance codes
const getAttendanceCode = (status) => {
  const normalized = status?.toLowerCase() || '';
  if (normalized === 'present') return 'P';
  if (normalized === 'late') return 'HD'; // Half-day for late
  if (normalized === 'on-leave' || normalized === 'onleave') return 'L';
  if (normalized === 'overtime') return 'HO'; // Off-day overtime indicator
  if (normalized === 'holiday' || normalized === 'off' || normalized === 'off-day') return 'H';
  if (normalized === 'absent') return 'A';
  return '';
};

// Identify weekend/off-days based on shift days per week (5-day: Sat+Sun off, 6-day: Sun off)
const isOffDay = (shiftDays, date) => {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  if (shiftDays === 5) {
    return day === 0 || day === 6;
  }
  // Default 6-day week: only Sunday off
  return day === 0;
};

// Normalize shift days from record/user fields; default to 6 (only Sunday off)
const parseShiftDays = (record) => {
  const raw =
    record?.shift_days ??
    record?.shiftDays ??
    record?.shift_days_per_week ??
    record?.shiftdays ??
    record?.shift ??
    record?.shift_days_week ??
    record?.shift_days_perweek ??
    record?.shift_days_per_week ??
    record?.shiftdays;
  const parsed = parseInt(raw, 10);
  if (!Number.isNaN(parsed) && (parsed === 5 || parsed === 6)) {
    return parsed;
  }
  return 6;
};

const formatDateForKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForAPI = (date) => {
  return formatDateForKey(date);
};

const formatDateForExcel = (date) => {
  const day = date.getDate();
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][date.getMonth()];
  return `${day} ${month}`;
};

const formatRoleDisplay = (role) => {
  if (!role) return '-';
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Reports() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preparedBy, setPreparedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [acceptedBy, setAcceptedBy] = useState('');
  const [rawAttendanceData, setRawAttendanceData] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [holidays, setHolidays] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  const userRole = normalizeRole(user?.role);
  const isGeneralManager = userRole === ROLE.GENERAL_MANAGER;
  const isFullControlUser = hasFullControl(userRole);
  const canAccessReports = hasExecutivePrivileges(userRole);

  // Generate years list (current year ± 5 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  }, []);

  // Calculate date range for selected month
  const getMonthDateRange = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    return {
      from: firstDay,
      to: lastDay,
    };
  }, [selectedMonth, selectedYear]);

  // Get all dates in the month
  const getMonthDates = useMemo(() => {
    const dates = [];
    const { from, to } = getMonthDateRange;
    const current = new Date(from);
    while (current <= to) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [getMonthDateRange]);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const response = await api.get('/departments');
        setDepartments(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      } finally {
        setDepartmentsLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch holidays for the selected month/year
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const { from, to } = getMonthDateRange;
        const dateFrom = formatDateForAPI(from);
        const dateTo = formatDateForAPI(to);
        
        const response = await api.get('/holidays');
        const allHolidays = response.data.data || [];
        // Filter holidays for the selected month
        const monthHolidays = allHolidays.filter(h => {
          const holidayDate = h.date || h.date;
          return holidayDate >= dateFrom && holidayDate <= dateTo;
        });
        setHolidays(monthHolidays);
      } catch (error) {
        console.error('Error loading holidays:', error);
        setHolidays([]);
      }
    };
    
    loadHolidays();
  }, [selectedMonth, selectedYear, getMonthDateRange]);

  // Get user departments
  const userDepartments = useMemo(() => {
    const deptFields = [
      ...(Array.isArray(user?.departments) ? user.departments : []),
      user?.department,
      user?.empDeptt,
      user?.emp_deptt,
    ].filter(Boolean);
    return Array.from(new Set(deptFields.map((d) => String(d).trim()))).filter(Boolean);
  }, [user]);

  const matchesDepartment = (deptValue, targets) => {
    if (!targets || targets.length === 0) return true;
    const normalizedTargets = targets.map((d) => String(d).trim().toLowerCase());
    const value = String(deptValue || '').trim().toLowerCase();
    return value && normalizedTargets.includes(value);
  };

  const applyDepartmentFilter = useMemo(
    () => (data) => {
      if (!Array.isArray(data)) return [];
      // General Manager: force assigned departments
      if (isGeneralManager && userDepartments.length > 0) {
        return data.filter((record) =>
          matchesDepartment(record.empDeptt || record.emp_deptt || record.department, userDepartments)
        );
      }
      // CEO/Super Admin with selected department
      if (isFullControlUser && selectedDepartment && selectedDepartment !== 'all') {
        return data.filter((record) =>
          matchesDepartment(record.empDeptt || record.emp_deptt || record.department, [selectedDepartment])
        );
      }
      return data;
    },
    [isGeneralManager, isFullControlUser, selectedDepartment, userDepartments]
  );

  useEffect(() => {
    setAttendanceData(applyDepartmentFilter(rawAttendanceData));
  }, [rawAttendanceData, applyDepartmentFilter]);

  // Build department options from API departments
  const departmentOptions = [
    { label: 'All Departments', value: 'all' },
    ...departments.map(dept => ({ label: dept.label, value: dept.id }))
  ];

  // Group attendance by employee
  const groupedByEmployee = useMemo(() => {
    const grouped = new Map();
    
    attendanceData.forEach(record => {
      const staffId = record.staff_id || 'unknown';
      // Use empNo from DB table (handle both camelCase and snake_case)
      const empNo = record.empNo || record.emp_no || null;
      // Use role from DB table
      const role = record.role || null;
      // Use empDeptt from DB table (handle both camelCase and snake_case)
      const empDeptt = record.empDeptt || record.emp_deptt || null;
      const location = record.area_name || 'N/A';
      const shiftDays = parseShiftDays(record);
      
      if (!grouped.has(staffId)) {
        grouped.set(staffId, {
          staffId,
          empNo,
          role,
          department: empDeptt,
          location,
          staffName: record.staff_name || 'Unknown',
          attendance: new Map(),
          shiftDays,
        });
      }
      
      const employee = grouped.get(staffId);
      // Update fields if they weren't set initially
      if (!employee.empNo && empNo) {
        employee.empNo = empNo;
      }
      if (!employee.role && role) {
        employee.role = role;
      }
      if (!employee.department && empDeptt) {
        employee.department = empDeptt;
      }
      if (!employee.location && location) {
        employee.location = location;
      }
      if (!employee.shiftDays && shiftDays) {
        employee.shiftDays = shiftDays;
      }
      const date = record.attendance_date;
      if (date) {
        let dateObj;
        try {
          dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) {
            console.warn('Invalid date:', date);
            return; // Skip invalid dates
          }
        } catch (error) {
          console.warn('Error parsing date:', date, error);
          return; // Skip invalid dates
        }
        const offDay = isOffDay(shiftDays, dateObj);
        const dateStr = formatDateForKey(dateObj);
        // Check if this date is a company holiday
        const isCompanyHoliday = holidays.some(h => (h.date || h.date) === dateStr);
        const isHoliday = offDay || isCompanyHoliday;
        const isMarkedAbsent = (record.status || '').toLowerCase() === 'absent';
        const hasOvertime = record.overtime || false;

        let codeOverride = getAttendanceCode(record.status);
        let statusOverride = record.status;

        if (isHoliday) {
          if (hasOvertime) {
            codeOverride = 'HO'; // Off-day overtime
            statusOverride = 'overtime';
          } else if (isMarkedAbsent) {
            codeOverride = 'H';
            statusOverride = 'holiday';
          } else {
            codeOverride = 'H';
            statusOverride = 'holiday';
          }
        }

        employee.attendance.set(date, {
          status: statusOverride,
          code: codeOverride,
          overtime: record.overtime || false,
          double_duty: record.double_duty || false,
        });
      }
    });

    // Calculate summary for each employee
    const result = Array.from(grouped.values()).map(emp => {
      let present = 0;
      let leave = 0;
      let absent = 0;
      let overtime = 0;
      let doubleDuty = 0;
      let workingDays = 0; // excludes holidays

      getMonthDates.forEach(date => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
          return; // Skip invalid dates
        }
        const dateStr = formatDateForKey(date);
        let att = emp.attendance.get(dateStr);
        const offDay = isOffDay(emp.shiftDays || 6, date);
        // Check if this date is a company holiday
        const isCompanyHoliday = holidays.some(h => (h.date || h.date) === dateStr);
        const isHoliday = offDay || isCompanyHoliday;

        // If no attendance record and it's an off-day or holiday, mark as Holiday
        if (!att && isHoliday) {
          att = {
            status: 'holiday',
            code: 'H',
            overtime: false,
            double_duty: false,
          };
          emp.attendance.set(dateStr, att);
        }

        if (att) {
          const code = att.code;
          if (code === 'P') present++;
          else if (code === 'HD') present++; // Half-day counts as present
          else if (code === 'L') leave++;
          else if (code === 'A') absent++;
          if (att.overtime) overtime++;
          if (att.double_duty) doubleDuty++;

          if (code !== 'H') {
            workingDays++;
          }
        } else {
          // No record and not an off-day
          absent++;
          workingDays++;
        }
      });

      return {
        ...emp,
        summary: {
          present,
          leave,
          absent,
          overtime,
          doubleDuty,
          workingDays,
        },
      };
    });

    return result.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [attendanceData, getMonthDates, holidays]);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const { from, to } = getMonthDateRange;
      const dateFrom = formatDateForAPI(from);
      const dateTo = formatDateForAPI(to);

      const response = await api.get('/attendance/report', {
        params: {
          dateFrom,
          dateTo,
        }
      });
      
      // Handle response format: { success: true, data: [...] }
      const data = response.data?.data || (Array.isArray(response.data) ? response.data : []);
      setRawAttendanceData(data);
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Failed to generate attendance report');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      if (groupedByEmployee.length === 0) {
        toast.error('No data to export');
        return;
      }

      const monthName = MONTHS[selectedMonth];
      const monthYear = `${monthName}, ${selectedYear}`;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Load and add company logo
      let logoAdded = false;
      // Get base URL from Vite config (handles subdirectory deployment)
      const baseUrl = import.meta.env.BASE_URL || '/';
      // Remove trailing slash if present and ensure leading slash
      const basePath = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      // Construct full URLs using window.location for better compatibility
      const origin = window.location.origin;
      const logoUrls = [
        `${origin}${basePath}/logo.png`,
        `${origin}${basePath}/logo-1.png`,
        `${origin}/logo.png`, // Fallback for development
        `${origin}/logo-1.png`,
        `${basePath}/logo.png`, // Relative to base
        `${basePath}/logo-1.png`,
        '/logo.png', // Absolute fallback
        '/logo-1.png',
      ];
      
      console.log('Attempting to load logo from paths:', logoUrls);
      
      for (const logoUrl of logoUrls) {
        try {
          const response = await fetch(logoUrl);
          if (response.ok) {
            const blob = await response.blob();
            const reader = new FileReader();
            
            await new Promise((resolve) => {
              reader.onloadend = () => {
                try {
                  const base64data = reader.result;
                  if (base64data && typeof base64data === 'string') {
                    // Detect image format from data URL
                    let imageFormat = 'PNG';
                    if (base64data.startsWith('data:image/jpeg') || base64data.startsWith('data:image/jpg')) {
                      imageFormat = 'JPEG';
                    } else if (base64data.startsWith('data:image/png')) {
                      imageFormat = 'PNG';
                    }
                    
                    // Get image dimensions to maintain aspect ratio
                    const img = new Image();
                    img.onload = () => {
                      const originalWidth = img.width;
                      const originalHeight = img.height;
                      const aspectRatio = originalWidth / originalHeight;
                      
                      // Set fixed width and calculate height to maintain aspect ratio
                      const logoWidth = 15; // mm
                      const logoHeight = logoWidth / aspectRatio;
                      
                      // Position logo to align with text (text starts at Y=15, logo positioned at Y=12 for better alignment)
                      doc.addImage(base64data, imageFormat, 10, 12, logoWidth, logoHeight);
                      logoAdded = true;
                      console.log(`✅ Logo added successfully from ${logoUrl} (${logoWidth}mm x ${logoHeight.toFixed(2)}mm)`);
                      resolve();
                    };
                    img.onerror = () => {
                      // Fallback: use fixed dimensions if image load fails
                      const logoWidth = 15;
                      const logoHeight = 15;
                      // Position logo to align with text (text starts at Y=15, logo positioned at Y=12 for better alignment)
                      doc.addImage(base64data, imageFormat, 10, 12, logoWidth, logoHeight);
                      logoAdded = true;
                      console.log(`✅ Logo added successfully from ${logoUrl} (fallback dimensions)`);
                      resolve();
                    };
                    img.src = base64data;
                  } else {
                    resolve();
                  }
                } catch (error) {
                  console.warn('Error adding logo to PDF:', error);
                  resolve();
                }
              };
              reader.onerror = () => {
                console.warn(`Error reading logo file: ${logoUrl}`);
                resolve();
              };
              reader.readAsDataURL(blob);
            });
            
            if (logoAdded) break;
          } else {
            console.warn(`Logo not found at ${logoUrl} (status: ${response.status})`);
          }
        } catch (error) {
          console.warn(`Error fetching logo ${logoUrl}:`, error);
          // Try next logo
        }
      }
      
      if (!logoAdded) {
        console.warn('No logo was loaded. Check browser console for details. Continuing without logo.');
      }

      // Header - adjusted to accommodate logo
      doc.setFontSize(16);
      doc.text('WATER & SANITATION SERVICE COMPANY MINGORA SWAT', 28, 15);
      doc.setFontSize(10);
      doc.text('MSK TOWER, G.T ROAD, RAHIMABAD', 28, 22);
      doc.setFontSize(14);
      doc.text(`Attendance: ${monthYear}`, 105, 30, { align: 'center' });

      // Workflow
      doc.setFontSize(9);
      doc.text(`Prepared By: ${preparedBy || 'N/A'}`, 20, 37);
      doc.text(`Approved By: ${approvedBy || 'N/A'}`, 105, 37, { align: 'center' });
      doc.text(`Accepted By: ${acceptedBy || 'N/A'}`, 190, 37, { align: 'right' });

      // Prepare table data
      const tableData = groupedByEmployee.map(emp => {
        const dateValues = getMonthDates
          .filter(date => date && date instanceof Date && !isNaN(date.getTime()))
          .map(date => {
            const dateStr = formatDateForKey(date);
            const att = emp.attendance.get(dateStr);
            return att ? att.code : '';
          });

        return [
          emp.empNo || emp.staffId || '',
          emp.staffName,
          formatRoleDisplay(emp.role),
          emp.department || '-',
          ...dateValues,
          emp.summary.present,
          emp.summary.leave,
          emp.summary.absent,
          emp.summary.overtime,
          emp.summary.doubleDuty,
          emp.summary.workingDays,
        ];
      });

      // Build headers
      const dateHeaders = getMonthDates
        .filter(date => date && date instanceof Date && !isNaN(date.getTime()))
        .map(date => {
          const day = date.getDate();
          const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
          return `${day}\n${dayName}`;
        });

      const headers = [
        'E.No',
        'Name',
        'Role',
        'Dept',
        ...dateHeaders,
        'P',
        'L',
        'A',
        'OT',
        'DD',
        'WD'
      ];

      // Calculate column widths for landscape A4 (297mm width)
      // Fixed columns: E.No (8mm), Name (30mm), Role (18mm), Dept (8mm), Summary (6 columns * 6mm = 36mm)
      // Total fixed: 100mm, remaining ~197mm for date columns
      const fixedColumnsWidth = 100;
      const availableWidth = 277; // 297mm - 20mm margins
      const dateColumnsCount = dateHeaders.length;
      const dateColumnWidth = Math.max(3.5, (availableWidth - fixedColumnsWidth) / dateColumnsCount);

      // Build column styles
      const columnStyles = {
        0: { cellWidth: 8, fontSize: 5, halign: 'center' }, // E.No
        1: { cellWidth: 30, fontSize: 5, halign: 'left' }, // Name
        2: { cellWidth: 18, fontSize: 5, halign: 'left' }, // Role
        3: { cellWidth: 8, fontSize: 5, halign: 'center' }, // Dept
      };

      // Add date column styles
      for (let i = 4; i < 4 + dateColumnsCount; i++) {
        columnStyles[i] = { cellWidth: dateColumnWidth, fontSize: 5, halign: 'center' };
      }

      // Add summary column styles
      const summaryStartIndex = 4 + dateColumnsCount;
      for (let i = 0; i < 6; i++) {
        columnStyles[summaryStartIndex + i] = { cellWidth: 6, fontSize: 5, halign: 'center' };
      }

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 45,
        styles: { 
          fontSize: 5, 
          cellPadding: 0.5,
          halign: 'center',
          valign: 'middle',
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: [0, 0, 0], 
          fontStyle: 'bold',
          fontSize: 5,
          cellPadding: 0.5,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: columnStyles,
        margin: { top: 45, left: 10, right: 10 },
        tableWidth: 'wrap',
        showHead: 'everyPage',
        didParseCell: function(data) {
          // Ensure text fits in cells
          if (data.column.index === 1 || data.column.index === 2) {
            // Name and Role columns - allow text wrapping
            data.cell.styles.overflow = 'linebreak';
            data.cell.styles.cellWidth = 'wrap';
          }
        },
      });

      // Footer
      doc.setFontSize(8);
      const pageHeight = doc.internal.pageSize.height;
      doc.text('This Computer generated Report doesn\'t require any Signature.', 105, pageHeight - 10, { align: 'center' });

      const fileName = `attendance_report_${MONTHS[selectedMonth]}_${selectedYear}.pdf`;
      doc.save(fileName);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF report');
    }
  };

  const exportToExcel = () => {
    try {
      if (groupedByEmployee.length === 0) {
        toast.error('No data to export');
        return;
      }

      const monthName = MONTHS[selectedMonth];
      const monthYear = `${monthName}, ${selectedYear}`;

      // Build Excel data
      const headers = [
        'Emp. No.',
        'Emp. Name',
        'Role',
        'Department',
        'Location',
        ...getMonthDates
          .filter(d => d && d instanceof Date && !isNaN(d.getTime()))
          .map(d => formatDateForExcel(d)),
        'Present',
        'Leave',
        'Absent',
        'Overtime',
        'D. Duty',
        'W. Days',
      ];

      const rows = groupedByEmployee.map(emp => {
        const dateValues = getMonthDates
          .filter(date => date && date instanceof Date && !isNaN(date.getTime()))
          .map(date => {
            const dateStr = formatDateForKey(date);
            const att = emp.attendance.get(dateStr);
            return att ? att.code : '';
          });

        return [
          emp.empNo || emp.staffId || '',
          emp.staffName,
          formatRoleDisplay(emp.role),
          emp.department || '-',
          emp.location || '-',
          ...dateValues,
          emp.summary.present,
          emp.summary.leave,
          emp.summary.absent,
          emp.summary.overtime,
          emp.summary.doubleDuty,
          emp.summary.workingDays,
        ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

      const fileName = `attendance_report_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel report');
    }
  };

  if (!canAccessReports) {
    return (
      <div className="fade-in d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <h2 className="mb-3">Access Denied</h2>
          <p className="text-muted">Only General Manager and above can access reports</p>
        </div>
      </div>
    );
  }

  const monthName = MONTHS[selectedMonth];
  const monthYear = `${monthName} ${selectedYear}`;

  return (
    <div className="fade-in">
      <h1 className="mb-4 fw-bold">Reports</h1>

      <Card className="custom-card mb-4">
        <div className="card-header-custom">
          <h4>Report Filters</h4>
        </div>
        <Row className="g-3">
          <Col md={3}>
            <Form.Label className="form-label-custom">Month</Form.Label>
            <Form.Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="form-control-custom"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label className="form-label-custom">Year</Form.Label>
            <Form.Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="form-control-custom"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Form.Select>
          </Col>
          {isFullControlUser && (
            <Col md={3}>
              <Form.Label className="form-label-custom">Department</Form.Label>
              <Form.Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="form-control-custom"
                disabled={departmentsLoading}
              >
                {departmentOptions.map((dept) => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </Form.Select>
            </Col>
          )}
        </Row>
        <Row className="g-3 mt-2">
          <Col md={4}>
            <Form.Label className="form-label-custom">Prepared By</Form.Label>
            <Form.Control
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="Enter name and ID"
              className="form-control-custom"
            />
          </Col>
          <Col md={4}>
            <Form.Label className="form-label-custom">Approved By</Form.Label>
            <Form.Control
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Enter name and ID"
              className="form-control-custom"
            />
          </Col>
          <Col md={4}>
            <Form.Label className="form-label-custom">Accepted By</Form.Label>
            <Form.Control
              type="text"
              value={acceptedBy}
              onChange={(e) => setAcceptedBy(e.target.value)}
              placeholder="Enter name and ID"
              className="form-control-custom"
            />
          </Col>
        </Row>
        <Row className="mt-3">
          <Col>
            <Button
              variant="primary"
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-100"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </Col>
        </Row>
      </Card>

      {groupedByEmployee.length > 0 && (
        <Card className="custom-card mb-4">
          <div className="card-header-custom d-flex justify-content-between align-items-center">
            <div>
              <h4>Report Results</h4>
              <p className="text-muted mb-0">
                {groupedByEmployee.length} employee(s) • {monthYear}
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-danger" onClick={exportToPDF}>
                <FileText size={18} className="me-2" />
                Export PDF
              </Button>
              <Button variant="outline-success" onClick={exportToExcel}>
                <FileSpreadsheet size={18} className="me-2" />
                Export Excel
              </Button>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
            <Table className="custom-table" bordered hover size="sm" style={{ tableLayout: 'auto', width: '100%', fontSize: '10px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
                <tr>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '50px', minWidth: '50px' }}>E.No</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '120px', minWidth: '120px' }}>Name</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '80px', minWidth: '80px' }}>Role</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '50px', minWidth: '50px' }}>Dept</th>
                  <th colSpan={getMonthDates.length} style={{ textAlign: 'center', fontSize: '9px', padding: '4px' }}>Daily Attendance</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '35px', minWidth: '35px' }}>P</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '35px', minWidth: '35px' }}>L</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '35px', minWidth: '35px' }}>A</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '35px', minWidth: '35px' }}>OT</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '35px', minWidth: '35px' }}>DD</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap', width: '35px', minWidth: '35px' }}>WD</th>
                </tr>
                <tr>
                  {getMonthDates
                    .filter(date => date && date instanceof Date && !isNaN(date.getTime()))
                    .map((date, idx) => {
                      const day = date.getDate();
                      const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
                      return (
                        <th key={idx} style={{ fontSize: '8px', textAlign: 'center', padding: '2px 1px', width: '22px', minWidth: '22px', maxWidth: '22px', lineHeight: '1.1' }}>
                          {day}
                          <br />
                          <small style={{ fontSize: '7px' }}>{dayName}</small>
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody>
                {groupedByEmployee.map((emp, idx) => {
                  const dateCells = getMonthDates
                    .filter(date => date && date instanceof Date && !isNaN(date.getTime()))
                    .map((date, dateIdx) => {
                      const dateStr = formatDateForKey(date);
                      const att = emp.attendance.get(dateStr);
                      const code = att ? att.code : '';
                      return (
                        <td key={dateIdx} style={{ 
                          textAlign: 'center', 
                          fontSize: '9px', 
                          padding: '2px 1px', 
                          width: '22px',
                          minWidth: '22px',
                          maxWidth: '22px',
                          whiteSpace: 'nowrap',
                          lineHeight: '1.2'
                        }}>
                          {code}
                        </td>
                      );
                    });

                  return (
                    <tr key={idx}>
                      <td style={{ fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap' }}>{emp.empNo || emp.staffId || '-'}</td>
                      <td style={{ fontSize: '9px', padding: '4px 6px', wordBreak: 'break-word', maxWidth: '120px' }}>{emp.staffName}</td>
                      <td style={{ fontSize: '9px', padding: '4px 6px', wordBreak: 'break-word', maxWidth: '80px' }}>{formatRoleDisplay(emp.role)}</td>
                      <td style={{ fontSize: '9px', padding: '4px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>{emp.department || '-'}</td>
                      {dateCells}
                      <td style={{ textAlign: 'center', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap' }}>{emp.summary.present}</td>
                      <td style={{ textAlign: 'center', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap' }}>{emp.summary.leave}</td>
                      <td style={{ textAlign: 'center', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap' }}>{emp.summary.absent}</td>
                      <td style={{ textAlign: 'center', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap' }}>{emp.summary.overtime}</td>
                      <td style={{ textAlign: 'center', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap' }}>{emp.summary.doubleDuty}</td>
                      <td style={{ textAlign: 'center', fontSize: '9px', padding: '4px 6px', whiteSpace: 'nowrap' }}>{emp.summary.workingDays}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          <div className="p-3 bg-light">
            <small className="text-muted">
              <strong>Legend:</strong> P = Present, L = Leave, A = Absent, H = Holiday, HD = Half Day, HO = Off-day Overtime, DD = Double Duty, WD = Working Days
            </small>
          </div>
        </Card>
      )}
    </div>
  );
}
