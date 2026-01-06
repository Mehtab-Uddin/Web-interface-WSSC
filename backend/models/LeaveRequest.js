const { query } = require('../config/database');

class LeaveRequest {
  constructor(data) {
    this.id = data.id;
    this.staffId = data.staffId;
    this.supervisorId = data.supervisorId;
    this.leaveType = data.leaveType;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.reason = data.reason || '';
    this.status = data.status || 'pending';
    this.approvedBy = data.approvedBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM leave_requests WHERE id = ?', [id]);
    return results.length > 0 ? new LeaveRequest(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM leave_requests WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new LeaveRequest(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM leave_requests';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        if (key === 'startDate' && typeof conditions[key] === 'object') {
          // Handle date range queries like { $lte: '2024-01-01', $gte: '2024-01-01' }
          if (conditions[key].$lte) {
            conditionsArray.push(`startDate <= ?`);
            params.push(conditions[key].$lte);
          }
          if (conditions[key].$gte) {
            conditionsArray.push(`startDate >= ?`);
            params.push(conditions[key].$gte);
          }
        } else if (key === 'endDate' && typeof conditions[key] === 'object') {
          if (conditions[key].$lte) {
            conditionsArray.push(`endDate <= ?`);
            params.push(conditions[key].$lte);
          }
          if (conditions[key].$gte) {
            conditionsArray.push(`endDate >= ?`);
            params.push(conditions[key].$gte);
          }
        } else {
          conditionsArray.push(`${key} = ?`);
          params.push(conditions[key]);
        }
      });
      sql += ' WHERE ' + conditionsArray.join(' AND ');
    }

    if (options.sort) {
      // Handle sort object like { createdAt: -1 }
      if (typeof options.sort === 'object') {
        const sortKeys = Object.keys(options.sort);
        if (sortKeys.length > 0) {
          const sortField = sortKeys[0];
          const sortOrder = options.sort[sortField] === -1 ? 'DESC' : 'ASC';
          sql += ` ORDER BY ${sortField} ${sortOrder}`;
        }
      } else {
        const sortField = options.sort.replace(/^-/, '');
        const sortOrder = options.sort.startsWith('-') ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${sortField} ${sortOrder}`;
      }
    }

    const results = await query(sql, params);
    let leaveRequests = results.map(row => new LeaveRequest(row));

    // Handle populate manually
    if (options.populate) {
      const User = require('./User');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const leaveRequest of leaveRequests) {
        for (const field of populateFields) {
          if (field === 'staffId' && leaveRequest.staffId) {
            leaveRequest.staffId_populated = await User.findById(leaveRequest.staffId);
          }
          if (field === 'supervisorId' && leaveRequest.supervisorId) {
            leaveRequest.supervisorId_populated = await User.findById(leaveRequest.supervisorId);
          }
          if (field === 'approvedBy' && leaveRequest.approvedBy) {
            leaveRequest.approvedBy_populated = await User.findById(leaveRequest.approvedBy);
          }
        }
      }
    }

    return leaveRequests;
  }

  static async create(data) {
    const sql = `INSERT INTO leave_requests (
      staffId, supervisorId, leaveType, startDate, endDate, reason, status, approvedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      data.staffId,
      data.supervisorId || null,
      data.leaveType,
      data.startDate,
      data.endDate,
      data.reason || '',
      data.status || 'pending',
      data.approvedBy || null
    ];

    const result = await query(sql, params);
    return await LeaveRequest.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE leave_requests SET
      staffId = ?, supervisorId = ?, leaveType = ?, startDate = ?, endDate = ?,
      reason = ?, status = ?, approvedBy = ?
      WHERE id = ?`;

    const params = [
      this.staffId,
      this.supervisorId,
      this.leaveType,
      this.startDate,
      this.endDate,
      this.reason,
      this.status,
      this.approvedBy,
      this.id
    ];

    await query(sql, params);
    return await LeaveRequest.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const leaveRequest = await LeaveRequest.findById(id);
    if (!leaveRequest) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        leaveRequest[key] = updateData[key];
      }
    });

    return await leaveRequest.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM leave_requests WHERE id = ?', [id]);
    return true;
  }

  static async countDocuments(conditions = {}) {
    let sql = 'SELECT COUNT(*) as count FROM leave_requests';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        conditionsArray.push(`${key} = ?`);
        params.push(conditions[key]);
      });
      sql += ' WHERE ' + conditionsArray.join(' AND ');
    }

    const results = await query(sql, params);
    return results[0].count;
  }

  static async exists(conditions) {
    let sql = 'SELECT id FROM leave_requests WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      if (key === 'startDate' && typeof conditions[key] === 'object') {
        if (conditions[key].$lte) {
          conditionsArray.push(`startDate <= ?`);
          params.push(conditions[key].$lte);
        }
        if (conditions[key].$gte) {
          conditionsArray.push(`startDate >= ?`);
          params.push(conditions[key].$gte);
        }
      } else if (key === 'endDate' && typeof conditions[key] === 'object') {
        if (conditions[key].$lte) {
          conditionsArray.push(`endDate <= ?`);
          params.push(conditions[key].$lte);
        }
        if (conditions[key].$gte) {
          conditionsArray.push(`endDate >= ?`);
          params.push(conditions[key].$gte);
        }
      } else {
        conditionsArray.push(`${key} = ?`);
        params.push(conditions[key]);
      }
    });

    sql += conditionsArray.join(' AND ');
    sql += ' LIMIT 1';

    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
  }
}

module.exports = LeaveRequest;
