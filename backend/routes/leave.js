const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { sendPushNotification } = require('./notifications');

// @route   GET /api/leave
// @desc    Get leave requests
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { staffId, status, dateFrom, dateTo } = req.query;

    const query = {};
    // Only add staffId to query if it's a valid value (not undefined, null, or 'undefined' string)
    if (staffId && staffId !== 'undefined' && staffId !== 'null') {
      query.staffId = staffId;
    }
    if (status && status !== 'undefined' && status !== 'null') {
      query.status = status;
    }
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom && dateFrom !== 'undefined') query.startDate.$gte = dateFrom;
      if (dateTo && dateTo !== 'undefined') query.startDate.$lte = dateTo;
    }

    const requests = await LeaveRequest.find(query, {
      populate: ['staffId', 'supervisorId', 'approvedBy'],
      sort: { createdAt: -1 }
    });

    const formatted = requests.map(req => {
      const staff = req.staffId_populated;
      const supervisor = req.supervisorId_populated;
      const approvedBy = req.approvedBy_populated;
      return {
        id: req.id,
        staff_id: staff ? staff.id : req.staffId,
        staff_name: staff ? (staff.fullName || staff.username || 'Unknown Staff') : 'Unknown Staff',
        emp_no: staff ? (staff.empNo || null) : null,
        empNo: staff ? (staff.empNo || null) : null,
        staff_department: staff ? staff.department : null,
        staff_role: staff ? staff.role : null,
        staff_manager_id: staff ? staff.managerId : null,
        staff_gm_id: staff ? staff.generalManagerId : null,
        supervisor_id: supervisor ? supervisor.id : req.supervisorId,
        supervisor_name: supervisor ? (supervisor.fullName || supervisor.username) : null,
        supervisor_manager_id: supervisor ? supervisor.managerId : null,
        leave_type: req.leaveType,
        start_date: req.startDate,
        end_date: req.endDate,
        reason: req.reason,
        status: req.status,
        approved_by: approvedBy ? approvedBy.id : req.approvedBy,
        approved_by_name: approvedBy ? (approvedBy.fullName || approvedBy.username) : null,
        created_at: req.createdAt,
        updated_at: req.updatedAt
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

// @route   POST /api/leave
// @desc    Create leave request
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { staff_id, supervisor_id, leave_type, start_date, end_date, reason } = req.body;

    if (!staff_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'staff_id, leave_type, start_date, and end_date are required'
      });
    }

    const request = await LeaveRequest.create({
      staffId: staff_id,
      supervisorId: supervisor_id || null,
      leaveType: leave_type,
      startDate: start_date,
      endDate: end_date,
      reason: reason || '',
      status: 'pending'
    });

    const populated = await LeaveRequest.findById(request.id);
    if (populated && populated.staffId) {
      populated.staffId_populated = await User.findById(populated.staffId);
    }

    // Send push notification to the approver (supervisor_id)
    if (supervisor_id) {
      const staff = populated.staffId_populated;
      const staffName = staff ? (staff.fullName || staff.username || 'A staff member') : 'A staff member';
      try {
        await sendPushNotification(
          supervisor_id,
          'New Leave Request',
          `${staffName} has submitted a leave request for ${start_date} to ${end_date}. Please review.`,
          { type: 'leave_request', requestId: request.id.toString() }
        );
      } catch (notifError) {
        console.warn('Failed to send leave request notification:', notifError.message);
        // Don't fail the request if notification fails
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: populated.id,
        staff_id: populated.staffId?._id?.toString(),
        supervisor_id: populated.supervisorId || null,
        leave_type: populated.leaveType,
        start_date: populated.startDate,
        end_date: populated.endDate,
        reason: populated.reason,
        status: populated.status,
        created_at: populated.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/leave/:id/status
// @desc    Update leave request status
// @access  Private
router.put('/:id/status', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be approved or rejected'
      });
    }

    const request = await LeaveRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    request.status = status;
    request.approvedBy = req.user.id;
    await request.save();

    const populated = await LeaveRequest.findById(request.id);
    if (populated) {
      if (populated.staffId) {
        populated.staffId_populated = await User.findById(populated.staffId);
      }
      if (populated.approvedBy) {
        populated.approvedBy_populated = await User.findById(populated.approvedBy);
      }
    }

    // Send push notification to the staff member about the decision
    const staff = populated.staffId_populated;
    if (staff) {
      const approver = populated.approvedBy_populated;
      const approverName = approver ? (approver.fullName || approver.username || 'Management') : 'Management';
      const statusText = status === 'approved' ? 'approved' : 'rejected';
      try {
        await sendPushNotification(
          staff.id.toString(),
          `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          `Your leave request from ${request.startDate} to ${request.endDate} has been ${statusText} by ${approverName}.`,
          { type: 'leave_status_update', requestId: request.id.toString(), status }
        );
      } catch (notifError) {
        console.warn('Failed to send leave status notification:', notifError.message);
        // Don't fail the request if notification fails
      }
    }

    res.json({
      success: true,
      data: {
        id: populated.id,
        status: populated.status,
        approved_by: populated.approvedBy_populated ? populated.approvedBy_populated.id : populated.approvedBy,
        approved_by_name: populated.approvedBy_populated ? populated.approvedBy_populated.fullName : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/leave/today
// @desc    Get today's leave requests
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const requests = await LeaveRequest.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      status: 'pending'
    }, {
      populate: ['staffId', 'supervisorId'],
      sort: { createdAt: -1 }
    });

    const formatted = requests.map(req => ({
      id: req.id,
      staff_id: req.staffId_populated ? req.staffId_populated.id : req.staffId,
      staff_name: req.staffId_populated ? (req.staffId_populated.fullName || req.staffId_populated.username || 'Unknown') : 'Unknown',
      emp_no: req.staffId_populated ? (req.staffId_populated.empNo || null) : null,
      empNo: req.staffId_populated ? (req.staffId_populated.empNo || null) : null,
      supervisor_id: req.supervisorId_populated ? req.supervisorId_populated.id : req.supervisorId,
      supervisor_name: req.supervisorId_populated ? req.supervisorId_populated.fullName : null,
      leave_type: req.leaveType,
      start_date: req.startDate,
      end_date: req.endDate,
      reason: req.reason,
      status: req.status
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

module.exports = router;

