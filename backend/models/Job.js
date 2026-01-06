const { query } = require('../config/database');

class Job {
  constructor(data) {
    this.id = data.id;
    this.jobId = data.jobId;
    this.label = data.label;
    this.description = data.description || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.displayOrder = data.displayOrder || 0;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM jobs WHERE id = ?', [id]);
    return results.length > 0 ? new Job(results[0]) : null;
  }

  static async findByJobId(jobId) {
    const results = await query('SELECT * FROM jobs WHERE jobId = ?', [jobId]);
    return results.length > 0 ? new Job(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM jobs WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new Job(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM jobs';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        conditionsArray.push(`${key} = ?`);
        params.push(conditions[key]);
      });
      sql += ' WHERE ' + conditionsArray.join(' AND ');
    }

    // Default sort by displayOrder, then by jobId
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
    } else {
      sql += ' ORDER BY displayOrder ASC, jobId ASC';
    }

    const results = await query(sql, params);
    return results.map(row => new Job(row));
  }

  static async create(data) {
    const sql = `INSERT INTO jobs (jobId, label, description, isActive, displayOrder) VALUES (?, ?, ?, ?, ?)`;
    const params = [
      data.jobId,
      data.label.trim(),
      data.description ? data.description.trim() : '',
      data.isActive !== undefined ? data.isActive : true,
      data.displayOrder || 0
    ];

    const result = await query(sql, params);
    return await Job.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE jobs SET jobId = ?, label = ?, description = ?, isActive = ?, displayOrder = ? WHERE id = ?`;
    const params = [
      this.jobId,
      this.label.trim(),
      this.description,
      this.isActive,
      this.displayOrder,
      this.id
    ];

    await query(sql, params);
    return await Job.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const job = await Job.findById(id);
    if (!job) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        job[key] = updateData[key];
      }
    });

    return await job.save();
  }

  static async findByIdAndDelete(id) {
    // Soft delete by setting isActive to false
    await query('UPDATE jobs SET isActive = FALSE WHERE id = ?', [id]);
    return await Job.findById(id);
  }
}

module.exports = Job;

