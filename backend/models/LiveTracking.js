const { query } = require('../config/database');

class LiveTracking {
  constructor(data) {
    this.id = data.id;
    this.staffId = data.staffId;
    this.date = data.date;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.startTime = data.startTime;
    this.lastUpdate = data.lastUpdate;
    this.locations = data.locations ? (typeof data.locations === 'string' ? JSON.parse(data.locations) : data.locations) : [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM live_tracking WHERE id = ?', [id]);
    return results.length > 0 ? new LiveTracking(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM live_tracking WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new LiveTracking(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM live_tracking';
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
    let trackings = results.map(row => new LiveTracking(row));

    // Handle populate
    if (options.populate) {
      const User = require('./User');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const tracking of trackings) {
        for (const field of populateFields) {
          if (field === 'staffId' && tracking.staffId) {
            tracking.staffId_populated = await User.findById(tracking.staffId);
          }
        }
      }
    }

    return trackings;
  }

  static async create(data) {
    const locationsJson = data.locations ? JSON.stringify(data.locations) : null;

    const sql = `INSERT INTO live_tracking (
      staffId, date, isActive, startTime, lastUpdate, locations
    ) VALUES (?, ?, ?, ?, ?, ?)`;

    const params = [
      data.staffId,
      data.date,
      data.isActive !== undefined ? data.isActive : true,
      data.startTime || new Date(),
      data.lastUpdate || new Date(),
      locationsJson
    ];

    const result = await query(sql, params);
    return await LiveTracking.findById(result.insertId);
  }

  async save() {
    const locationsJson = this.locations ? JSON.stringify(this.locations) : null;

    const sql = `UPDATE live_tracking SET
      staffId = ?, date = ?, isActive = ?, startTime = ?, lastUpdate = ?, locations = ?
      WHERE id = ?`;

    const params = [
      this.staffId,
      this.date,
      this.isActive,
      this.startTime,
      this.lastUpdate,
      locationsJson,
      this.id
    ];

    await query(sql, params);
    return await LiveTracking.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const tracking = await LiveTracking.findById(id);
    if (!tracking) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        tracking[key] = updateData[key];
      }
    });

    return await tracking.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM live_tracking WHERE id = ?', [id]);
    return true;
  }
}

module.exports = LiveTracking;
