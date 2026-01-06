import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card, Table, Form, Row, Col, Button, Spinner, Tabs, Tab, InputGroup } from 'react-bootstrap';
import { Search } from 'lucide-react';
import TablePagination from '../components/common/TablePagination';
import { formatDate, formatStaffName } from '../utils/format.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Reports() {
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [leaveReport, setLeaveReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    department: ''
  });
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('attendance');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchAttendanceReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/attendance?${params.toString()}`);
      setAttendanceReport(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load attendance report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/leave?${params.toString()}`);
      setLeaveReport(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load leave report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const generateAttendanceStats = () => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0
    };

    attendanceReport.forEach(att => {
      if (att.status === 'present') stats.present++;
      else if (att.status === 'absent') stats.absent++;
      else if (att.status === 'late') stats.late++;
    });

    return [
      { name: 'Present', value: stats.present },
      { name: 'Absent', value: stats.absent },
      { name: 'Late', value: stats.late }
    ];
  };

  const generateLeaveStats = () => {
    const stats = {
      approved: 0,
      pending: 0,
      rejected: 0
    };

    leaveReport.forEach(leave => {
      if (leave.status === 'approved') stats.approved++;
      else if (leave.status === 'pending') stats.pending++;
      else if (leave.status === 'rejected') stats.rejected++;
    });

    return [
      { name: 'Approved', value: stats.approved },
      { name: 'Pending', value: stats.pending },
      { name: 'Rejected', value: stats.rejected }
    ];
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const filteredAttendanceReport = attendanceReport.filter((att) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(att.staff_name || '').toLowerCase().includes(searchLower) ||
      String(att.status || '').toLowerCase().includes(searchLower) ||
      formatDate(att.attendance_date || att.date).toLowerCase().includes(searchLower)
    );
  });

  const filteredLeaveReport = leaveReport.filter((leave) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(leave.staff_name || '').toLowerCase().includes(searchLower) ||
      String(leave.leave_type || '').toLowerCase().includes(searchLower) ||
      String(leave.status || '').toLowerCase().includes(searchLower) ||
      formatDate(leave.start_date).toLowerCase().includes(searchLower) ||
      formatDate(leave.end_date).toLowerCase().includes(searchLower)
    );
  });

  // Pagination for attendance report
  const attendanceTotalPages = Math.ceil(filteredAttendanceReport.length / itemsPerPage);
  const attendanceStartIndex = (currentPage - 1) * itemsPerPage;
  const attendanceEndIndex = attendanceStartIndex + itemsPerPage;
  const paginatedAttendanceReport = filteredAttendanceReport.slice(attendanceStartIndex, attendanceEndIndex);

  // Pagination for leave report
  const leaveTotalPages = Math.ceil(filteredLeaveReport.length / itemsPerPage);
  const leaveStartIndex = (currentPage - 1) * itemsPerPage;
  const leaveEndIndex = leaveStartIndex + itemsPerPage;
  const paginatedLeaveReport = filteredLeaveReport.slice(leaveStartIndex, leaveEndIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" role="status" className="spinner-custom">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 className="mb-4 fw-bold">Reports</h1>

      <Card className="custom-card mb-4">
        <div className="card-header-custom">
          <h4>Filters</h4>
        </div>
        <Row className="g-3">
          <Col md={4}>
            <Form.Label className="form-label-custom">Date From</Form.Label>
            <Form.Control
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="form-control-custom"
            />
          </Col>
          <Col md={4}>
            <Form.Label className="form-label-custom">Date To</Form.Label>
            <Form.Control
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="form-control-custom"
            />
          </Col>
          <Col md={4} className="d-flex align-items-end">
            <Button variant="primary" onClick={() => {
              fetchAttendanceReport();
              fetchLeaveReport();
            }} className="w-100">
              Generate Reports
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="custom-card mb-4">
        <Row>
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <Search size={18} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control-custom"
              />
            </InputGroup>
          </Col>
        </Row>
      </Card>

      <Card className="custom-card">
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          <Tab eventKey="attendance" title="Attendance Report">
            <div className="mb-4">
              <h5>Attendance Statistics</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={generateAttendanceStats()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {generateAttendanceStats().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="table-responsive">
              <Table className="custom-table" hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff</th>
                    <th>Status</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAttendanceReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No attendance data found
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendanceReport.map((att) => (
                      <tr key={att.id}>
                        <td>{formatDate(att.attendance_date || att.date)}</td>
                        <td className="fw-semibold">{formatStaffName(att)}</td>
                        <td>
                          <span className={`badge bg-${
                            att.status === 'present' ? 'success' :
                            att.status === 'late' ? 'warning' :
                            att.status === 'absent' ? 'danger' : 'secondary'
                          }`}>
                            {att.status || 'N/A'}
                          </span>
                        </td>
                        <td>{att.clock_in ? new Date(att.clock_in).toLocaleTimeString() : 'N/A'}</td>
                        <td>{att.clock_out ? new Date(att.clock_out).toLocaleTimeString() : 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
            {filteredAttendanceReport.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={attendanceTotalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredAttendanceReport.length}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            )}
          </Tab>

          <Tab eventKey="leave" title="Leave Report">
            <div className="mb-4">
              <h5>Leave Statistics</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={generateLeaveStats()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {generateLeaveStats().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="table-responsive">
              <Table className="custom-table" hover>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeaveReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No leave data found
                      </td>
                    </tr>
                  ) : (
                    paginatedLeaveReport.map((leave) => (
                      <tr key={leave.id}>
                        <td className="fw-semibold">{formatStaffName(leave)}</td>
                        <td>{leave.leave_type || 'N/A'}</td>
                        <td>{formatDate(leave.start_date)}</td>
                        <td>{formatDate(leave.end_date)}</td>
                        <td>
                          <span className={`badge bg-${
                            leave.status === 'approved' ? 'success' :
                            leave.status === 'pending' ? 'warning' :
                            leave.status === 'rejected' ? 'danger' : 'secondary'
                          }`}>
                            {leave.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
            {filteredLeaveReport.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={leaveTotalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredLeaveReport.length}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            )}
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
}

