const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Department = require('../models/Department');
const { protect, normalizeRole, hasFullControl, checkDepartmentAccess } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const [totalStaffCount, supervisorCount, subEngineerCount, pendingLeaveRequestsCount] = await Promise.all([
      User.countDocuments({ role: 'staff', isActive: true }),
      User.countDocuments({ role: 'supervisor', isActive: true }),
      User.countDocuments({ role: 'sub_engineer', isActive: true }),
      LeaveRequest.countDocuments({ status: 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        totalStaff: totalStaffCount || 0,
        supervisorCount: supervisorCount || 0,
        subEngineerCount: subEngineerCount || 0,
        pendingLeaveRequestsCount: pendingLeaveRequestsCount || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/stats-by-role-dept
// @desc    Get stats by role and department
// @access  Private
router.get('/stats-by-role-dept', protect, async (req, res) => {
  try {
    const user = req.user;
    const normalizedRole = normalizeRole(user.role);

    if (!['manager', 'general_manager', 'ceo', 'super_admin'].includes(normalizedRole)) {
      return res.status(403).json({
        success: false,
        error: 'Manager or higher access required'
      });
    }

    const hasOrgWideAccess = hasFullControl(user.role);
    const { departmentId } = req.query;

    let departmentFilter = null;
    if (hasOrgWideAccess) {
      departmentFilter = departmentId ? [departmentId] : null;
    } else if (normalizedRole === 'general_manager') {
      const userDepts = user.departments || [];
      const singleDept = user.empDeptt; // ONLY use empDeptt - no fallback to department column
      departmentFilter = [...userDepts];
      if (singleDept) departmentFilter.push(singleDept);
      departmentFilter = Array.from(new Set(departmentFilter));
    } else if (normalizedRole === 'manager') {
      const managerDept = user.empDeptt; // ONLY use empDeptt - no fallback to department column
      departmentFilter = managerDept ? [managerDept] : [];
    }

    if (!hasOrgWideAccess && (!departmentFilter || departmentFilter.length === 0)) {
      return res.json({
        success: true,
        data: {
          byRole: [],
          byDepartment: [],
          byRoleAndDepartment: [],
          totalUsers: 0
        }
      });
    }

    const allUsers = await User.find({ isActive: true }, { limit: 10000 });

    const filteredUsers = allUsers.filter(u => {
      if (!departmentFilter) return true;
      const userDept = u.empDeptt; // ONLY use empDeptt - no fallback to department column
      const userDepts = u.departments || [];
      return departmentFilter.some(d =>
        normalizeRole(userDept) === normalizeRole(d) ||
        userDepts.some(ud => normalizeRole(ud) === normalizeRole(d))
      );
    });

    const statsByRole = {};
    const statsByDepartment = {};
    const statsByRoleAndDepartment = {};

    filteredUsers.forEach(u => {
      const role = normalizeRole(u.role) || 'unknown';
      // ONLY use empDeptt - no fallback to department column
      // If empDeptt is null/undefined/empty, use 'unassigned'
      const deptRaw = u.empDeptt;
      const dept = (deptRaw && String(deptRaw).trim()) ? String(deptRaw).trim() : 'unassigned';

      statsByRole[role] = (statsByRole[role] || 0) + 1;
      statsByDepartment[dept] = (statsByDepartment[dept] || 0) + 1;

      const key = `${role}_${dept}`;
      if (!statsByRoleAndDepartment[key]) {
        statsByRoleAndDepartment[key] = { role, department: dept, count: 0 };
      }
      statsByRoleAndDepartment[key].count++;
    });

    res.json({
      success: true,
      data: {
        byRole: Object.entries(statsByRole).map(([role, count]) => ({ role, count })),
        byDepartment: Object.entries(statsByDepartment).map(([department, count]) => ({ department, count })),
        byRoleAndDepartment: Object.values(statsByRoleAndDepartment),
        totalUsers: filteredUsers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/users-by-department
// @desc    Get users by department with current attendance/leave status
// @access  Private
router.get('/users-by-department', protect, async (req, res) => {
  try {
    const user = req.user;
    const normalizedRole = normalizeRole(user.role);
    const { departmentId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    // Check access permissions
    if (!['manager', 'general_manager', 'ceo', 'super_admin'].includes(normalizedRole)) {
      return res.status(403).json({
        success: false,
        error: 'Manager or higher access required'
      });
    }

    const hasOrgWideAccess = hasFullControl(user.role);

    // Determine department filter
    let departmentFilter = null;
    if (hasOrgWideAccess) {
      if (departmentId && departmentId !== 'all') {
        try {
          // Look up department - frontend sends deptId as the id
          // Try by deptId first (most common case)
          let dept = null;
          const deptIdNum = parseInt(departmentId);
          if (!isNaN(deptIdNum)) {
            // First try to find by deptId (this is what frontend sends)
            dept = await Department.findOne({ deptId: deptIdNum, isActive: true });
            // If not found, try by primary key id
            if (!dept) {
              dept = await Department.findById(deptIdNum);
            }
          } else {
            // If departmentId is not a number, try as string id
            dept = await Department.findById(departmentId);
          }
          
          if (dept && dept.isActive !== false) {
            // Users have deptId (number) in empDeptt, so prioritize numeric matching
            // Include all possible formats for comprehensive matching
            departmentFilter = [
              dept.deptId,           // Primary: numeric deptId (most common)
              String(dept.deptId),   // String version of deptId
              dept.id,               // Primary key id (numeric)
              String(dept.id),       // Primary key id (string)
              dept.label,            // Department label/name
              dept.label.toLowerCase() // Lowercase label
            ].filter(Boolean);
            
            console.log(`[DEBUG] Department found and filter set:`, {
              departmentId: departmentId,
              deptId: dept.deptId,
              label: dept.label,
              filter: departmentFilter
            });
          } else {
            console.log(`[WARN] Department not found for departmentId: ${departmentId}`);
          }
        } catch (deptError) {
          console.error('Error fetching department:', deptError);
          // Continue without department filter if lookup fails
        }
      }
    } else if (normalizedRole === 'general_manager') {
      const userDepts = user.departments || [];
      const singleDept = user.empDeptt;
      departmentFilter = [...userDepts];
      if (singleDept) departmentFilter.push(singleDept);
      departmentFilter = Array.from(new Set(departmentFilter));
    } else if (normalizedRole === 'manager') {
      const managerDept = user.empDeptt;
      departmentFilter = managerDept ? [managerDept] : [];
    }

    if (!hasOrgWideAccess && (!departmentFilter || departmentFilter.length === 0)) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get all departments for mapping deptId to label
    const allDepartments = await Department.find({ isActive: true });
    const deptIdToLabelMap = new Map();
    allDepartments.forEach(dept => {
      deptIdToLabelMap.set(String(dept.deptId), dept.label);
      deptIdToLabelMap.set(String(dept.id), dept.label);
      deptIdToLabelMap.set(dept.deptId, dept.label);
      deptIdToLabelMap.set(dept.id, dept.label);
    });

    // Get all active users
    let allUsers = await User.find({ isActive: true }, { limit: 10000 });
    
    // Ensure allUsers is an array
    if (!Array.isArray(allUsers)) {
      allUsers = [];
    }

    // Filter by department if needed
    if (departmentFilter && departmentFilter.length > 0 && allUsers.length > 0) {
      const beforeFilterCount = allUsers.length;
      
      // Separate numeric and string filters for efficient matching
      const numericFilters = departmentFilter
        .map(d => {
          const num = parseInt(d);
          return isNaN(num) ? null : num;
        })
        .filter(n => n !== null);
      const stringFilters = departmentFilter
        .map(d => String(d).trim().toLowerCase())
        .filter(Boolean);
      
      // Debug: Check sample user empDeptt values
      const sampleUserDepts = allUsers.slice(0, 10).map(u => ({
        id: u.id,
        empDeptt: u.empDeptt,
        empDepttType: typeof u.empDeptt,
        empDepttParsed: u.empDeptt ? parseInt(u.empDeptt) : null
      }));
      
      console.log(`[DEBUG] Department filtering:`, {
        departmentFilter,
        numericFilters,
        stringFilters,
        totalUsers: beforeFilterCount,
        sampleUserDepts
      });
      
      allUsers = allUsers.filter(u => {
        if (!u) return false;
        
        // Primary: Match by numeric deptId (most common case)
        if (u.empDeptt !== null && u.empDeptt !== undefined) {
          const userDeptNum = parseInt(u.empDeptt);
          if (!isNaN(userDeptNum) && numericFilters.includes(userDeptNum)) {
            return true;
          }
          
          // Also try as string match
          const userDeptStr = String(u.empDeptt).trim().toLowerCase();
          if (stringFilters.includes(userDeptStr)) {
            return true;
          }
        }
        
        // Check departments array (for users with multiple departments)
        const userDepts = (u.departments || []);
        for (const ud of userDepts) {
          if (ud === null || ud === undefined) continue;
          
          // Try numeric match first
          const udNum = parseInt(ud);
          if (!isNaN(udNum) && numericFilters.includes(udNum)) {
            return true;
          }
          
          // Try string match
          const udStr = String(ud).trim().toLowerCase();
          if (stringFilters.includes(udStr)) {
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`[DEBUG] Department filter results:`, {
        beforeCount: beforeFilterCount,
        afterCount: allUsers.length,
        matchedUsers: allUsers.slice(0, 5).map(u => ({
          id: u.id,
          name: u.fullName,
          empDeptt: u.empDeptt
        }))
      });
    }

    // Get today's attendance records
    const todayAttendances = await Attendance.find({ attendanceDate: today }, {
      populate: ['staffId']
    });

    // Create a map of userId -> attendance status
    const attendanceMap = new Map();
    if (Array.isArray(todayAttendances)) {
      todayAttendances.forEach(att => {
        if (att && att.staffId) {
          const staffId = att.staffId.toString();
          const status = att.status || 'Absent';
          attendanceMap.set(staffId, {
            status: status,
            clockIn: att.clockIn,
            clockOut: att.clockOut,
            id: att.id
          });
        }
      });
    }

    // Get approved/pending leave requests for today
    const Holiday = require('../models/Holiday');
    const todayHoliday = await Holiday.findOne({ date: today });
    const isCompanyHoliday = !!todayHoliday;

    // Get all leave requests for today (approved and pending)
    // Note: LeaveRequest.find doesn't support $in, so we'll fetch all and filter
    const allLeaveRequests = await LeaveRequest.find({
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    // Filter for approved and pending only
    const leaveRequests = Array.isArray(allLeaveRequests) 
      ? allLeaveRequests.filter(leave => 
          leave && leave.status && (leave.status === 'approved' || leave.status === 'pending')
        )
      : [];

    // Create a map of userId -> leave request
    const leaveMap = new Map();
    leaveRequests.forEach(leave => {
      if (leave && leave.staffId) {
        const staffId = leave.staffId.toString();
        leaveMap.set(staffId, {
          id: leave.id,
          status: leave.status,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate
        });
      }
    });

    // Helper to check if today is weekly off day
    const isWeeklyOff = (user) => {
      const dayOfWeek = new Date().getDay(); // 0=Sunday, 6=Saturday
      const shiftDays = user.shiftDays || 6;
      
      if (shiftDays === 5) {
        return dayOfWeek === 0 || dayOfWeek === 6; // Sat or Sun
      }
      return dayOfWeek === 0; // Sunday only
    };

    // Format users with status
    const formattedUsers = allUsers.map(u => {
      const userId = u.id.toString();
      const attendance = attendanceMap.get(userId);
      const leave = leaveMap.get(userId);
      const weeklyOff = isWeeklyOff(u);
      
      let status = 'Absent';
      let statusDetail = '';

      if (leave) {
        if (leave.status === 'approved') {
          status = 'On Leave';
          statusDetail = `Leave (${leave.leaveType || 'N/A'})`;
        } else if (leave.status === 'pending') {
          status = 'On Leave (Pending)';
          statusDetail = `Pending Leave (${leave.leaveType || 'N/A'})`;
        }
      } else if (attendance) {
        if (attendance.status === 'Present' || attendance.status === 'Late') {
          if (attendance.clockOut) {
            status = 'Present';
            statusDetail = 'Present (Checked Out)';
          } else {
            status = 'Present';
            statusDetail = 'Present (Checked In)';
          }
        } else {
          status = 'Absent';
          statusDetail = 'Absent';
        }
      } else {
        // No attendance record
        if (weeklyOff || isCompanyHoliday) {
          status = 'Holiday';
          statusDetail = weeklyOff ? 'Weekly Off' : 'Company Holiday';
        } else {
          status = 'Absent';
          statusDetail = 'Absent';
        }
      }

      const deptRaw = u.empDeptt;
      let dept = 'Unassigned';
      
      // Map numeric department ID to department label
      if (deptRaw) {
        const deptStr = String(deptRaw).trim();
        const deptNum = parseInt(deptRaw);
        
        // Try to find label by numeric value or string value
        if (deptIdToLabelMap.has(deptStr)) {
          dept = deptIdToLabelMap.get(deptStr);
        } else if (!isNaN(deptNum) && deptIdToLabelMap.has(deptNum)) {
          dept = deptIdToLabelMap.get(deptNum);
        } else {
          // If no mapping found, use the raw value
          dept = deptStr;
        }
      }

      return {
        id: u.id,
        user_id: u.id,
        full_name: u.fullName || u.username || 'Unknown',
        username: u.username,
        email: u.email,
        role: u.role,
        department: dept,
        department_raw: deptRaw ? String(deptRaw).trim() : null, // Keep original for reference
        emp_no: u.empNo || null,
        status: status,
        status_detail: statusDetail,
        clock_in: attendance?.clockIn || null,
        clock_out: attendance?.clockOut || null,
        leave_type: leave?.leaveType || null,
        leave_start: leave?.startDate || null,
        leave_end: leave?.endDate || null
      };
    });

    // Group by department
    const byDepartment = {};
    formattedUsers.forEach(user => {
      const dept = user.department || 'Unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = [];
      }
      byDepartment[dept].push(user);
    });

    // Calculate summary stats per department
    const departmentStats = Object.keys(byDepartment).map(dept => {
      const users = byDepartment[dept];
      const stats = {
        department: dept,
        total: users.length,
        present: 0,
        absent: 0,
        onLeave: 0,
        holiday: 0,
        pendingLeave: 0
      };

      users.forEach(user => {
        const status = user.status.toLowerCase();
        if (status.includes('present')) {
          stats.present++;
        } else if (status.includes('absent')) {
          stats.absent++;
        } else if (status.includes('leave') && status.includes('pending')) {
          stats.pendingLeave++;
          stats.onLeave++;
        } else if (status.includes('leave')) {
          stats.onLeave++;
        } else if (status.includes('holiday')) {
          stats.holiday++;
        }
      });

      return stats;
    });

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        byDepartment: byDepartment,
        stats: departmentStats,
        summary: {
          total: formattedUsers.length,
          present: formattedUsers.filter(u => u.status.toLowerCase().includes('present')).length,
          absent: formattedUsers.filter(u => u.status.toLowerCase() === 'absent').length,
          onLeave: formattedUsers.filter(u => u.status.toLowerCase().includes('leave')).length,
          holiday: formattedUsers.filter(u => u.status.toLowerCase().includes('holiday')).length
        }
      }
    });
  } catch (error) {
    console.error('Error in users-by-department:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

