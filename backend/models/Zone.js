const { query } = require('../config/database');

class Zone {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.locationId = data.locationId;
    this.description = data.description || '';
    this.centerLat = data.centerLat;
    this.centerLng = data.centerLng;
    this.radiusMeters = data.radiusMeters || 100;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM zones WHERE id = ?', [id]);
    return results.length > 0 ? new Zone(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM zones WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new Zone(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM zones';
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
    let zones = results.map(row => new Zone(row));

    // Handle populate
    if (options.populate) {
      const Location = require('./Location');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const zone of zones) {
        for (const field of populateFields) {
          if (field === 'locationId' && zone.locationId) {
            zone.locationId_populated = await Location.findById(zone.locationId);
          }
        }
      }
    }

    return zones;
  }

  static async create(data) {
    const sql = `INSERT INTO zones (
      name, locationId, description, centerLat, centerLng, radiusMeters, isActive
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      data.name.trim(),
      data.locationId,
      data.description || '',
      data.centerLat,
      data.centerLng,
      data.radiusMeters || 100,
      data.isActive !== undefined ? data.isActive : true
    ];

    const result = await query(sql, params);
    return await Zone.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE zones SET
      name = ?, locationId = ?, description = ?, centerLat = ?, centerLng = ?,
      radiusMeters = ?, isActive = ?
      WHERE id = ?`;

    const params = [
      this.name.trim(),
      this.locationId,
      this.description,
      this.centerLat,
      this.centerLng,
      this.radiusMeters,
      this.isActive,
      this.id
    ];

    await query(sql, params);
    return await Zone.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const zone = await Zone.findById(id);
    if (!zone) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        zone[key] = updateData[key];
      }
    });

    return await zone.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM zones WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Zone;
