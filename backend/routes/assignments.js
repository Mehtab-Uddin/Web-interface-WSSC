const express = require('express');
const router = express.Router();
const StaffAssignment = require('../models/StaffAssignment');
const SupervisorLocation = require('../models/SupervisorLocation');
const User = require('../models/User');
const Location = require('../models/Location');
const Zone = require('../models/Zone');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/assignments
// @desc    Get all staff assignments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const assignments = await StaffAssignment.find({ isActive: true }, {
      populate: ['staffId', 'supervisorId', 'zoneId', 'ncLocationId'],
      sort: { createdAt: -1 }
    });

    const formatted = assignments.map(ass => ({
      id: ass.id,
      staff_id: ass.staffId_populated ? ass.staffId_populated.id : ass.staffId,
      staff_name: ass.staffId_populated ? (ass.staffId_populated.fullName || ass.staffId_populated.username || 'Unknown') : 'Unknown',
      supervisor_id: ass.supervisorId_populated ? ass.supervisorId_populated.id : ass.supervisorId,
      supervisor_name: ass.supervisorId_populated ? (ass.supervisorId_populated.fullName || ass.supervisorId_populated.username || 'Unknown') : 'Unknown',
      zone_id: ass.zoneId_populated ? ass.zoneId_populated.id : ass.zoneId,
      zone_name: ass.zoneId_populated ? ass.zoneId_populated.name : 'N/A',
      location_id: ass.zoneId_populated?.locationId_populated ? ass.zoneId_populated.locationId_populated.id : (ass.zoneId_populated?.locationId || null),
      location_name: ass.zoneId_populated?.locationId_populated ? ass.zoneId_populated.locationId_populated.name : 'N/A',
      // Legacy fields for backward compatibility
      nc_location_id: ass.ncLocationId_populated ? ass.ncLocationId_populated.id : ass.ncLocationId,
      is_active: ass.isActive
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

// @route   POST /api/assignments
// @desc    Create staff assignment
// @access  Private/Admin
router.post('/', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager'), async (req, res) => {
  try {
    const { staff_id, supervisor_id, zone_id } = req.body;

    if (!staff_id || !supervisor_id || !zone_id) {
      return res.status(400).json({
        success: false,
        error: 'staff_id, supervisor_id, and zone_id are required'
      });
    }

    // Verify zone exists
    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'Zone not found'
      });
    }

    // Deactivate existing assignment
    const existingAssignments = await StaffAssignment.find({ staffId: staff_id, isActive: true });
    for (const existing of existingAssignments) {
      existing.isActive = false;
      await existing.save();
    }

    const assignment = await StaffAssignment.create({
      staffId: staff_id,
      supervisorId: supervisor_id,
      zoneId: zone_id,
      ncLocationId: zone.locationId, // Keep for backward compatibility
      isActive: true
    });

    const populated = await StaffAssignment.findById(assignment.id);
    if (populated) {
      populated.staffId_populated = await User.findById(populated.staffId);
      populated.supervisorId_populated = await User.findById(populated.supervisorId);
      populated.zoneId_populated = await Zone.findById(populated.zoneId);
      if (populated.zoneId_populated) {
        populated.zoneId_populated.locationId_populated = await Location.findById(populated.zoneId_populated.locationId);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: populated.id,
        staff_id: populated.staffId_populated ? populated.staffId_populated.id : populated.staffId,
        staff_name: populated.staffId_populated ? (populated.staffId_populated.fullName || 'Unknown') : 'Unknown',
        supervisor_id: populated.supervisorId_populated ? populated.supervisorId_populated.id : populated.supervisorId,
        supervisor_name: populated.supervisorId_populated ? (populated.supervisorId_populated.fullName || 'Unknown') : 'Unknown',
        zone_id: populated.zoneId_populated ? populated.zoneId_populated.id : populated.zoneId,
        zone_name: populated.zoneId_populated ? populated.zoneId_populated.name : 'N/A',
        location_id: populated.zoneId_populated?.locationId_populated ? populated.zoneId_populated.locationId_populated.id : null,
        location_name: populated.zoneId_populated?.locationId_populated ? populated.zoneId_populated.locationId_populated.name : 'N/A',
        // Legacy fields
        nc_location_id: populated.zoneId_populated?.locationId_populated ? populated.zoneId_populated.locationId_populated.id : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/assignments/:id/deactivate
// @desc    Deactivate assignment
// @access  Private/Admin
router.put('/:id/deactivate', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager'), async (req, res) => {
  try {
    const assignment = await StaffAssignment.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Assignment deactivated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/assignments/supervisor-locations
// @desc    Get supervisor locations
// @access  Private
router.get('/supervisor-locations', protect, async (req, res) => {
  try {
    const supLocs = await SupervisorLocation.find({}, {
      populate: ['supervisorId', 'ncLocationId'],
      sort: { createdAt: -1 }
    });

    const formatted = supLocs.map(sl => ({
      id: sl.id,
      supervisor_id: sl.supervisorId_populated ? sl.supervisorId_populated.id : sl.supervisorId,
      supervisor_name: sl.supervisorId_populated ? (sl.supervisorId_populated.fullName || sl.supervisorId_populated.username || 'Unknown') : 'Unknown',
      nc_location_id: sl.ncLocationId_populated ? sl.ncLocationId_populated.id : sl.ncLocationId,
      location_name: sl.ncLocationId_populated ? sl.ncLocationId_populated.name : 'N/A'
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

// @route   POST /api/assignments/supervisor-locations
// @desc    Assign supervisor to location
// @access  Private/Admin
router.post('/supervisor-locations', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager'), async (req, res) => {
  try {
    const { supervisor_id, nc_location_id } = req.body;

    if (!supervisor_id || !nc_location_id) {
      return res.status(400).json({
        success: false,
        error: 'supervisor_id and nc_location_id are required'
      });
    }

    // Remove existing assignment for this supervisor-location combination
    const existing = await SupervisorLocation.find({ supervisorId: supervisor_id, ncLocationId: nc_location_id });
    for (const item of existing) {
      await SupervisorLocation.findByIdAndDelete(item.id);
    }

    const supLoc = await SupervisorLocation.create({
      supervisorId: supervisor_id,
      ncLocationId: nc_location_id
    });

    const populated = await SupervisorLocation.findById(supLoc.id);
    if (populated) {
      populated.supervisorId_populated = await User.findById(populated.supervisorId);
      populated.ncLocationId_populated = await Location.findById(populated.ncLocationId);
    }

    res.status(201).json({
      success: true,
      data: {
        id: populated.id,
        supervisor_id: populated.supervisorId_populated ? populated.supervisorId_populated.id : populated.supervisorId,
        supervisor_name: populated.supervisorId_populated ? (populated.supervisorId_populated.fullName || 'Unknown') : 'Unknown',
        nc_location_id: populated.ncLocationId_populated ? populated.ncLocationId_populated.id : populated.ncLocationId,
        location_name: populated.ncLocationId_populated ? populated.ncLocationId_populated.name : 'N/A'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/assignments/supervisor-locations/:id
// @desc    Remove supervisor from location
// @access  Private/Admin
router.delete('/supervisor-locations/:id', protect, authorize('ceo', 'super_admin', 'general_manager', 'manager'), async (req, res) => {
  try {
    const supLoc = await SupervisorLocation.findByIdAndDelete(req.params.id);

    if (!supLoc) {
      return res.status(404).json({
        success: false,
        error: 'Supervisor location assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Supervisor location assignment removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

