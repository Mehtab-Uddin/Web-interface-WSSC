const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Grade = require('../models/Grade');
const MaritalStatus = require('../models/MaritalStatus');
const Gender = require('../models/Gender');
const ShiftDay = require('../models/ShiftDay');
const ShiftTime = require('../models/ShiftTime');
const { protect, authorize } = require('../middleware/auth');

// ==================== JOBS ====================

// @route   GET /api/dropdown-options/jobs
// @desc    Get all jobs
// @access  Private
router.get('/jobs', protect, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Fetch all jobs first
    const allJobs = await Job.find({}, {
      sort: { displayOrder: 1, jobId: 1 }
    });

    // Filter based on includeInactive flag
    // If includeInactive is not 'true', only return active jobs
    // MySQL returns tinyint(1) as 1/0 (numbers), not true/false (booleans)
    // Treat 1, true, null, and undefined as active
    const jobs = includeInactive === 'true' 
      ? allJobs 
      : allJobs.filter(job => {
          const isActive = job.isActive;
          return isActive === true || isActive === 1 || isActive === null || isActive === undefined;
        });

    res.json({
      success: true,
      data: jobs.map(job => ({
        id: job.id,
        jobId: job.jobId,
        label: job.label,
        description: job.description,
        // Convert MySQL tinyint(1) (1/0) to boolean (true/false), treat null/undefined as true
        isActive: job.isActive === 1 || job.isActive === true || job.isActive === null || job.isActive === undefined,
        displayOrder: job.displayOrder
      }))
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/dropdown-options/jobs
// @desc    Create new job
// @access  Private/SuperAdmin
router.post('/jobs', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { jobId, label, description, displayOrder } = req.body;

    if (!jobId || !label) {
      return res.status(400).json({
        success: false,
        error: 'jobId and label are required'
      });
    }

    // Check if jobId already exists
    const existing = await Job.findByJobId(jobId);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Job with ID ${jobId} already exists`
      });
    }

    const job = await Job.create({
      jobId: parseInt(jobId),
      label: label.trim(),
      description: description || '',
      displayOrder: displayOrder || 0
    });

    res.status(201).json({
      success: true,
      data: {
        id: job.id,
        jobId: job.jobId,
        label: job.label,
        description: job.description,
        isActive: job.isActive,
        displayOrder: job.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/dropdown-options/jobs/:id
// @desc    Update job
// @access  Private/SuperAdmin
router.put('/jobs/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { label, description, isActive, displayOrder } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

    const job = await Job.findByIdAndUpdate(req.params.id, updateData);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        jobId: job.jobId,
        label: job.label,
        description: job.description,
        isActive: job.isActive,
        displayOrder: job.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/dropdown-options/jobs/:id
// @desc    Delete job (soft delete)
// @access  Private/SuperAdmin
router.delete('/jobs/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== GRADES ====================

// @route   GET /api/dropdown-options/grades
// @desc    Get all grades
// @access  Private
router.get('/grades', protect, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Fetch all grades first
    const allGrades = await Grade.find({}, {
      sort: { displayOrder: 1, gradeId: 1 }
    });

    // Filter based on includeInactive flag
    // If includeInactive is not 'true', only return active grades
    // MySQL returns tinyint(1) as 1/0 (numbers), not true/false (booleans)
    // Treat 1, true, null, and undefined as active
    const grades = includeInactive === 'true' 
      ? allGrades 
      : allGrades.filter(grade => {
          const isActive = grade.isActive;
          return isActive === true || isActive === 1 || isActive === null || isActive === undefined;
        });

    res.json({
      success: true,
      data: grades.map(grade => ({
        id: grade.id,
        gradeId: grade.gradeId,
        label: grade.label,
        description: grade.description,
        // Convert MySQL tinyint(1) (1/0) to boolean (true/false), treat null/undefined as true
        isActive: grade.isActive === 1 || grade.isActive === true || grade.isActive === null || grade.isActive === undefined,
        displayOrder: grade.displayOrder
      }))
    });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/dropdown-options/grades
// @desc    Create new grade
// @access  Private/SuperAdmin
router.post('/grades', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { gradeId, label, description, displayOrder } = req.body;

    if (!gradeId || !label) {
      return res.status(400).json({
        success: false,
        error: 'gradeId and label are required'
      });
    }

    // Check if gradeId already exists
    const existing = await Grade.findByGradeId(gradeId);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Grade with ID ${gradeId} already exists`
      });
    }

    const grade = await Grade.create({
      gradeId: parseInt(gradeId),
      label: label.trim(),
      description: description || '',
      displayOrder: displayOrder || 0
    });

    res.status(201).json({
      success: true,
      data: {
        id: grade.id,
        gradeId: grade.gradeId,
        label: grade.label,
        description: grade.description,
        isActive: grade.isActive,
        displayOrder: grade.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/dropdown-options/grades/:id
// @desc    Update grade
// @access  Private/SuperAdmin
router.put('/grades/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { label, description, isActive, displayOrder } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

    const grade = await Grade.findByIdAndUpdate(req.params.id, updateData);

    if (!grade) {
      return res.status(404).json({
        success: false,
        error: 'Grade not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: grade.id,
        gradeId: grade.gradeId,
        label: grade.label,
        description: grade.description,
        isActive: grade.isActive,
        displayOrder: grade.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/dropdown-options/grades/:id
// @desc    Delete grade (soft delete)
// @access  Private/SuperAdmin
router.delete('/grades/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const grade = await Grade.findByIdAndDelete(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        error: 'Grade not found'
      });
    }

    res.json({
      success: true,
      message: 'Grade deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== MARITAL STATUSES ====================

// @route   GET /api/dropdown-options/marital-statuses
// @desc    Get all marital statuses
// @access  Private
router.get('/marital-statuses', protect, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Fetch all marital statuses first
    const allStatuses = await MaritalStatus.find({}, {
      sort: { displayOrder: 1, label: 1 }
    });

    // Filter based on includeInactive flag
    // If includeInactive is not 'true', only return active statuses
    // MySQL returns tinyint(1) as 1/0 (numbers), not true/false (booleans)
    // Treat 1, true, null, and undefined as active
    const statuses = includeInactive === 'true' 
      ? allStatuses 
      : allStatuses.filter(status => {
          const isActive = status.isActive;
          return isActive === true || isActive === 1 || isActive === null || isActive === undefined;
        });

    res.json({
      success: true,
      data: statuses.map(status => ({
        id: status.id,
        value: status.value,
        label: status.label,
        // Convert MySQL tinyint(1) (1/0) to boolean (true/false), treat null/undefined as true
        isActive: status.isActive === 1 || status.isActive === true || status.isActive === null || status.isActive === undefined,
        displayOrder: status.displayOrder
      }))
    });
  } catch (error) {
    console.error('Error fetching marital statuses:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/dropdown-options/marital-statuses
// @desc    Create new marital status
// @access  Private/SuperAdmin
router.post('/marital-statuses', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { value, label, displayOrder } = req.body;

    if (!value || !label) {
      return res.status(400).json({
        success: false,
        error: 'value and label are required'
      });
    }

    // Check if value already exists
    const existing = await MaritalStatus.findByValue(value);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Marital status with value "${value}" already exists`
      });
    }

    const status = await MaritalStatus.create({
      value: value.trim(),
      label: label.trim(),
      displayOrder: displayOrder || 0
    });

    res.status(201).json({
      success: true,
      data: {
        id: status.id,
        value: status.value,
        label: status.label,
        isActive: status.isActive,
        displayOrder: status.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/dropdown-options/marital-statuses/:id
// @desc    Update marital status
// @access  Private/SuperAdmin
router.put('/marital-statuses/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { label, isActive, displayOrder } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

    const status = await MaritalStatus.findByIdAndUpdate(req.params.id, updateData);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Marital status not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: status.id,
        value: status.value,
        label: status.label,
        isActive: status.isActive,
        displayOrder: status.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/dropdown-options/marital-statuses/:id
// @desc    Delete marital status (soft delete)
// @access  Private/SuperAdmin
router.delete('/marital-statuses/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const status = await MaritalStatus.findByIdAndDelete(req.params.id);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Marital status not found'
      });
    }

    res.json({
      success: true,
      message: 'Marital status deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== GENDERS ====================

// @route   GET /api/dropdown-options/genders
// @desc    Get all genders
// @access  Private
router.get('/genders', protect, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Fetch all genders first
    const allGenders = await Gender.find({}, {
      sort: { displayOrder: 1, label: 1 }
    });

    // Filter based on includeInactive flag
    // If includeInactive is not 'true', only return active genders
    // MySQL returns tinyint(1) as 1/0 (numbers), not true/false (booleans)
    // Treat 1, true, null, and undefined as active
    const genders = includeInactive === 'true' 
      ? allGenders 
      : allGenders.filter(gender => {
          const isActive = gender.isActive;
          return isActive === true || isActive === 1 || isActive === null || isActive === undefined;
        });

    res.json({
      success: true,
      data: genders.map(gender => ({
        id: gender.id,
        value: gender.value,
        label: gender.label,
        // Convert MySQL tinyint(1) (1/0) to boolean (true/false), treat null/undefined as true
        isActive: gender.isActive === 1 || gender.isActive === true || gender.isActive === null || gender.isActive === undefined,
        displayOrder: gender.displayOrder
      }))
    });
  } catch (error) {
    console.error('Error fetching genders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/dropdown-options/genders
// @desc    Create new gender
// @access  Private/SuperAdmin
router.post('/genders', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { value, label, displayOrder } = req.body;

    if (!value || !label) {
      return res.status(400).json({
        success: false,
        error: 'value and label are required'
      });
    }

    // Check if value already exists
    const existing = await Gender.findByValue(value);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Gender with value "${value}" already exists`
      });
    }

    const gender = await Gender.create({
      value: value.trim(),
      label: label.trim(),
      displayOrder: displayOrder || 0
    });

    res.status(201).json({
      success: true,
      data: {
        id: gender.id,
        value: gender.value,
        label: gender.label,
        isActive: gender.isActive,
        displayOrder: gender.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/dropdown-options/genders/:id
// @desc    Update gender
// @access  Private/SuperAdmin
router.put('/genders/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { label, isActive, displayOrder } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

    const gender = await Gender.findByIdAndUpdate(req.params.id, updateData);

    if (!gender) {
      return res.status(404).json({
        success: false,
        error: 'Gender not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: gender.id,
        value: gender.value,
        label: gender.label,
        isActive: gender.isActive,
        displayOrder: gender.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/dropdown-options/genders/:id
// @desc    Delete gender (soft delete)
// @access  Private/SuperAdmin
router.delete('/genders/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const gender = await Gender.findByIdAndDelete(req.params.id);

    if (!gender) {
      return res.status(404).json({
        success: false,
        error: 'Gender not found'
      });
    }

    res.json({
      success: true,
      message: 'Gender deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SHIFT DAYS ====================

// @route   GET /api/dropdown-options/shift-days
// @desc    Get all shift days
// @access  Private
router.get('/shift-days', protect, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Fetch all shift days first
    const allShiftDays = await ShiftDay.find({}, {
      sort: { displayOrder: 1, label: 1 }
    });

    // Filter based on includeInactive flag
    // If includeInactive is not 'true', only return active shift days (isActive === true or null)
    const shiftDays = includeInactive === 'true' 
      ? allShiftDays 
      : allShiftDays.filter(shiftDay => shiftDay.isActive === true || shiftDay.isActive === null || shiftDay.isActive === undefined);

    res.json({
      success: true,
      data: shiftDays.map(shiftDay => ({
        id: shiftDay.id,
        value: shiftDay.value,
        label: shiftDay.label,
        days: shiftDay.days,
        description: shiftDay.description,
        isActive: shiftDay.isActive !== null && shiftDay.isActive !== undefined ? shiftDay.isActive : true, // Treat null as active
        displayOrder: shiftDay.displayOrder
      }))
    });
  } catch (error) {
    console.error('Error fetching shift days:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/dropdown-options/shift-days
// @desc    Create new shift day
// @access  Private/SuperAdmin
router.post('/shift-days', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { value, label, days, description, displayOrder } = req.body;

    if (!value || !label || days === undefined) {
      return res.status(400).json({
        success: false,
        error: 'value, label, and days are required'
      });
    }

    // Check if value already exists
    const existing = await ShiftDay.findByValue(value);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Shift day with value "${value}" already exists`
      });
    }

    const shiftDay = await ShiftDay.create({
      value: value.trim(),
      label: label.trim(),
      days: parseInt(days),
      description: description || '',
      displayOrder: displayOrder || 0
    });

    res.status(201).json({
      success: true,
      data: {
        id: shiftDay.id,
        value: shiftDay.value,
        label: shiftDay.label,
        days: shiftDay.days,
        description: shiftDay.description,
        isActive: shiftDay.isActive,
        displayOrder: shiftDay.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/dropdown-options/shift-days/:id
// @desc    Update shift day
// @access  Private/SuperAdmin
router.put('/shift-days/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { label, days, description, isActive, displayOrder } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label.trim();
    if (days !== undefined) updateData.days = parseInt(days);
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

    const shiftDay = await ShiftDay.findByIdAndUpdate(req.params.id, updateData);

    if (!shiftDay) {
      return res.status(404).json({
        success: false,
        error: 'Shift day not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: shiftDay.id,
        value: shiftDay.value,
        label: shiftDay.label,
        days: shiftDay.days,
        description: shiftDay.description,
        isActive: shiftDay.isActive,
        displayOrder: shiftDay.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/dropdown-options/shift-days/:id
// @desc    Delete shift day (soft delete)
// @access  Private/SuperAdmin
router.delete('/shift-days/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const shiftDay = await ShiftDay.findByIdAndDelete(req.params.id);

    if (!shiftDay) {
      return res.status(404).json({
        success: false,
        error: 'Shift day not found'
      });
    }

    res.json({
      success: true,
      message: 'Shift day deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SHIFT TIMES ====================

// @route   GET /api/dropdown-options/shift-times
// @desc    Get all shift times
// @access  Private
router.get('/shift-times', protect, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Fetch all shift times first
    const allShiftTimes = await ShiftTime.find({}, {
      sort: { displayOrder: 1, label: 1 }
    });

    // Filter based on includeInactive flag
    // If includeInactive is not 'true', only return active shift times (isActive === true or null)
    const shiftTimes = includeInactive === 'true' 
      ? allShiftTimes 
      : allShiftTimes.filter(shiftTime => shiftTime.isActive === true || shiftTime.isActive === null || shiftTime.isActive === undefined);

    res.json({
      success: true,
      data: shiftTimes.map(shiftTime => ({
        id: shiftTime.id,
        value: shiftTime.value,
        label: shiftTime.label,
        startTime: shiftTime.startTime,
        endTime: shiftTime.endTime,
        description: shiftTime.description,
        isActive: shiftTime.isActive !== null && shiftTime.isActive !== undefined ? shiftTime.isActive : true, // Treat null as active
        displayOrder: shiftTime.displayOrder
      }))
    });
  } catch (error) {
    console.error('Error fetching shift times:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/dropdown-options/shift-times
// @desc    Create new shift time
// @access  Private/SuperAdmin
router.post('/shift-times', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { value, label, startTime, endTime, description, displayOrder } = req.body;

    if (!value || !label || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'value, label, startTime, and endTime are required'
      });
    }

    // Check if value already exists
    const existing = await ShiftTime.findByValue(value);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Shift time with value "${value}" already exists`
      });
    }

    const shiftTime = await ShiftTime.create({
      value: value.trim(),
      label: label.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      description: description || '',
      displayOrder: displayOrder || 0
    });

    res.status(201).json({
      success: true,
      data: {
        id: shiftTime.id,
        value: shiftTime.value,
        label: shiftTime.label,
        startTime: shiftTime.startTime,
        endTime: shiftTime.endTime,
        description: shiftTime.description,
        isActive: shiftTime.isActive,
        displayOrder: shiftTime.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   PUT /api/dropdown-options/shift-times/:id
// @desc    Update shift time
// @access  Private/SuperAdmin
router.put('/shift-times/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { label, startTime, endTime, description, isActive, displayOrder } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label.trim();
    if (startTime !== undefined) updateData.startTime = startTime.trim();
    if (endTime !== undefined) updateData.endTime = endTime.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

    const shiftTime = await ShiftTime.findByIdAndUpdate(req.params.id, updateData);

    if (!shiftTime) {
      return res.status(404).json({
        success: false,
        error: 'Shift time not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: shiftTime.id,
        value: shiftTime.value,
        label: shiftTime.label,
        startTime: shiftTime.startTime,
        endTime: shiftTime.endTime,
        description: shiftTime.description,
        isActive: shiftTime.isActive,
        displayOrder: shiftTime.displayOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   DELETE /api/dropdown-options/shift-times/:id
// @desc    Delete shift time (soft delete)
// @access  Private/SuperAdmin
router.delete('/shift-times/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const shiftTime = await ShiftTime.findByIdAndDelete(req.params.id);

    if (!shiftTime) {
      return res.status(404).json({
        success: false,
        error: 'Shift time not found'
      });
    }

    res.json({
      success: true,
      message: 'Shift time deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

