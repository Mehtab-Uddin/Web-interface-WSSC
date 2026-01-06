const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../utils/auth');
const { protect } = require('../middleware/auth');

// @route   GET /api/auth
// @desc    Get auth endpoints info
// @access  Public
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication endpoints',
    endpoints: {
      register: 'POST /api/auth/register - Register new user',
      login: 'POST /api/auth/login - Login user',
      me: 'GET /api/auth/me - Get current user (requires authentication)'
    }
  });
});

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role = 'staff' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Check if user exists in database
    const existingUser = await User.findOne({ $or: [{ email }, { username: email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Create user in database
    const user = await User.create({
      email,
      username: email,
      password,
      fullName: fullName || '',
      role
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
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

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Check for user in database
    // For login, we need to get password, so we'll query directly
    const { query } = require('../config/database');
    const userResults = await query(
      'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email, email]
    );

    if (userResults.length === 0 || !userResults[0].isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const userData = userResults[0];
    const user = new User(userData);

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user.id);

    // Ensure departments is an array
    let departments = user.departments || [];
    if (typeof departments === 'string') {
      try {
        departments = JSON.parse(departments);
      } catch (e) {
        departments = [];
      }
    }
    if (!Array.isArray(departments)) {
      departments = [];
    }

    const userResponse = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      username: user.username,
      department: user.department || null,
      departments: departments,
      manager_id: user.managerId || null,
      general_manager_id: user.generalManagerId || null
    };

    res.json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        user_id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        username: user.username,
        profile_photo_url: user.profilePhotoUrl || null,
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

module.exports = router;

