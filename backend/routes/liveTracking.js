const express = require('express');
const router = express.Router();
const LiveTracking = require('../models/LiveTracking');
const { protect } = require('../middleware/auth');

// @route   POST /api/live-tracking/start
// @desc    Start live tracking for current user
// @access  Private
router.post('/start', protect, async (req, res) => {
  try {
    const staffId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

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
router.post('/update-location', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const staffId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

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
      // Auto-start tracking if not exists
      tracking = await LiveTracking.create({
        staffId,
        date: todayStr,
        isActive: true,
        startTime: new Date(),
        lastUpdate: new Date(),
        locations: []
      });
    }

    // Add location to array
    tracking.locations.push({
      lat: latitude,
      lng: longitude,
      timestamp: new Date()
    });

    tracking.lastUpdate = new Date();
    await tracking.save();

    res.json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
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
// @desc    Get all live tracking data with optional filters
// @access  Private
// NOTE: This route MUST be defined BEFORE /active and /:staffId
router.get('/', protect, async (req, res) => {
  try {
    const { staffId, date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    const conditions = { date: queryDate };
    if (staffId) {
      conditions.staffId = staffId;
    }

    const trackings = await LiveTracking.find(conditions, {
      populate: ['staffId'],
      sort: { lastUpdate: -1 }
    });

    const formatted = trackings.map(track => {
      const staff = track.staffId_populated;
      return {
        id: track.id,
        staff_id: staff ? staff.id : track.staffId,
        staff_name: staff ? (staff.fullName || staff.username || 'Unknown') : 'Unknown',
        emp_no: staff ? (staff.empNo || null) : null,
        empNo: staff ? (staff.empNo || null) : null,
        date: track.date,
        is_active: track.isActive,
        start_time: track.startTime,
        last_update: track.lastUpdate,
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
        emp_no: staff ? (staff.empNo || null) : null,
        empNo: staff ? (staff.empNo || null) : null,
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

