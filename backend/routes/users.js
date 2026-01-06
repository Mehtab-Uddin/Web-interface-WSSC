const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize, normalizeRole, hasFullControl, canManageUsers, checkDepartmentAccess } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const user = req.user;
    const normalizedRole = normalizeRole(user.role);

    // CEO/SuperAdmin/AdminAssistant can see all users including inactive
    const normalizedUserRole = normalizeRole(user.role);
    const shouldIncludeInactive = hasFullControl(user.role) || normalizedUserRole === 'admin_assistant' || includeInactive === 'true';

    const query = {};
    if (!shouldIncludeInactive) {
      query.isActive = true;
    }

    const startTime = Date.now();
    
    try {
      const users = await User.find(query, {
        sort: 'createdAt',
        limit: 1000
      });
      
      const queryTime = Date.now() - startTime;

      const formattedUsers = users.map(user => ({
        user_id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        username: user.username,
        created_at: user.createdAt,
        department: user.empDeptt || null, // ONLY use empDeptt - no fallback to department column
        departments: user.departments || [],
        manager_id: user.managerId?.toString() || null,
        general_manager_id: user.generalManagerId?.toString() || null,
        emp_fname: user.empFname || null,
        emp_deptt: user.empDeptt || null,
        emp_job: user.empJob || null,
        emp_grade: user.empGrade || null,
        emp_cell1: user.empCell1 || null,
        emp_cell2: user.empCell2 || null,
        emp_flg: user.empFlg || null,
        emp_married: user.empMarried || null,
        emp_gender: user.empGender || null,
        emp_no: user.empNo || null,
        emp_cnic: user.empCnic || null,
        is_active: user.isActive !== false
      }));

      res.json({
        success: true,
        data: formattedUsers
      });
    } catch (dbError) {
      console.error('[DB Error] Failed to fetch users:', dbError.message);
      return res.status(503).json({
        success: false,
        error: 'Database connection error',
        message: 'Unable to connect to database. Please check database configuration.'
      });
    }
  } catch (error) {
    console.error('[Error] Users route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/users/staff
// @desc    Get all staff members
// @access  Private
router.get('/staff', protect, async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff', isActive: true }, {
      sort: 'fullName',
      limit: 1000
    });

    const formattedStaff = staff.map(user => ({
      user_id: user.id,
      name: user.fullName || user.username || 'Unknown Staff',
      email: user.email,
      full_name: user.fullName,
      department: user.empDeptt || null, // ONLY use empDeptt - no fallback to department column
      emp_deptt: user.empDeptt || null, // Include emp_deptt explicitly
      manager_id: user.managerId?.toString() || null,
      supervisor_id: user.supervisorId?.toString() || null,
      empNo: user.empNo || null
    }));

    res.json({
      success: true,
      data: formattedStaff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/users/supervisors
// @desc    Get all supervisors
// @access  Private
router.get('/supervisors', protect, async (req, res) => {
  try {
    // Query directly to ensure we get the id field
    const { query } = require('../config/database');
    const sql = `SELECT id, email, username, fullName, role, empDeptt, departments, 
                 managerId, generalManagerId, isActive 
                 FROM users 
                 WHERE role = ? AND isActive = ? 
                 ORDER BY fullName 
                 LIMIT 1000`;
    const rawResults = await query(sql, ['supervisor', true]);
    
    console.log('Backend - Supervisors found (raw):', rawResults.length);

    const formattedSupervisors = rawResults.map((row) => {
      const userId = row.id;
      const managerId = row.managerId ? String(row.managerId) : null;
      
      return {
        user_id: userId, // Use id from database directly
        name: row.fullName || row.username || 'Unknown Supervisor',
        email: row.email,
        full_name: row.fullName,
        department: row.empDeptt || null, // ONLY use empDeptt - no fallback to department column
        emp_deptt: row.empDeptt || null, // Include emp_deptt explicitly
        manager_id: managerId // Ensure it's a string for consistent comparison
      };
    });

    res.json({
      success: true,
      data: formattedSupervisors
    });
  } catch (error) {
    console.error('Backend - Error fetching supervisors:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/users/managers
// @desc    Get all managers
// @access  Private
router.get('/managers', protect, async (req, res) => {
  try {
    // Query directly to ensure we get the id field
    const { query } = require('../config/database');
    const sql = `SELECT id, email, username, fullName, role, department, departments, 
                 managerId, generalManagerId, isActive 
                 FROM users 
                 WHERE role = ? AND isActive = ? 
                 ORDER BY fullName 
                 LIMIT 1000`;
    const rawResults = await query(sql, ['manager', true]);
    
    console.log('Backend - Managers found (raw):', rawResults.length);
    if (rawResults.length > 0) {
      console.log('Backend - First Manager raw result:', rawResults[0]);
      console.log('Backend - First Manager id from DB:', rawResults[0].id);
    }

    const formattedManagers = rawResults.map((row) => {
      const userId = row.id;
      const departments = row.departments ? (typeof row.departments === 'string' ? JSON.parse(row.departments) : row.departments) : [];
      
      console.log('Backend - Processing Manager:', row.fullName, 'ID:', userId);
      
      if (!userId) {
        console.error('Backend - WARNING: Manager has no ID!', row);
      }
      
      return {
        user_id: userId, // Use id from database directly
        name: row.fullName || row.username || 'Unknown',
        email: row.email,
        full_name: row.fullName,
        department: row.department || null,
        departments: departments,
        general_manager_id: row.generalManagerId ? String(row.generalManagerId) : null,
        manager_id: row.managerId ? String(row.managerId) : null
      };
    });

    res.json({
      success: true,
      data: formattedManagers
    });
  } catch (error) {
    console.error('Backend - Error fetching managers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/users/general-managers
// @desc    Get all general managers
// @access  Private
router.get('/general-managers', protect, async (req, res) => {
  try {
    // Query directly to ensure we get the id field
    const { query } = require('../config/database');
    const sql = `SELECT id, email, username, fullName, role, department, departments, 
                 managerId, generalManagerId, isActive 
                 FROM users 
                 WHERE role = ? AND isActive = ? 
                 ORDER BY fullName 
                 LIMIT 1000`;
    const rawResults = await query(sql, ['general_manager', true]);
    
    console.log('Backend - General Managers found (raw):', rawResults.length);
    if (rawResults.length > 0) {
      console.log('Backend - First GM raw result:', rawResults[0]);
      console.log('Backend - First GM id from DB:', rawResults[0].id);
    }

    const formattedGMs = rawResults.map((row) => {
      const userId = row.id;
      const departments = row.departments ? (typeof row.departments === 'string' ? JSON.parse(row.departments) : row.departments) : [];
      
      console.log('Backend - Processing GM:', row.fullName, 'ID:', userId);
      
      if (!userId) {
        console.error('Backend - WARNING: GM has no ID!', row);
      }
      
      return {
        user_id: userId, // Use id from database directly
        name: row.fullName || row.username || 'Unknown',
        email: row.email,
        full_name: row.fullName,
        department: row.department || null,
        departments: departments,
        general_manager_id: row.generalManagerId ? String(row.generalManagerId) : null,
        manager_id: row.managerId ? String(row.managerId) : null
      };
    });

    console.log('Backend - Formatted GMs sample:', formattedGMs[0]);

    res.json({
      success: true,
      data: formattedGMs
    });
  } catch (error) {
    console.error('Backend - Error fetching general managers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/users/executives
// @desc    Get all CEO and Super Admin users
// @access  Private
router.get('/executives', protect, async (req, res) => {
  try {
    // Handle $in query for MySQL - get both CEO and super_admin
    const ceos = await User.find({ 
      role: 'ceo',
      isActive: true 
    }, {
      sort: 'fullName',
      limit: 100
    });
    
    const superAdmins = await User.find({ 
      role: 'super_admin',
      isActive: true 
    }, {
      sort: 'fullName',
      limit: 100
    });
    
    const executives = [...ceos, ...superAdmins];

    const formattedExecutives = executives.map(user => ({
      user_id: user.id, // Use id, not _id (MySQL uses id, not _id)
      name: user.fullName || user.username || 'Unknown',
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      department: user.department || null,
      departments: user.departments || []
    }));

    res.json({
      success: true,
      data: formattedExecutives
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager', 'admin_assistant'), async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      role = 'staff',
      empFname,
      empDeptt,
      empJob,
      empGrade,
      empCell1,
      empCell2,
      empFlg,
      empMarried,
      empGender,
      shiftDays,
      shiftTime,
      shiftStartTime,
      shiftEndTime
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username: email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    const user = await User.create({
      email,
      username: email,
      password,
      fullName: fullName || '',
      role,
      empFname,
      empDeptt,
      empJob,
      empGrade,
      empCell1,
      empCell2,
      empFlg,
      empMarried,
      empGender,
      shiftDays: shiftDays || 6,
      shiftTime: shiftTime || 'day',
      shiftStartTime: shiftStartTime || '09:00',
      shiftEndTime: shiftEndTime || '17:00'
    });

    res.status(201).json({
      success: true,
      data: {
        user_id: user.id, // Use id, not _id (MySQL uses id, not _id)
        email: user.email,
        full_name: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      full_name,
      fullName,
      role,
      password,
      profile_photo_url,
      profilePhotoUrl,
      empFname,
      empDeptt,
      empJob,
      empGrade,
      empCell1,
      empCell2,
      empFlg,
      empMarried,
      empGender,
      empNo,
      empCnic,
      shiftDays,
      shiftTime,
      shiftStartTime,
      shiftEndTime,
      isActive,
      is_active
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Only allow updating own profile or if admin/admin_assistant
    if (user.id.toString() !== req.user.id.toString() && 
        !canManageUsers(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    const resolveString = (value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      return value;
    };

    // Basic profile fields
    if (full_name !== undefined || fullName !== undefined) {
      user.fullName = resolveString(full_name ?? fullName) ?? user.fullName;
    }

    if (role !== undefined && hasFullControl(req.user.role)) {
      user.role = role;
    }

    // Only set password if provided; pre-save hook will hash it
    if (password !== undefined && password.trim() !== '') {
      user.password = password;
    }

    if (profile_photo_url !== undefined || profilePhotoUrl !== undefined) {
      user.profilePhotoUrl = resolveString(profile_photo_url ?? profilePhotoUrl);
    }

    // Employee fields
    const fieldMap = {
      empFname,
      empDeptt,
      empJob,
      empGrade,
      empCell1,
      empCell2,
      empFlg,
      empMarried,
      empGender,
      empNo,
      empCnic,
    };

    Object.entries(fieldMap).forEach(([key, value]) => {
      if (value !== undefined) {
        user[key] = resolveString(value);
      }
    });

    // Shift fields
    if (shiftDays !== undefined) {
      const parsedShiftDays = Number(shiftDays);
      if (!Number.isNaN(parsedShiftDays)) {
        user.shiftDays = parsedShiftDays;
      }
    }

    if (shiftTime !== undefined) {
      user.shiftTime = shiftTime;
    }

    if (shiftStartTime !== undefined) {
      user.shiftStartTime = shiftStartTime;
    }

    if (shiftEndTime !== undefined) {
      user.shiftEndTime = shiftEndTime;
    }

    // Activation status - only admins should toggle this
    const resolvedActive = is_active ?? isActive;
    if (resolvedActive !== undefined && hasFullControl(req.user.role)) {
      user.isActive = !!resolvedActive;
    }

    await user.save();

    res.json({
      success: true,
      data: {
        user_id: user.id, // Use id, not _id (MySQL uses id, not _id)
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        is_active: user.isActive,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/users/:id/leadership
// @desc    Update user leadership info
// @access  Private
router.put('/:id/leadership', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager'), async (req, res) => {
  try {
    const { department, departments, managerId, generalManagerId } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (department !== undefined) {
      if (department === null || department === '') {
        user.department = null;
      } else {
        user.department = department;
      }
    }

    if (Array.isArray(departments)) {
      user.departments = departments;
    } else if (departments === null) {
      user.departments = [];
    }

    if (managerId !== undefined) {
      user.managerId = managerId || null;
    }

    if (generalManagerId !== undefined) {
      user.generalManagerId = generalManagerId || null;
    }

    await user.save();

    res.json({
      success: true,
      data: {
        user_id: user.id, // Use id, not _id (MySQL uses id, not _id)
        department: user.department || null,
        departments: user.departments || [],
        manager_id: user.managerId || null,
        general_manager_id: user.generalManagerId || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/users/:id/can-delete
// @desc    Check if user can be deleted (no child data)
// @access  Private
router.get('/:id/can-delete', protect, async (req, res) => {
  try {
    const StaffAssignment = require('../models/StaffAssignment');
    const Attendance = require('../models/Attendance');
    const SupervisorLocation = require('../models/SupervisorLocation');
    const LeaveRequest = require('../models/LeaveRequest');
    
    // Check for staff assignments (as staff or supervisor)
    const hasStaffAssignments = await StaffAssignment.exists({ 
      $or: [
        { staffId: req.params.id },
        { supervisorId: req.params.id }
      ]
    });
    
    // Check for attendance records
    const hasAttendance = await Attendance.exists({ 
      $or: [
        { staffId: req.params.id },
        { supervisorId: req.params.id }
      ]
    });
    
    // Check for supervisor location mappings
    const hasSupervisorMappings = await SupervisorLocation.exists({ 
      supervisorId: req.params.id 
    });
    
    // Check for leave requests
    const hasLeaveRequests = await LeaveRequest.exists({ 
      staffId: req.params.id 
    });
    
    const canDelete = !hasStaffAssignments && !hasAttendance && !hasSupervisorMappings && !hasLeaveRequests;
    
    let reasons = [];
    if (hasStaffAssignments) reasons.push('staff assignments');
    if (hasAttendance) reasons.push('attendance records');
    if (hasSupervisorMappings) reasons.push('supervisor location mappings');
    if (hasLeaveRequests) reasons.push('leave requests');
    
    res.json({ 
      success: true, 
      canDelete,
      hasStaffAssignments: !!hasStaffAssignments,
      hasAttendance: !!hasAttendance,
      hasSupervisorMappings: !!hasSupervisorMappings,
      hasLeaveRequests: !!hasLeaveRequests,
      reason: reasons.length > 0 ? `User has ${reasons.join(', ')}` : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (only if no child data)
// @access  Private/Admin
router.delete('/:id', protect, authorize('ceo', 'super_admin'), async (req, res) => {
  try {
    const StaffAssignment = require('../models/StaffAssignment');
    const Attendance = require('../models/Attendance');
    const SupervisorLocation = require('../models/SupervisorLocation');
    const LeaveRequest = require('../models/LeaveRequest');
    
    // Check for child data
    const hasStaffAssignments = await StaffAssignment.exists({ 
      $or: [
        { staffId: req.params.id },
        { supervisorId: req.params.id }
      ]
    });
    
    const hasAttendance = await Attendance.exists({ 
      $or: [
        { staffId: req.params.id },
        { supervisorId: req.params.id }
      ]
    });
    
    const hasSupervisorMappings = await SupervisorLocation.exists({ 
      supervisorId: req.params.id 
    });
    
    const hasLeaveRequests = await LeaveRequest.exists({ 
      staffId: req.params.id 
    });
    
    if (hasStaffAssignments || hasAttendance || hasSupervisorMappings || hasLeaveRequests) {
      let reasons = [];
      if (hasStaffAssignments) reasons.push('staff assignments');
      if (hasAttendance) reasons.push('attendance records');
      if (hasSupervisorMappings) reasons.push('supervisor location mappings');
      if (hasLeaveRequests) reasons.push('leave requests');
      
      return res.status(400).json({
        success: false,
        error: `Cannot delete user with ${reasons.join(', ')}`,
        hasChildren: true,
        hasStaffAssignments: !!hasStaffAssignments,
        hasAttendance: !!hasAttendance,
        hasSupervisorMappings: !!hasSupervisorMappings,
        hasLeaveRequests: !!hasLeaveRequests
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await User.findByIdAndDelete(user.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

