const { query } = require('../config/database');

class Department {
  constructor(data) {
    this.id = data.id;
    this.deptId = data.deptId;
    this.label = data.label;
    this.description = data.description ? data.description.toUpperCase() : data.description;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    return results.length > 0 ? new Department(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM departments WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new Department(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM departments';
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
    return results.map(row => new Department(row));
  }

  static async create(data) {
    const sql = `INSERT INTO departments (deptId, label, description, isActive) VALUES (?, ?, ?, ?)`;
    const params = [
      data.deptId,
      data.label.trim(),
      data.description ? data.description.trim().toUpperCase() : '',
      data.isActive !== undefined ? data.isActive : true
    ];

    const result = await query(sql, params);
    return await Department.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE departments SET deptId = ?, label = ?, description = ?, isActive = ? WHERE id = ?`;
    const params = [
      this.deptId,
      this.label.trim(),
      this.description ? this.description.toUpperCase() : '',
      this.isActive,
      this.id
    ];

    await query(sql, params);
    return await Department.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const dept = await Department.findById(id);
    if (!dept) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        dept[key] = updateData[key];
      }
    });

    return await dept.save();
  }

  static async findByIdAndDelete(id) {
    // Soft delete by setting isActive to false
    await query('UPDATE departments SET isActive = FALSE WHERE id = ?', [id]);
    return await Department.findById(id);
  }

  static async countDocuments(conditions = {}) {
    let sql = 'SELECT COUNT(*) as count FROM departments';
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
}

module.exports = Department;
