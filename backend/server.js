const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const net = require('net');
const { connectDB, query } = require('./config/database');
const Attendance = require('./models/Attendance');

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

let authRoutes, userRoutes, attendanceRoutes, locationRoutes, assignmentRoutes;
let leaveRoutes, dashboardRoutes, approvalRoutes, performanceRoutes;
let systemRoutes, liveTrackingRoutes, notificationRoutes, holidayRoutes, zoneRoutes, departmentRoutes;
let dropdownOptionsRoutes, kmzUploadRoutes;

try {
  authRoutes = require('./routes/auth');
  userRoutes = require('./routes/users');
  attendanceRoutes = require('./routes/attendance');
  locationRoutes = require('./routes/locations');
  assignmentRoutes = require('./routes/assignments');
  leaveRoutes = require('./routes/leave');
  dashboardRoutes = require('./routes/dashboard');
  approvalRoutes = require('./routes/approvals');
  performanceRoutes = require('./routes/performance');
  systemRoutes = require('./routes/system');
  liveTrackingRoutes = require('./routes/liveTracking');
  notificationRoutes = require('./routes/notifications');
  holidayRoutes = require('./routes/holidays');
  zoneRoutes = require('./routes/zones');
  departmentRoutes = require('./routes/departments');
  dropdownOptionsRoutes = require('./routes/dropdownOptions');
  kmzUploadRoutes = require('./routes/kmzUpload');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error(error.stack);
  process.exit(1);
}

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Increase body size limit for photo uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WSSC Management System API',
    version: '1.1',
    endpoints: {
      health: '/health - Server health check',
      api: '/api - API information and available routes',
      database: '/api/db-info - Database connection info',
      auth: '/api/auth - Authentication routes',
      users: '/api/users - User management',
      attendance: '/api/attendance - Attendance tracking',
      locations: '/api/locations - Location management',
      assignments: '/api/assignments - Staff assignments',
      leave: '/api/leave - Leave requests',
      dashboard: '/api/dashboard - Dashboard data',
      approvals: '/api/approvals - Approval workflows',
      performance: '/api/performance - Performance reviews',
      system: '/api/system - System configuration',
      liveTracking: '/api/live-tracking - Live location tracking',
      holidays: '/api/holidays - Company holidays management'
    },
    server: {
      port: req.socket.localPort || process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

let serverPort = null;

app.get('/api/db-info', async (req, res) => {
  try {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'wssc_db';
    const dbUser = process.env.DB_USER || 'root';
    
    // Get database statistics
    let dbStats = null;
    let usersCount = 0;
    let tables = [];
    
    try {
      // Get list of tables
      const tablesResult = await query('SHOW TABLES');
      tables = tablesResult.map(row => Object.values(row)[0]);
      
      // Count users
      const User = require('./models/User');
      usersCount = await User.countDocuments();
      
      // Get database size
      const sizeResult = await query(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [dbName]);
      dbStats = {
        size_mb: sizeResult[0]?.size_mb || 0
      };
    } catch (error) {
      console.error('Error getting database stats:', error.message);
    }
    
    res.json({
      success: true,
      database: {
        name: dbName,
        host: dbHost,
        port: dbPort,
        user: dbUser,
        type: 'MySQL',
        state: 'connected',
        tables: tables,
        usersTable: {
          exists: tables.includes('users'),
          documentCount: usersCount
        },
        stats: dbStats
      },
      backend: {
        port: serverPort || req.socket.localPort || process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection error',
      message: error.message
    });
  }
});

// API root endpoint - shows available routes
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'WSSC Management System API',
    version: '1.1',
    documentation: {
      health: '/health - Server health check',
      database: '/api/db-info - Database connection info',
      endpoints: {
        auth: '/api/auth - Authentication routes',
        users: '/api/users - User management',
        attendance: '/api/attendance - Attendance tracking',
        locations: '/api/locations - Location management',
        assignments: '/api/assignments - Staff assignments',
        leave: '/api/leave - Leave requests',
        dashboard: '/api/dashboard - Dashboard data',
        approvals: '/api/approvals - Approval workflows',
        performance: '/api/performance - Performance reviews',
        system: '/api/system - System configuration',
        liveTracking: '/api/live-tracking - Live location tracking',
        holidays: '/api/holidays - Company holidays management',
        departments: '/api/departments - Department management',
        departments: '/api/departments - Department management'
      }
    },
    server: {
      port: req.socket.localPort || process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/live-tracking', liveTrackingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dropdown-options', dropdownOptionsRoutes);
app.use('/api/kmz', kmzUploadRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Database connection is handled in config/database.js
// connectDB is already imported at the top of the file

const PORT = process.env.PORT || 3000;
const AUTO_CLOCK_OUT_INTERVAL_MS = parseInt(process.env.AUTO_CLOCK_OUT_INTERVAL_MS, 10) || (5 * 60 * 1000); // default every 5 minutes
const AUTO_CLOCK_OUT_BUFFER_MINUTES = 30;

// Helper: parse "HH:MM" to numbers
function parseShiftTimeValue(timeStr, fallbackHour = 17, fallbackMinute = 0) {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: fallbackHour, minute: fallbackMinute };
  }
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }
  return { hour, minute };
}

