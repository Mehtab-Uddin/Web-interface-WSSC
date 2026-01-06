const { query } = require('../config/database');

class PerformanceReview {
  constructor(data) {
    this.id = data.id;
    this.staffId = data.staffId;
    this.supervisorId = data.supervisorId;
    this.locationId = data.locationId;
    this.date = data.date;
    this.category = data.category;
    this.description = data.description || '';
    this.photoPath = data.photoPath;
    this.photo2Path = data.photo2Path;
    this.photo3Path = data.photo3Path;
    this.photo4Path = data.photo4Path;
    this.pdfPath = data.pdfPath;
    this.status = data.status || 'active';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM performance_reviews WHERE id = ?', [id]);
    return results.length > 0 ? new PerformanceReview(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM performance_reviews WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new PerformanceReview(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM performance_reviews';
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

    const results = await query(sql, params);
    let reviews = results.map(row => new PerformanceReview(row));

    // Handle populate
    if (options.populate) {
      const User = require('./User');
      const Location = require('./Location');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const review of reviews) {
        for (const field of populateFields) {
          if (field === 'staffId' && review.staffId) {
            review.staffId_populated = await User.findById(review.staffId);
          }
          if (field === 'supervisorId' && review.supervisorId) {
            review.supervisorId_populated = await User.findById(review.supervisorId);
          }
          if (field === 'locationId' && review.locationId) {
            review.locationId_populated = await Location.findById(review.locationId);
          }
        }
      }
    }

    return reviews;
  }

  static async create(data) {
    const sql = `INSERT INTO performance_reviews (
      staffId, supervisorId, locationId, date, category, description,
      photoPath, photo2Path, photo3Path, photo4Path, pdfPath, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      data.staffId,
      data.supervisorId || null,
      data.locationId || null,
      data.date,
      data.category,
      data.description || '',
      data.photoPath || null,
      data.photo2Path || null,
      data.photo3Path || null,
      data.photo4Path || null,
      data.pdfPath || null,
      data.status || 'active'
    ];

    const result = await query(sql, params);
    return await PerformanceReview.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE performance_reviews SET
      staffId = ?, supervisorId = ?, locationId = ?, date = ?, category = ?,
      description = ?, photoPath = ?, photo2Path = ?, photo3Path = ?, photo4Path = ?,
      pdfPath = ?, status = ?
      WHERE id = ?`;

    const params = [
      this.staffId,
      this.supervisorId,
      this.locationId,
      this.date,
      this.category,
      this.description,
      this.photoPath,
      this.photo2Path,
      this.photo3Path,
      this.photo4Path,
      this.pdfPath,
      this.status,
      this.id
    ];

    await query(sql, params);
    return await PerformanceReview.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const review = await PerformanceReview.findById(id);
    if (!review) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        review[key] = updateData[key];
      }
    });

    return await review.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM performance_reviews WHERE id = ?', [id]);
    return true;
  }
}

module.exports = PerformanceReview;
