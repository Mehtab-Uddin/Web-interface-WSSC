const { query } = require('../config/database');

class Gender {
  constructor(data) {
    this.id = data.id;
    this.value = data.value;
    this.label = data.label;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.displayOrder = data.displayOrder || 0;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM genders WHERE id = ?', [id]);
    return results.length > 0 ? new Gender(results[0]) : null;
  }

  static async findByValue(value) {
    const results = await query('SELECT * FROM genders WHERE value = ?', [value]);
    return results.length > 0 ? new Gender(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM genders WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new Gender(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM genders';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        conditionsArray.push(`${key} = ?`);
        params.push(conditions[key]);
      });
      sql += ' WHERE ' + conditionsArray.join(' AND ');
    }

    // Default sort by displayOrder, then by label
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
      sql += ' ORDER BY displayOrder ASC, label ASC';
    }

    const results = await query(sql, params);
    return results.map(row => new Gender(row));
  }

  static async create(data) {
    const sql = `INSERT INTO genders (value, label, isActive, displayOrder) VALUES (?, ?, ?, ?)`;
    const params = [
      data.value.trim(),
      data.label.trim(),
      data.isActive !== undefined ? data.isActive : true,
      data.displayOrder || 0
    ];

    const result = await query(sql, params);
    return await Gender.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE genders SET value = ?, label = ?, isActive = ?, displayOrder = ? WHERE id = ?`;
    const params = [
      this.value.trim(),
      this.label.trim(),
      this.isActive,
      this.displayOrder,
      this.id
    ];

    await query(sql, params);
    return await Gender.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const gender = await Gender.findById(id);
    if (!gender) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        gender[key] = updateData[key];
      }
    });

    return await gender.save();
  }

  static async findByIdAndDelete(id) {
    // Soft delete by setting isActive to false
    await query('UPDATE genders SET isActive = FALSE WHERE id = ?', [id]);
    return await Gender.findById(id);
  }
}

module.exports = Gender;

