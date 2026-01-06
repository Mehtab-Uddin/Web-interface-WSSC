const { query } = require('../config/database');

class SupervisorLocation {
  constructor(data) {
    this.id = data.id;
    this.supervisorId = data.supervisorId;
    this.ncLocationId = data.ncLocationId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM supervisor_locations WHERE id = ?', [id]);
    return results.length > 0 ? new SupervisorLocation(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM supervisor_locations WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new SupervisorLocation(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM supervisor_locations';
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
    let supervisorLocations = results.map(row => new SupervisorLocation(row));

    // Handle populate
    if (options.populate) {
      const User = require('./User');
      const Location = require('./Location');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const supLoc of supervisorLocations) {
        for (const field of populateFields) {
          if (field === 'supervisorId' && supLoc.supervisorId) {
            supLoc.supervisorId_populated = await User.findById(supLoc.supervisorId);
          }
          if (field === 'ncLocationId' && supLoc.ncLocationId) {
            supLoc.ncLocationId_populated = await Location.findById(supLoc.ncLocationId);
          }
        }
      }
    }

    return supervisorLocations;
  }

  static async create(data) {
    const sql = `INSERT INTO supervisor_locations (supervisorId, ncLocationId) VALUES (?, ?)`;
    const params = [
      data.supervisorId,
      data.ncLocationId
    ];

    const result = await query(sql, params);
    return await SupervisorLocation.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE supervisor_locations SET supervisorId = ?, ncLocationId = ? WHERE id = ?`;
    const params = [
      this.supervisorId,
      this.ncLocationId,
      this.id
    ];

    await query(sql, params);
    return await SupervisorLocation.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const supervisorLocation = await SupervisorLocation.findById(id);
    if (!supervisorLocation) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        supervisorLocation[key] = updateData[key];
      }
    });

    return await supervisorLocation.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM supervisor_locations WHERE id = ?', [id]);
    return true;
  }

  static async exists(conditions) {
    let sql = 'SELECT id FROM supervisor_locations WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });

    sql += conditionsArray.join(' AND ');
    sql += ' LIMIT 1';

    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
  }
}

module.exports = SupervisorLocation;
