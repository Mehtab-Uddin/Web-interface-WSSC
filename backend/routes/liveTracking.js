const express = require('express');
const router = express.Router();
const LiveTracking = require('../models/LiveTracking');
const { protect } = require('../middleware/auth');

// Helper function to check if user has active clock-in
// Applies to all roles: staff, supervisor, manager, general_manager
async function hasActiveClockIn(staffId) {
  const Attendance = require('../models/Attendance');
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check for active attendance (clocked in but not clocked out) for today or yesterday (night shift)
  const activeAttendance = await Attendance.findOne({
    staffId,
    attendanceDate: { $in: [todayStr, yesterdayStr] },
    clockOut: null
  });

  return !!activeAttendance;
}

// @route   POST /api/live-tracking/start
// @desc    Start live tracking for current user
// @access  Private
// @note    Requires active clock-in for all roles (staff, supervisor, manager, general_manager)
router.post('/start', protect, async (req, res) => {
  try {
    const staffId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if user has active clock-in (required for all roles)
    const hasClockIn = await hasActiveClockIn(staffId);
    if (!hasClockIn) {
      return res.status(400).json({
        success: false,
        error: 'Cannot start live tracking without an active clock-in. Please clock in first.'
      });
    }

    // Check if tracking already exists for today
    let tracking = await LiveTracking.findOne({
      staffId,
      date: todayStr,
      isActive: true
    });

    if (tracking) {
      // Update existing tracking
      tracking.lastUpdate = new Date();
      await tracking.save();
      
      return res.json({
        success: true,
        data: {
          id: tracking.id,
          staffId: tracking.staffId.toString(),
          date: tracking.date,
          isActive: tracking.isActive,
          startTime: tracking.startTime,
          lastUpdate: tracking.lastUpdate
        }
      });
    }

    // Create new tracking record
    tracking = await LiveTracking.create({
      staffId,
      date: todayStr,
      isActive: true,
      startTime: new Date(),
      lastUpdate: new Date(),
      locations: []
    });

    res.json({
      success: true,
      data: {
        id: tracking.id,
        staffId: tracking.staffId.toString(),
        date: tracking.date,
        isActive: tracking.isActive,
        startTime: tracking.startTime,
        lastUpdate: tracking.lastUpdate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/live-tracking/stop
// @desc    Stop live tracking for current user
// @access  Private
router.post('/stop', protect, async (req, res) => {
  try {
    const staffId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const tracking = await LiveTracking.findOne({
      staffId,
      date: todayStr,
      isActive: true
    });

    if (tracking) {
      tracking.isActive = false;
      tracking.lastUpdate = new Date();
      await tracking.save();
    }

    res.json({
      success: true,
      message: 'Live tracking stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/live-tracking/update-location
// @desc    Update location for current user's live tracking
// @access  Private
// @note    Requires active clock-in for all roles (staff, supervisor, manager, general_manager)
router.post('/update-location', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const staffId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    console.log(`[LiveTracking] Location update request from user ${staffId}:`, { latitude, longitude });

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude must be numbers'
      });
    }

    let tracking = await LiveTracking.findOne({
      staffId,
      date: todayStr,
      isActive: true
    });

    if (!tracking) {
      console.log(`[LiveTracking] No active tracking found for user ${staffId}, checking clock-in...`);
      // Check if user has active clock-in before auto-starting tracking (required for all roles)
      const hasClockIn = await hasActiveClockIn(staffId);
      if (!hasClockIn) {
        console.warn(`[LiveTracking] User ${staffId} has no active clock-in, cannot auto-start tracking`);
        return res.status(400).json({
          success: false,
          error: 'Cannot start live tracking without an active clock-in. Please clock in first.'
        });
      }

      console.log(`[LiveTracking] Auto-creating tracking record for user ${staffId}`);
      // Auto-start tracking if not exists (only if clocked in)
      tracking = await LiveTracking.create({
        staffId,
        date: todayStr,
        isActive: true,
        startTime: new Date(),
        lastUpdate: new Date(),
        locations: []
      });
      console.log(`[LiveTracking] Tracking record created with ID: ${tracking.id}`);
    } else {
      // Verify user still has active clock-in before updating location
      const hasClockIn = await hasActiveClockIn(staffId);
      if (!hasClockIn) {
        console.warn(`[LiveTracking] User ${staffId} no longer has active clock-in, stopping tracking`);
        // Stop tracking if user is no longer clocked in
        tracking.isActive = false;
        await tracking.save();
        return res.status(400).json({
          success: false,
          error: 'Cannot update location without an active clock-in. Please clock in first.'
        });
      }
    }

    // Add location to array
    const locationEntry = {
      lat: latitude,
      lng: longitude,
      timestamp: new Date()
    };
    tracking.locations.push(locationEntry);

    tracking.lastUpdate = new Date();
    await tracking.save();

    console.log(`[LiveTracking] Location updated successfully for user ${staffId}. Total locations: ${tracking.locations.length}`);

    res.json({
      success: true,
      message: 'Location updated',
      data: {
        trackingId: tracking.id,
        locationCount: tracking.locations.length,
        lastUpdate: tracking.lastUpdate
      }
    });
  } catch (error) {
    console.error('[LiveTracking] Error updating location:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/live-tracking/status/:staffId?
// @desc    Get live tracking status for a staff member
// @access  Private
router.get('/status/:staffId?', protect, async (req, res) => {
  try {
    const targetStaffId = req.params.staffId || req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const tracking = await LiveTracking.findOne({
      staffId: targetStaffId,
      date: todayStr,
      isActive: true
    });
    
    // Populate staffId if needed
    if (tracking && tracking.staffId) {
      const User = require('../models/User');
      tracking.staffId_populated = await User.findById(tracking.staffId);
    }

    if (!tracking) {
      return res.json({
        success: true,
        data: { isActive: false }
      });
    }

    const lastLocation = tracking.locations && tracking.locations.length > 0
      ? tracking.locations[tracking.locations.length - 1]
      : null;

    // Handle case where staffId might not be populated (user deleted)
    if (!tracking.staffId_populated && !tracking.staffId) {
      return res.json({
        success: true,
        data: { isActive: false }
      });
    }

    const staff = tracking.staffId_populated;
    res.json({
      success: true,
      data: {
        id: tracking.id,
        staffId: staff ? staff.id : tracking.staffId,
        staffName: staff ? (staff.fullName || staff.username || 'Unknown') : 'Unknown',
        date: tracking.date,
        isActive: tracking.isActive,
        startTime: tracking.startTime,
        lastUpdate: tracking.lastUpdate,
        currentLat: lastLocation?.lat || null,
        currentLng: lastLocation?.lng || null,
        locations: tracking.locations || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/live-tracking
// @desc    Get live tracking data with optional filters (staffId, date)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { staffId, date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];

    // Build conditions
    const conditions = { date: queryDate };
    if (staffId && staffId !== '' && staffId !== 'undefined' && staffId !== 'null') {
      conditions.staffId = staffId;
    }

    // Find all matching tracking records
    const trackings = await LiveTracking.find(conditions, {
      populate: ['staffId'],
      sort: { lastUpdate: -1 }
    });

    // Also get active attendance records (clocked in but not clocked out) for the date
    // This ensures all users (staff, supervisors, managers, general managers) with active clock-ins 
    // show up even if they don't have tracking records yet
    const Attendance = require('../models/Attendance');
    const attendanceConditions = {
      attendanceDate: queryDate,
      clockOut: null // Only active clock-ins (includes all roles: staff, supervisor, manager, general_manager)
    };
    if (staffId && staffId !== '' && staffId !== 'undefined' && staffId !== 'null') {
      attendanceConditions.staffId = staffId;
    }

    // Fetch all active attendance records - includes all roles (staff, supervisor, manager, general_manager)
    const activeAttendances = await Attendance.find(attendanceConditions, {
      populate: ['staffId'],
      sort: { createdAt: -1 }
    });

    // Create a map of existing tracking records by staffId
    const trackingMap = new Map();
    trackings.forEach(track => {
      const staffIdKey = track.staffId_populated ? track.staffId_populated.id : track.staffId;
      if (staffIdKey) {
        trackingMap.set(staffIdKey.toString(), track);
      }
    });

    // Create tracking records for staff with active clock-ins but no tracking record
    const allTrackingRecords = [...trackings];
    activeAttendances.forEach(attendance => {
      const staffIdKey = attendance.staffId_populated ? attendance.staffId_populated.id : attendance.staffId;
      if (staffIdKey && !trackingMap.has(staffIdKey.toString())) {
        // Create a placeholder tracking record for this staff member
        const placeholderTrack = {
          id: `attendance-${attendance.id}`, // Use attendance ID as placeholder
          staffId: staffIdKey,
          staffId_populated: attendance.staffId_populated,
          date: queryDate,
          isActive: true,
          startTime: attendance.clockIn || new Date(),
          lastUpdate: attendance.clockIn || new Date(),
          locations: [] // Empty locations array - they haven't started tracking yet
        };
        allTrackingRecords.push(placeholderTrack);
      }
    });

    // Format response to match frontend expectations
    // Includes all roles: staff, supervisor, manager, general_manager, sub_engineer
    const formatted = allTrackingRecords.map(track => {
      const staff = track.staffId_populated;
      const staffName = staff ? (staff.fullName || staff.username || 'Unknown') : 'Unknown';
      return {
        id: track.id,
        staffId: staff ? staff.id : track.staffId,
        staff_name: staffName,
        full_name: staffName, // For formatStaffName compatibility
        fullName: staff ? staff.fullName : null,
        username: staff ? staff.username : null,
        role: staff ? staff.role : null, // Include role information
        emp_no: staff ? staff.empNo : null,
        empNo: staff ? staff.empNo : null,
        date: track.date,
        is_active: track.isActive !== undefined ? track.isActive : true,
        isActive: track.isActive !== undefined ? track.isActive : true,
        start_time: track.startTime,
        startTime: track.startTime,
        last_update: track.lastUpdate,
        lastUpdate: track.lastUpdate,
        locations: track.locations || []
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

// @route   GET /api/live-tracking/active
// @desc    Get active live locations
// @access  Private
// NOTE: This route MUST be defined BEFORE /:staffId to avoid "active" being treated as staffId
router.get('/active', protect, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const trackings = await LiveTracking.find({
      date: todayStr,
      isActive: true
    }, {
      populate: ['staffId'],
      sort: { lastUpdate: -1 }
    });

    const formatted = trackings.map(track => {
      const lastLocation = track.locations && track.locations.length > 0
        ? track.locations[track.locations.length - 1]
        : null;

      const staff = track.staffId_populated;
      return {
        id: track.id,
        staff_id: staff ? staff.id : track.staffId,
        staff_name: staff ? (staff.fullName || staff.username || 'Unknown') : 'Unknown',
        department: staff ? staff.department : null,
        departments: staff ? (staff.departments || []) : [],
        lat: lastLocation?.lat || null,
        lng: lastLocation?.lng || null,
        timestamp: lastLocation?.timestamp || track.lastUpdate,
        start_time: track.startTime,
        last_update: track.lastUpdate
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

// @route   GET /api/live-tracking/:staffId
// @desc    Get live tracking data for a staff member
// @access  Private
router.get('/:staffId', protect, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];

    // Validate staffId is a valid ObjectId format
    if (!staffId || staffId === 'undefined' || staffId === 'null') {
      return res.status(400).json({
        success: false,
        error: 'Valid staffId is required'
      });
    }

    const tracking = await LiveTracking.findOne({
      staffId,
      date: queryDate
    });

    if (!tracking) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Populate staffId if needed
    if (tracking.staffId) {
      const User = require('../models/User');
      tracking.staffId_populated = await User.findById(tracking.staffId);
    }

    // Handle case where staffId might not be populated (user deleted)
    if (!tracking.staffId_populated && !tracking.staffId) {
      return res.json({
        success: true,
        data: null
      });
    }

    const staff = tracking.staffId_populated;
    res.json({
      success: true,
      data: {
        id: tracking.id,
        staffId: staff ? staff.id : tracking.staffId,
        staffName: staff ? (staff.fullName || staff.username || 'Unknown') : 'Unknown',
        date: tracking.date,
        isActive: tracking.isActive,
        startTime: tracking.startTime,
        endTime: tracking.updatedAt,
        lastUpdate: tracking.lastUpdate,
        locations: tracking.locations || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

