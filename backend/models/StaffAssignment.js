const { query } = require('../config/database');

class StaffAssignment {
  constructor(data) {
    this.id = data.id;
    this.staffId = data.staffId;
    this.supervisorId = data.supervisorId;
    this.zoneId = data.zoneId;
    this.ncLocationId = data.ncLocationId;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM staff_assignments WHERE id = ?', [id]);
    return results.length > 0 ? new StaffAssignment(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM staff_assignments WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new StaffAssignment(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM staff_assignments';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        conditionsArray.push(`${key} = ?`);
        params.push(conditions[key]);
      });
      sql += ' WHERE ' + conditionsArray.join(' AND ');
    }

    if (options.sort) {
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
    let assignments = results.map(row => new StaffAssignment(row));

    // Handle populate
    if (options.populate) {
      const User = require('./User');
      const Zone = require('./Zone');
      const Location = require('./Location');
      
      for (const assignment of assignments) {
        if (assignment.staffId) {
          assignment.staffId_populated = await User.findById(assignment.staffId);
        }
        if (assignment.supervisorId) {
          assignment.supervisorId_populated = await User.findById(assignment.supervisorId);
        }
        if (assignment.zoneId) {
          assignment.zoneId_populated = await Zone.findById(assignment.zoneId);
          // Populate locationId within zone
          if (assignment.zoneId_populated && assignment.zoneId_populated.locationId) {
            assignment.zoneId_populated.locationId_populated = await Location.findById(assignment.zoneId_populated.locationId);
          }
        }
        if (assignment.ncLocationId) {
          assignment.ncLocationId_populated = await Location.findById(assignment.ncLocationId);
        }
      }
    }

    return assignments;
  }

  static async create(data) {
    const sql = `INSERT INTO staff_assignments (
      staffId, supervisorId, zoneId, ncLocationId, isActive
    ) VALUES (?, ?, ?, ?, ?)`;

    const params = [
      data.staffId,
      data.supervisorId,
      data.zoneId,
      data.ncLocationId || null,
      data.isActive !== undefined ? data.isActive : true
    ];

    const result = await query(sql, params);
    return await StaffAssignment.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE staff_assignments SET
      staffId = ?, supervisorId = ?, zoneId = ?, ncLocationId = ?, isActive = ?
      WHERE id = ?`;

    const params = [
      this.staffId,
      this.supervisorId,
      this.zoneId,
      this.ncLocationId,
      this.isActive,
      this.id
    ];

    await query(sql, params);
    return await StaffAssignment.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const assignment = await StaffAssignment.findById(id);
    if (!assignment) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        assignment[key] = updateData[key];
      }
    });

    return await assignment.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM staff_assignments WHERE id = ?', [id]);
    return true;
  }

  static async exists(conditions) {
    let sql = 'SELECT id FROM staff_assignments WHERE ';
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
        conditionsArray.push(`${key} = ?`);
        params.push(conditions[key]);
      });
    }

    sql += conditionsArray.join(' AND ');
    sql += ' LIMIT 1';

    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
  }
}

module.exports = StaffAssignment;
