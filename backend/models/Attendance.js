const { query } = require('../config/database');

class Attendance {
  constructor(data) {
    this.id = data.id;
    this.staffId = data.staffId;
    this.supervisorId = data.supervisorId;
    this.zoneId = data.zoneId;
    this.ncLocationId = data.ncLocationId;
    this.attendanceDate = data.attendanceDate;
    this.clockIn = data.clockIn;
    this.clockOut = data.clockOut;
    this.clockInLat = data.clockInLat;
    this.clockInLng = data.clockInLng;
    this.clockOutLat = data.clockOutLat;
    this.clockOutLng = data.clockOutLng;
    this.clockInPhotoUrl = data.clockInPhotoUrl;
    this.clockOutPhotoUrl = data.clockOutPhotoUrl;
    this.status = data.status || 'Present';
    this.approvalStatus = data.approvalStatus || 'pending';
    this.overtime = data.overtime || false;
    this.doubleDuty = data.doubleDuty || false;
    this.clockedInBy = data.clockedInBy;
    this.clockedOutBy = data.clockedOutBy;
    this.isOverride = data.isOverride || false;
    this.overtimeApprovalStatus = data.overtimeApprovalStatus;
    this.doubleDutyApprovalStatus = data.doubleDutyApprovalStatus;
    this.markedBySupervisor = data.markedBySupervisor;
    this.approvedByManager = data.approvedByManager;
    this.rejectedBy = data.rejectedBy;
    this.rejectionReason = data.rejectionReason;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    // For populate functionality
    this.staffId_populated = data.staffId_populated;
    this.supervisorId_populated = data.supervisorId_populated;
  }

  static async findById(id) {
    const results = await query(
      'SELECT * FROM attendance WHERE id = ?',
      [id]
    );
    return results.length > 0 ? new Attendance(results[0]) : null;
  }

  static async findOne(conditions, options = {}) {
    let sql = 'SELECT * FROM attendance WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      const value = conditions[key];
      
      if (key === '$lte') {
        // Handle top-level $lte operator
        const dateKey = Object.keys(value)[0];
        conditionsArray.push(`${dateKey} <= ?`);
        params.push(value[dateKey]);
      } else if (key === '$ne') {
        // Handle top-level $ne operator
        const neKey = Object.keys(value)[0];
        conditionsArray.push(`${neKey} != ?`);
        params.push(value[neKey]);
      } else if (value === null) {
        conditionsArray.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        // Handle array values (for IN queries on specific fields)
        if (value.length > 0) {
          conditionsArray.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          params.push(...value);
        } else {
          conditionsArray.push('1 = 0'); // Always false if array is empty
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested operators like { attendanceDate: { $in: [...] } } or { field: { $gte: val1, $lte: val2 } }
        const nestedConditions = [];
        if (value.$in !== undefined) {
          const inValues = value.$in;
          if (Array.isArray(inValues) && inValues.length > 0) {
            nestedConditions.push(`${key} IN (${inValues.map(() => '?').join(', ')})`);
            params.push(...inValues);
          } else if (Array.isArray(inValues) && inValues.length === 0) {
            nestedConditions.push('1 = 0');
          }
        }
        if (value.$gte !== undefined) {
          nestedConditions.push(`${key} >= ?`);
          params.push(value.$gte);
        }
        if (value.$lte !== undefined) {
          nestedConditions.push(`${key} <= ?`);
          params.push(value.$lte);
        }
        if (value.$ne !== undefined) {
          nestedConditions.push(`${key} != ?`);
          params.push(value.$ne);
        }
        if (nestedConditions.length > 0) {
          conditionsArray.push('(' + nestedConditions.join(' AND ') + ')');
        } else {
          // Unknown object structure - treat as simple equality (shouldn't happen normally)
          console.warn(`[Attendance.findOne] Unknown object structure for ${key}:`, value);
          conditionsArray.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        }
      } else {
        // Simple value (string, number, boolean)
        conditionsArray.push(`${key} = ?`);
        params.push(value);
      }
    });
    sql += conditionsArray.join(' AND ');