// Helper: build a Date at the user's local shift end + buffer
function getAutoClockOutDate(attendanceDate, shiftEndTime) {
  const { hour, minute } = parseShiftTimeValue(shiftEndTime);
  const shiftEnd = new Date(`${attendanceDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  return new Date(shiftEnd.getTime() + AUTO_CLOCK_OUT_BUFFER_MINUTES * 60 * 1000);
}

async function runAutoClockOutSweep() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Only target non-overtime & non-double-duty attendances that are still open
  const openAttendances = await Attendance.find({
    clockOut: null,
    attendanceDate: { $lte: todayStr },
    overtime: { $ne: true },
    doubleDuty: { $ne: true }
  }, { populate: 'staffId' });

  let updatedCount = 0;
  const User = require('./models/User');

  for (const attendance of openAttendances) {
    let staff = null;
    if (attendance.staffId_populated) {
      staff = attendance.staffId_populated;
    } else if (attendance.staffId) {
      staff = await User.findById(attendance.staffId);
    }
    
    if (!staff) continue;

    const autoClockOutTime = getAutoClockOutDate(attendance.attendanceDate, staff.shiftEndTime || '17:00');

    if (now >= autoClockOutTime) {
      // Clock out at the scheduled auto time (not "now") to avoid drifting if the job runs late
      attendance.clockOut = autoClockOutTime;
      attendance.clockedOutBy = null; // system auto action
      await attendance.save();
      updatedCount += 1;
    }
  }

  if (updatedCount > 0) {
    console.log(`ℹ️  Auto clock-out: closed ${updatedCount} attendance record(s).`);
  }
}

function startAutoClockOutScheduler() {
  setInterval(() => {
    runAutoClockOutSweep().catch((error) => {
      console.error('❌ Auto clock-out job failed:', error.message);
      console.error(error.stack);
    });
  }, AUTO_CLOCK_OUT_INTERVAL_MS);
}

const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
};

const findAvailablePort = async (startPort, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`Could not find an available port starting from ${startPort}`);
};

const startServer = async () => {
  try {
    await connectDB();
    
    // Seed departments if they don't exist
    try {
      const { seedDepartments } = require('./scripts/seedDepartments');
      await seedDepartments();
    } catch (error) {
      console.warn('⚠️  Could not seed departments (this is OK if they already exist):', error.message);
    }
    
    startAutoClockOutScheduler();
    
    // Check if running in cPanel environment
    // cPanel manages the server, so we shouldn't call app.listen() here
    // Detect cPanel by checking if we're in production and PORT is set by environment
    const isCPanelEnvironment = process.env.NODE_ENV === 'production' && process.env.PORT;
    
    if (isCPanelEnvironment) {
      // cPanel manages the server - just initialize and export
      console.log(`✅ Server initialized for cPanel (production)`);
      console.log(`✅ Database connected`);
      console.log(`✅ API available at: https://api.webypixels.com/api`);
      // Don't call app.listen() - cPanel handles it
      return;
    }
    
    // Local development - manage server ourselves
    let serverPort = PORT;
    const requestedPort = PORT;
    const isPortExplicitlySet = !!process.env.PORT;
    
    if (!(await isPortAvailable(serverPort))) {
      if (isPortExplicitlySet) {
        console.error(`\n❌ Port ${serverPort} is already in use (specified in PORT env variable)`);
        console.error(`   Please free port ${serverPort} or set a different PORT in backend/.env\n`);
        process.exit(1);
      } else {
        console.warn(`⚠️  Port ${serverPort} is already in use`);
        console.warn(`   Looking for an available port starting from ${serverPort}...`);
        
        try {
          serverPort = await findAvailablePort(serverPort, 10);
          console.log(`✅ Found available port: ${serverPort}`);
          console.log(`   Server will run on port ${serverPort} instead of ${requestedPort}`);
          console.log(`   Update your frontend .env EXPO_PUBLIC_API_URL to: http://localhost:${serverPort}/api`);
        } catch (error) {
          console.error(`❌ ${error.message}`);
          console.error(`   Please free up some ports or set PORT in backend/.env\n`);
          process.exit(1);
        }
      }
    }
    
    const server = app.listen(serverPort, '0.0.0.0', () => {
      const actualPort = server.address().port;
      serverPort = actualPort;
      console.log(`✅ Server running on port ${actualPort} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`✅ Health check: http://localhost:${actualPort}/health`);
      console.log(`✅ API base URL: http://localhost:${actualPort}/api`);
      if (actualPort !== requestedPort) {
        console.log(`\n⚠️  NOTE: Server is running on port ${actualPort} (requested: ${requestedPort})`);
      }
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${serverPort} is already in use!`);
        console.error(`   Please set a different PORT in backend/.env\n`);
        process.exit(1);
      } else {
        console.error(`\n❌ Server error: ${error.message}\n`);
        console.error(error.stack);
      }
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} signal received: closing HTTP server gracefully`);
      server.close(async () => {
        console.log('HTTP server closed');
        const { pool } = require('./config/database');
        await pool.end();
        console.log('MySQL connection pool closed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      console.error(error.stack);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      console.error(reason?.stack || reason);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

startServer().catch((error) => {
  console.error('❌ Fatal error starting server:', error);
  console.error(error.stack);
  process.exit(1);
});

module.exports = app;