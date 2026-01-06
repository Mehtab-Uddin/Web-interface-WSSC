-- WSSC Management System Database Schema
-- MySQL Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS wssc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wssc_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(255) DEFAULT '',
  role ENUM('staff', 'supervisor', 'sub_engineer', 'manager', 'general_manager', 'ceo', 'super_admin') NOT NULL DEFAULT 'staff',
  department VARCHAR(255) DEFAULT NULL,
  departments JSON DEFAULT NULL,
  managerId INT DEFAULT NULL,
  generalManagerId INT DEFAULT NULL,
  empFname VARCHAR(255) DEFAULT NULL,
  empDeptt VARCHAR(255) DEFAULT NULL,
  empJob VARCHAR(255) DEFAULT NULL,
  empGrade VARCHAR(255) DEFAULT NULL,
  empCell1 VARCHAR(255) DEFAULT NULL,
  empCell2 VARCHAR(255) DEFAULT NULL,
  empFlg VARCHAR(255) DEFAULT NULL,
  empMarried VARCHAR(255) DEFAULT NULL,
  empGender VARCHAR(255) DEFAULT NULL,
  empNo VARCHAR(255) DEFAULT NULL,
  empCnic VARCHAR(255) DEFAULT NULL,
  shiftDays ENUM('5', '6') DEFAULT '6',
  shiftTime ENUM('day', 'night', 'custom') DEFAULT 'day',
  shiftStartTime VARCHAR(5) DEFAULT '09:00',
  shiftEndTime VARCHAR(5) DEFAULT '17:00',
  profilePhotoUrl VARCHAR(500) DEFAULT NULL,
  expoPushToken VARCHAR(255) DEFAULT NULL,
  pushNotificationsEnabled BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_isActive (isActive),
  FOREIGN KEY (managerId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (generalManagerId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deptId INT NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_deptId (deptId),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT '',
  centerLat DECIMAL(10, 8) NOT NULL,
  centerLng DECIMAL(11, 8) NOT NULL,
  radiusMeters INT DEFAULT 100,
  boundaries JSON DEFAULT NULL COMMENT 'Polygon coordinates array: [[lng, lat], ...]',
  morningShiftStart VARCHAR(5) DEFAULT NULL,
  morningShiftEnd VARCHAR(5) DEFAULT NULL,
  nightShiftStart VARCHAR(5) DEFAULT NULL,
  nightShiftEnd VARCHAR(5) DEFAULT NULL,
  isOffice BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  locationId INT NOT NULL,
  description TEXT DEFAULT '',
  centerLat DECIMAL(10, 8) NOT NULL,
  centerLng DECIMAL(11, 8) NOT NULL,
  radiusMeters INT DEFAULT 100,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_locationId (locationId),
  INDEX idx_isActive (isActive),
  FOREIGN KEY (locationId) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Staff Assignments table
CREATE TABLE IF NOT EXISTS staff_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT NOT NULL,
  supervisorId INT NOT NULL,
  zoneId INT NOT NULL,
  ncLocationId INT DEFAULT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staffId (staffId),
  INDEX idx_supervisorId (supervisorId),
  INDEX idx_zoneId (zoneId),
  INDEX idx_isActive (isActive),
  FOREIGN KEY (staffId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (zoneId) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (ncLocationId) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT NOT NULL,
  supervisorId INT NOT NULL,
  zoneId INT DEFAULT NULL,
  ncLocationId INT DEFAULT NULL,
  attendanceDate DATE NOT NULL,
  clockIn DATETIME DEFAULT NULL,
  clockOut DATETIME DEFAULT NULL,
  clockInLat DECIMAL(10, 8) DEFAULT NULL,
  clockInLng DECIMAL(11, 8) DEFAULT NULL,
  clockOutLat DECIMAL(10, 8) DEFAULT NULL,
  clockOutLng DECIMAL(11, 8) DEFAULT NULL,
  clockInPhotoUrl VARCHAR(500) DEFAULT NULL,
  clockOutPhotoUrl VARCHAR(500) DEFAULT NULL,
  status ENUM('Present', 'Late', 'Absent') DEFAULT 'Present',
  approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  overtime BOOLEAN DEFAULT FALSE,
  doubleDuty BOOLEAN DEFAULT FALSE,
  clockedInBy INT DEFAULT NULL,
  clockedOutBy INT DEFAULT NULL,
  isOverride BOOLEAN DEFAULT FALSE,
  overtimeApprovalStatus ENUM('pending', 'supervisor_approved', 'manager_approved', 'rejected') DEFAULT NULL,
  doubleDutyApprovalStatus ENUM('pending', 'supervisor_approved', 'manager_approved', 'rejected') DEFAULT NULL,
  markedBySupervisor INT DEFAULT NULL,
  approvedByManager INT DEFAULT NULL,
  rejectedBy INT DEFAULT NULL,
  rejectionReason TEXT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staffId_date (staffId, attendanceDate),
  INDEX idx_supervisorId_date (supervisorId, attendanceDate),
  INDEX idx_attendanceDate (attendanceDate),
  FOREIGN KEY (staffId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (zoneId) REFERENCES zones(id) ON DELETE SET NULL,
  FOREIGN KEY (ncLocationId) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (clockedInBy) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (clockedOutBy) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (markedBySupervisor) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approvedByManager) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (rejectedBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT NOT NULL,
  supervisorId INT DEFAULT NULL,
  leaveType VARCHAR(255) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  reason TEXT DEFAULT '',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approvedBy INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staffId_status (staffId, status),
  INDEX idx_supervisorId_status (supervisorId, status),
  FOREIGN KEY (staffId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  createdBy INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance Reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT NOT NULL,
  supervisorId INT DEFAULT NULL,
  locationId INT DEFAULT NULL,
  date DATE NOT NULL,
  category VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  photoPath VARCHAR(500) DEFAULT NULL,
  photo2Path VARCHAR(500) DEFAULT NULL,
  photo3Path VARCHAR(500) DEFAULT NULL,
  photo4Path VARCHAR(500) DEFAULT NULL,
  pdfPath VARCHAR(500) DEFAULT NULL,
  status ENUM('active', 'archived') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staffId_date (staffId, date),
  INDEX idx_supervisorId (supervisorId),
  FOREIGN KEY (staffId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (locationId) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Live Tracking table
CREATE TABLE IF NOT EXISTS live_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staffId INT NOT NULL,
  date DATE NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  startTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastUpdate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  locations JSON DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staffId_date_active (staffId, date, isActive),
  FOREIGN KEY (staffId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supervisor Locations table
CREATE TABLE IF NOT EXISTS supervisor_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supervisorId INT NOT NULL,
  ncLocationId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_supervisor_location (supervisorId, ncLocationId),
  INDEX idx_supervisorId (supervisorId),
  FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ncLocationId) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jobs table (for employee job titles)
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jobId INT NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jobId (jobId),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grades table (for employee grades)
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gradeId INT NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gradeId (gradeId),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marital Statuses table
CREATE TABLE IF NOT EXISTS marital_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  value VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_value (value),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Genders table
CREATE TABLE IF NOT EXISTS genders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  value VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_value (value),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shift Days table
CREATE TABLE IF NOT EXISTS shift_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  value VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  days INT NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_value (value),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shift Times table
CREATE TABLE IF NOT EXISTS shift_times (
  id INT AUTO_INCREMENT PRIMARY KEY,
  value VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  startTime VARCHAR(5) NOT NULL,
  endTime VARCHAR(5) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_value (value),
  INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Config table
CREATE TABLE IF NOT EXISTS system_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  configKey VARCHAR(255) NOT NULL UNIQUE,
  gracePeriodMinutes INT DEFAULT 15,
  minClockIntervalHours INT DEFAULT 6,
  otherSettings JSON DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