    if (options.sort) {
      if (typeof options.sort === 'object') {
        const sortKeys = Object.keys(options.sort);
        if (sortKeys.length > 0) {
          const sortField = sortKeys[0];
          const sortOrder = options.sort[sortField] === -1 ? 'DESC' : 'ASC';
          sql += ` ORDER BY ${sortField} ${sortOrder}`;
        }
      }
    }

    sql += ' LIMIT 1';

    const results = await query(sql, params);
    if (results.length === 0) return null;

    let attendance = new Attendance(results[0]);

    // Handle populate
    if (options.populate) {
      const User = require('./User');
      const Location = require('./Location');
      const Zone = require('./Zone');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const field of populateFields) {
        if (field === 'staffId' && attendance.staffId) {
          attendance.staffId_populated = await User.findById(attendance.staffId);
        }
        if (field === 'supervisorId' && attendance.supervisorId) {
          attendance.supervisorId_populated = await User.findById(attendance.supervisorId);
        }
        if (field === 'ncLocationId' && attendance.ncLocationId) {
          attendance.ncLocationId_populated = await Location.findById(attendance.ncLocationId);
        }
        if (field === 'zoneId' && attendance.zoneId) {
          attendance.zoneId_populated = await Zone.findById(attendance.zoneId);
        }
        if (field === 'locationId' && attendance.zoneId) {
          attendance.zoneId_populated = await Zone.findById(attendance.zoneId);
          if (attendance.zoneId_populated && attendance.zoneId_populated.locationId) {
            attendance.zoneId_populated.locationId_populated = await Location.findById(attendance.zoneId_populated.locationId);
          }
        }
      }
    }

    return attendance;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM attendance';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        const value = conditions[key];
        
        // Handle top-level operators ($lte, $gte, $ne, $in)
        if (key === '$lte') {
          const dateKey = Object.keys(value)[0];
          conditionsArray.push(`${dateKey} <= ?`);
          params.push(value[dateKey]);
        } else if (key === '$gte') {
          const dateKey = Object.keys(value)[0];
          conditionsArray.push(`${dateKey} >= ?`);
          params.push(value[dateKey]);
        } else if (key === '$ne') {
          const neKey = Object.keys(value)[0];
          conditionsArray.push(`${neKey} != ?`);
          params.push(value[neKey]);
        } else if (key === '$in' && Array.isArray(value)) {
          // Handle $in queries
          if (value.length > 0) {
            conditionsArray.push(`attendanceDate IN (${value.map(() => '?').join(', ')})`);
            params.push(...value);
          } else {
            // Empty array means no matches - add a condition that's always false
            conditionsArray.push('1 = 0');
          }
        } else if (value === null) {
          conditionsArray.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          // Handle array values (for IN queries on specific fields)
          if (value.length > 0) {
            conditionsArray.push(`${key} IN (${value.map(() => '?').join(', ')})`);
            params.push(...value);
          } else {
            conditionsArray.push('1 = 0');
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle nested operators like { $gte: value, $lte: value }
          if (value.$gte !== undefined || value.$lte !== undefined) {
            const nestedConditions = [];
            if (value.$gte !== undefined) {
              nestedConditions.push(`${key} >= ?`);
              params.push(value.$gte);
            }
            if (value.$lte !== undefined) {
              nestedConditions.push(`${key} <= ?`);
              params.push(value.$lte);
            }
            if (nestedConditions.length > 0) {
              conditionsArray.push('(' + nestedConditions.join(' AND ') + ')');
            }
          } else if (value.$in !== undefined) {
            // Handle nested $in
            const inValues = value.$in;
            if (Array.isArray(inValues) && inValues.length > 0) {
              conditionsArray.push(`${key} IN (${inValues.map(() => '?').join(', ')})`);
              params.push(...inValues);
            } else if (Array.isArray(inValues) && inValues.length === 0) {
              // Empty array means no matches - add a condition that's always false
              conditionsArray.push('1 = 0');
            } else {
              // Invalid $in value - skip or add false condition
              console.warn(`[Attendance.find] Invalid $in value for ${key}:`, inValues);
              conditionsArray.push('1 = 0');
            }
          } else {
            // Unknown object structure - treat as simple equality (shouldn't happen normally)
            console.warn(`[Attendance.find] Unknown object structure for ${key}:`, value);
            conditionsArray.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          }
        } else {
          // Simple value (string, number, boolean)
          conditionsArray.push(`${key} = ?`);
          params.push(value);
        }
      });
      
      // Only add WHERE clause if we have conditions
      if (conditionsArray.length > 0) {
        sql += ' WHERE ' + conditionsArray.join(' AND ');
      } else {
        // If no valid conditions, return empty result set
        console.warn('[Attendance.find] No valid conditions after processing, returning empty result');
        sql += ' WHERE 1 = 0';
      }
    }

    if (options.sort) {
      if (typeof options.sort === 'object') {
        // Handle sort object like { createdAt: -1, attendanceDate: -1 }
        const sortKeys = Object.keys(options.sort);
        if (sortKeys.length > 0) {
          const sortParts = sortKeys.map(sortField => {
            const sortOrder = options.sort[sortField] === -1 ? 'DESC' : 'ASC';
            return `${sortField} ${sortOrder}`;
          });
          sql += ` ORDER BY ${sortParts.join(', ')}`;
        }
      } else {
        const sortField = options.sort.replace(/^-/, '');
        const sortOrder = options.sort.startsWith('-') ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${sortField} ${sortOrder}`;
      }
    }

    if (options.limit) {
      sql += ` LIMIT ${parseInt(options.limit)}`;
    }

    // Count placeholders in SQL
    const placeholderCount = (sql.match(/\?/g) || []).length;
    
    // Debug logging
    console.log('[Attendance.find] SQL:', sql);
    console.log('[Attendance.find] Params:', params);
    console.log('[Attendance.find] Placeholder count:', placeholderCount);
    console.log('[Attendance.find] Params count:', params.length);
    console.log('[Attendance.find] Conditions:', JSON.stringify(conditions, null, 2));
    
    if (placeholderCount !== params.length) {
      const error = new Error(`Parameter count mismatch: ${placeholderCount} placeholders but ${params.length} parameters`);
      console.error('[Attendance.find] ERROR:', error.message);
      console.error('[Attendance.find] SQL:', sql);
      console.error('[Attendance.find] Params:', params);
      throw error;
    }

    const results = await query(sql, params);
    let attendances = results.map(row => new Attendance(row));

    // Handle populate
    if (options.populate) {
      const User = require('./User');
      const Location = require('./Location');
      const Zone = require('./Zone');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const attendance of attendances) {
        for (const field of populateFields) {
          if (field === 'staffId' && attendance.staffId) {
            attendance.staffId_populated = await User.findById(attendance.staffId);
          }
          if (field === 'supervisorId' && attendance.supervisorId) {
            attendance.supervisorId_populated = await User.findById(attendance.supervisorId);
          }
          if (field === 'ncLocationId' && attendance.ncLocationId) {
            attendance.ncLocationId_populated = await Location.findById(attendance.ncLocationId);
          }
          if (field === 'zoneId' && attendance.zoneId) {
            attendance.zoneId_populated = await Zone.findById(attendance.zoneId);
          }
          if (field === 'clockedInBy' && attendance.clockedInBy) {
            attendance.clockedInBy_populated = await User.findById(attendance.clockedInBy);
          }
          if (field === 'clockedOutBy' && attendance.clockedOutBy) {
            attendance.clockedOutBy_populated = await User.findById(attendance.clockedOutBy);
          }
        }
      }
    }

    return attendances;
  }

  static async create(data) {
    const sql = `INSERT INTO attendance (
      staffId, supervisorId, zoneId, ncLocationId, attendanceDate, clockIn, clockOut,
      clockInLat, clockInLng, clockOutLat, clockOutLng, clockInPhotoUrl, clockOutPhotoUrl,
      status, approvalStatus, overtime, doubleDuty, clockedInBy, clockedOutBy, isOverride,
      overtimeApprovalStatus, doubleDutyApprovalStatus, markedBySupervisor, approvedByManager,
      rejectedBy, rejectionReason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      data.staffId,
      data.supervisorId,
      data.zoneId || null,
      data.ncLocationId || null,
      data.attendanceDate,
      data.clockIn || null,
      data.clockOut || null,
      data.clockInLat || null,
      data.clockInLng || null,
      data.clockOutLat || null,
      data.clockOutLng || null,
      data.clockInPhotoUrl || null,
      data.clockOutPhotoUrl || null,
      data.status || 'Present',
      data.approvalStatus || 'pending',
      data.overtime || false,
      data.doubleDuty || false,
      data.clockedInBy || null,
      data.clockedOutBy || null,
      data.isOverride || false,
      data.overtimeApprovalStatus || null,
      data.doubleDutyApprovalStatus || null,
      data.markedBySupervisor || null,
      data.approvedByManager || null,
      data.rejectedBy || null,
      data.rejectionReason || null
    ];

    const result = await query(sql, params);
    return await Attendance.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE attendance SET
      staffId = ?, supervisorId = ?, zoneId = ?, ncLocationId = ?, attendanceDate = ?,
      clockIn = ?, clockOut = ?, clockInLat = ?, clockInLng = ?, clockOutLat = ?, clockOutLng = ?,
      clockInPhotoUrl = ?, clockOutPhotoUrl = ?, status = ?, approvalStatus = ?,
      overtime = ?, doubleDuty = ?, clockedInBy = ?, clockedOutBy = ?, isOverride = ?,
      overtimeApprovalStatus = ?, doubleDutyApprovalStatus = ?, markedBySupervisor = ?,
      approvedByManager = ?, rejectedBy = ?, rejectionReason = ?
      WHERE id = ?`;

    const params = [
      this.staffId,
      this.supervisorId,
      this.zoneId,
      this.ncLocationId,
      this.attendanceDate,
      this.clockIn,
      this.clockOut,
      this.clockInLat,
      this.clockInLng,
      this.clockOutLat,
      this.clockOutLng,
      this.clockInPhotoUrl,
      this.clockOutPhotoUrl,
      this.status,
      this.approvalStatus,
      this.overtime,
      this.doubleDuty,
      this.clockedInBy,
      this.clockedOutBy,
      this.isOverride,
      this.overtimeApprovalStatus,
      this.doubleDutyApprovalStatus,
      this.markedBySupervisor,
      this.approvedByManager,
      this.rejectedBy,
      this.rejectionReason,
      this.id
    ];

    await query(sql, params);
    return await Attendance.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const attendance = await Attendance.findById(id);
    if (!attendance) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        attendance[key] = updateData[key];
      }
    });

    return await attendance.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM attendance WHERE id = ?', [id]);
    return true;
  }

  static async exists(conditions) {
    let sql = 'SELECT id FROM attendance WHERE ';
    const params = [];
    const conditionsArray = [];

    if (conditions.$or && Array.isArray(conditions.$or)) {
      // Handle $or queries
      const orConditions = [];
      conditions.$or.forEach(orCond => {
        Object.keys(orCond).forEach(key => {
          orConditions.push(`${key} = ?`);
          params.push(orCond[key]);
        });
      });
      if (orConditions.length > 0) {
        conditionsArray.push('(' + orConditions.join(' OR ') + ')');
      }
    } else {
      Object.keys(conditions).forEach((key) => {
        if (key === '$lte') {
          const dateKey = Object.keys(conditions[key])[0];
          conditionsArray.push(`${dateKey} <= ?`);
          params.push(conditions[key][dateKey]);
        } else if (key === '$ne') {
          const neKey = Object.keys(conditions[key])[0];
          conditionsArray.push(`${neKey} != ?`);
          params.push(conditions[key][neKey]);
        } else if (conditions[key] === null) {
          conditionsArray.push(`${key} IS NULL`);
        } else {
          conditionsArray.push(`${key} = ?`);
          params.push(conditions[key]);
        }
      });
    }

    sql += conditionsArray.join(' AND ');
    sql += ' LIMIT 1';

    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  static async countDocuments(conditions = {}) {
    let sql = 'SELECT COUNT(*) as count FROM attendance';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        if (conditions[key] === null) {
          conditionsArray.push(`${key} IS NULL`);
        } else {
          conditionsArray.push(`${key} = ?`);
          params.push(conditions[key]);
        }
      });
      sql += ' WHERE ' + conditionsArray.join(' AND ');
    }

    const results = await query(sql, params);
    return results[0].count;
  }
}

module.exports = Attendance;
