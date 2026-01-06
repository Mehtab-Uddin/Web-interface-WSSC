const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/approvals/pending
// @desc    Get pending attendance approvals
// @access  Private
router.get('/pending', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager', 'supervisor'), async (req, res) => {
  try {
    const attendances = await Attendance.find({ approvalStatus: 'pending' }, {
      populate: ['staffId', 'supervisorId', 'ncLocationId', 'clockedInBy', 'clockedOutBy'],
      sort: { createdAt: -1 }
    });

    const formatted = attendances.map(att => ({
      id: att.id,
      staff_id: att.staffId_populated ? att.staffId_populated.id : att.staffId,
      staff_name: att.staffId_populated ? (att.staffId_populated.fullName || att.staffId_populated.username || 'Unknown') : 'Unknown',
      supervisor_id: att.supervisorId_populated ? att.supervisorId_populated.id : att.supervisorId,
      supervisor_name: att.supervisorId_populated ? att.supervisorId_populated.fullName : 'Unknown',
      nc_location_id: att.ncLocationId_populated ? att.ncLocationId_populated.id : att.ncLocationId,
      nc_location_name: att.ncLocationId_populated ? att.ncLocationId_populated.name : 'N/A',
      location_name: att.ncLocationId_populated ? att.ncLocationId_populated.name : 'N/A',
      attendance_date: att.attendanceDate,
      date: att.attendanceDate,
      clock_in: att.clockIn,
      clock_out: att.clockOut,
      status: att.status,
      approval_status: att.approvalStatus,
      overtime: att.overtime,
      double_duty: att.doubleDuty,
      clock_in_photo_url: att.clockInPhotoUrl,
      clock_out_photo_url: att.clockOutPhotoUrl,
      is_override: att.isOverride
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/approvals/attendance/:id/approve
// @desc    Approve attendance
// @access  Private
router.put('/attendance/:id/approve', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager', 'supervisor'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance not found'
      });
    }

    attendance.approvalStatus = 'approved';
    await attendance.save();

    res.json({
      success: true,
      data: {
        id: attendance.id,
        approval_status: attendance.approvalStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/approvals/attendance/:id/reject
// @desc    Reject attendance
// @access  Private
router.put('/attendance/:id/reject', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager', 'supervisor'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance not found'
      });
    }

    attendance.approvalStatus = 'rejected';
    await attendance.save();

    res.json({
      success: true,
      data: {
        id: attendance.id,
        approval_status: attendance.approvalStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/approvals/attendance-with-photos
// @desc    Get attendance with photos for review
// @access  Private
router.get('/attendance-with-photos', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { dateFrom, dateTo, supervisorId, status } = req.query;

    const query = {};
    if (dateFrom || dateTo) {
      query.attendanceDate = {};
      if (dateFrom) query.attendanceDate.$gte = dateFrom;
      if (dateTo) query.attendanceDate.$lte = dateTo;
    }
    if (supervisorId) query.supervisorId = supervisorId;
    if (status && status !== 'all') query.status = status;

    const attendances = await Attendance.find(query, {
      populate: ['staffId', 'supervisorId', 'ncLocationId'],
      sort: { attendanceDate: -1, createdAt: -1 }
    });

    const formatted = attendances
      .filter(att => att.clockInPhotoUrl || att.clockOutPhotoUrl)
      .map(att => ({
        id: att.id,
        staff_id: att.staffId_populated ? att.staffId_populated.id : att.staffId,
        staff_name: att.staffId_populated ? att.staffId_populated.fullName : 'Unknown',
        supervisor_id: att.supervisorId_populated ? att.supervisorId_populated.id : att.supervisorId,
        supervisor_name: att.supervisorId_populated ? att.supervisorId_populated.fullName : 'Unknown',
        nc_location_id: att.ncLocationId_populated ? att.ncLocationId_populated.id : att.ncLocationId,
        location_name: att.ncLocationId_populated ? att.ncLocationId_populated.name : 'N/A',
        date: att.attendanceDate,
        clock_in: att.clockIn,
        clock_out: att.clockOut,
        clock_in_photo_url: att.clockInPhotoUrl,
        clock_out_photo_url: att.clockOutPhotoUrl,
        status: att.status,
        approval_status: att.approvalStatus
      }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/approvals/mark-overtime/:id
// @desc    Supervisor marks staff for overtime (needs manager approval)
// @access  Private/Supervisor
router.put('/mark-overtime/:id', protect, authorize('supervisor', 'manager', 'general_manager', 'ceo', 'super_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance not found' });
    }

    attendance.overtime = true;
    attendance.overtimeApprovalStatus = 'pending';
    attendance.markedBySupervisor = req.user.id;
    await attendance.save();

    res.json({ 
      success: true, 
      data: { 
        id: attendance.id, 
        message: 'Overtime marked, pending manager approval' 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   PUT /api/approvals/mark-double-duty/:id
// @desc    Supervisor marks staff for double duty (needs manager approval)
// @access  Private/Supervisor
router.put('/mark-double-duty/:id', protect, authorize('supervisor', 'manager', 'general_manager', 'ceo', 'super_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance not found' });
    }

    attendance.doubleDuty = true;
    attendance.doubleDutyApprovalStatus = 'pending';
    attendance.markedBySupervisor = req.user.id;
    await attendance.save();

    res.json({ 
      success: true, 
      data: { 
        id: attendance.id, 
        message: 'Double duty marked, pending manager approval' 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   PUT /api/approvals/approve-overtime/:id
// @desc    Manager/GM approves overtime
// @access  Private/Manager+
router.put('/approve-overtime/:id', protect, authorize('manager', 'general_manager', 'ceo', 'super_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance not found' });
    }

    attendance.overtimeApprovalStatus = 'manager_approved';
    attendance.approvedByManager = req.user.id;
    await attendance.save();

    res.json({ 
      success: true, 
      data: { 
        id: attendance.id, 
        message: 'Overtime approved' 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   PUT /api/approvals/reject-overtime/:id
// @desc    Manager/GM rejects overtime
// @access  Private/Manager+
router.put('/reject-overtime/:id', protect, authorize('manager', 'general_manager', 'ceo', 'super_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance not found' });
    }

    attendance.overtime = false;
    attendance.overtimeApprovalStatus = 'rejected';
    attendance.rejectedBy = req.user.id;
    attendance.rejectionReason = req.body.reason || null;
    await attendance.save();

    res.json({ 
      success: true, 
      data: { 
        id: attendance.id, 
        message: 'Overtime rejected' 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   PUT /api/approvals/approve-double-duty/:id
// @desc    Manager/GM approves double duty
// @access  Private/Manager+
router.put('/approve-double-duty/:id', protect, authorize('manager', 'general_manager', 'ceo', 'super_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance not found' });
    }

    attendance.doubleDutyApprovalStatus = 'manager_approved';
    attendance.approvedByManager = req.user.id;
    await attendance.save();

    res.json({ 
      success: true, 
      data: { 
        id: attendance.id, 
        message: 'Double duty approved' 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   PUT /api/approvals/reject-double-duty/:id
// @desc    Manager/GM rejects double duty
// @access  Private/Manager+
router.put('/reject-double-duty/:id', protect, authorize('manager', 'general_manager', 'ceo', 'super_admin'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance not found' });
    }

    attendance.doubleDuty = false;
    attendance.doubleDutyApprovalStatus = 'rejected';
    attendance.rejectedBy = req.user.id;
    attendance.rejectionReason = req.body.reason || null;
    await attendance.save();

    res.json({ 
      success: true, 
      data: { 
        id: attendance.id, 
        message: 'Double duty rejected' 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/approvals/pending-overtime-doubleduty
// @desc    Get pending overtime and double duty approvals for managers
// @access  Private/Manager+
router.get('/pending-overtime-doubleduty', protect, authorize('manager', 'general_manager', 'ceo', 'super_admin'), async (req, res) => {
  try {
    // Handle $or query for MySQL
    const overtimePending = await Attendance.find({ overtimeApprovalStatus: 'pending' }, {
      populate: ['staffId', 'supervisorId', 'ncLocationId', 'markedBySupervisor'],
      sort: { createdAt: -1 }
    });
    
    const doubleDutyPending = await Attendance.find({ doubleDutyApprovalStatus: 'pending' }, {
      populate: ['staffId', 'supervisorId', 'ncLocationId', 'markedBySupervisor'],
      sort: { createdAt: -1 }
    });
    
    // Combine and deduplicate
    const allIds = new Set();
    const pendingApprovals = [];
    [...overtimePending, ...doubleDutyPending].forEach(att => {
      if (!allIds.has(att.id)) {
        allIds.add(att.id);
        pendingApprovals.push(att);
      }
    });

    const formatted = pendingApprovals.map(att => {
      const staff = att.staffId_populated;
      const supervisor = att.supervisorId_populated;
      const location = att.ncLocationId_populated;
      const markedBy = att.markedBySupervisor_populated;
      return {
        id: att.id,
        staff_id: staff ? staff.id : att.staffId,
        staff_name: staff ? (staff.fullName || staff.username || 'Unknown') : 'Unknown',
        staff_department: staff ? staff.department : null,
        staff_role: staff ? staff.role : null,
        staff_manager_id: staff ? staff.managerId : null,
        staff_gm_id: staff ? staff.generalManagerId : null,
        supervisor_id: supervisor ? supervisor.id : att.supervisorId,
        supervisor_name: supervisor ? supervisor.fullName : 'Unknown',
        supervisor_manager_id: supervisor ? supervisor.managerId : null,
        marked_by_id: markedBy ? markedBy.id : att.markedBySupervisor,
        marked_by_manager_id: markedBy ? markedBy.managerId : null,
        nc_location_id: location ? location.id : att.ncLocationId,
        location_name: location ? location.name : 'N/A',
        date: att.attendanceDate,
        clock_in: att.clockIn,
        clock_out: att.clockOut,
        status: att.status,
        overtime: att.overtime,
        overtime_approval_status: att.overtimeApprovalStatus,
        double_duty: att.doubleDuty,
        double_duty_approval_status: att.doubleDutyApprovalStatus,
        marked_by_supervisor: markedBy ? markedBy.fullName : null
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

