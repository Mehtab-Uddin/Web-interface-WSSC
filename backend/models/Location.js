const { query } = require('../config/database');

class Location {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description || '';
    this.centerLat = data.centerLat;
    this.centerLng = data.centerLng;
    this.radiusMeters = data.radiusMeters || 100;
    this.boundaries = data.boundaries ? (typeof data.boundaries === 'string' ? JSON.parse(data.boundaries) : data.boundaries) : null;
    this.morningShiftStart = data.morningShiftStart;
    this.morningShiftEnd = data.morningShiftEnd;
    this.nightShiftStart = data.nightShiftStart;
    this.nightShiftEnd = data.nightShiftEnd;
    this.isOffice = data.isOffice || false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM locations WHERE id = ?', [id]);
    return results.length > 0 ? new Location(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM locations WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new Location(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM locations';
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
      const sortField = options.sort.replace(/^-/, '');
      const sortOrder = options.sort.startsWith('-') ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortField} ${sortOrder}`;
    }

    const results = await query(sql, params);
    return results.map(row => new Location(row));
  }

  static async create(data) {
    const sql = `INSERT INTO locations (
      name, code, description, centerLat, centerLng, radiusMeters, boundaries,
      morningShiftStart, morningShiftEnd, nightShiftStart, nightShiftEnd, isOffice
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      data.name.trim(),
      data.code ? data.code.trim() : null,
      data.description || '',
      data.centerLat,
      data.centerLng,
      data.radiusMeters || 100,
      data.boundaries ? JSON.stringify(data.boundaries) : null,
      data.morningShiftStart || null,
      data.morningShiftEnd || null,
      data.nightShiftStart || null,
      data.nightShiftEnd || null,
      data.isOffice || false
    ];

    const result = await query(sql, params);
    return await Location.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE locations SET
      name = ?, code = ?, description = ?, centerLat = ?, centerLng = ?,
      radiusMeters = ?, boundaries = ?, morningShiftStart = ?, morningShiftEnd = ?,
      nightShiftStart = ?, nightShiftEnd = ?, isOffice = ?
      WHERE id = ?`;

    const params = [
      this.name.trim(),
      this.code ? this.code.trim() : null,
      this.description,
      this.centerLat,
      this.centerLng,
      this.radiusMeters,
      this.boundaries ? JSON.stringify(this.boundaries) : null,
      this.morningShiftStart,
      this.morningShiftEnd,
      this.nightShiftStart,
      this.nightShiftEnd,
      this.isOffice,
      this.id
    ];

    await query(sql, params);
    return await Location.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const location = await Location.findById(id);
    if (!location) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        location[key] = updateData[key];
      }
    });

    return await location.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM locations WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Location;
