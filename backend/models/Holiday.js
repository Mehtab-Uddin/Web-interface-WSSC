const { query } = require('../config/database');

class Holiday {
  constructor(data) {
    this.id = data.id;
    this.date = data.date;
    this.name = data.name;
    this.description = data.description || '';
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM holidays WHERE id = ?', [id]);
    return results.length > 0 ? new Holiday(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM holidays WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new Holiday(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM holidays';
    const params = [];
    const conditionsArray = [];

    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        const value = conditions[key];
        
        // Handle nested operators like { $gte: value, $lte: value }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (value.$gte !== undefined || value.$lte !== undefined) {
            const nestedConditions = [];
            if (value.$gte !== undefined) {
              nestedConditions.push(`${key} >= ?`);
              params.push(value.$gte);
            }
            if (value.$lte !== undefined) {
              nestedConditions.push(`${key} <= ?`);
              params.push(value.$lte);
            }
            if (nestedConditions.length > 0) {
              conditionsArray.push('(' + nestedConditions.join(' AND ') + ')');
            }
          } else if (value.$in !== undefined) {
            // Handle nested $in
            const inValues = value.$in;
            if (Array.isArray(inValues) && inValues.length > 0) {
              conditionsArray.push(`${key} IN (${inValues.map(() => '?').join(', ')})`);
              params.push(...inValues);
            } else if (Array.isArray(inValues) && inValues.length === 0) {
              conditionsArray.push('1 = 0');
            }
          } else {
            // Unknown object structure - treat as simple equality
            conditionsArray.push(`${key} = ?`);
            params.push(JSON.stringify(value));
          }
        } else if (value === null) {
          conditionsArray.push(`${key} IS NULL`);
        } else {
          // Simple value (string, number, boolean)
          conditionsArray.push(`${key} = ?`);
          params.push(value);
        }
      });
      
      if (conditionsArray.length > 0) {
        sql += ' WHERE ' + conditionsArray.join(' AND ');
      }
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
    let holidays = results.map(row => new Holiday(row));

    // Handle populate
    if (options.populate) {
      const User = require('./User');
      const populateFields = Array.isArray(options.populate) ? options.populate : [options.populate];
      
      for (const holiday of holidays) {
        for (const field of populateFields) {
          if (field === 'createdBy' && holiday.createdBy) {
            holiday.createdBy_populated = await User.findById(holiday.createdBy);
          }
        }
      }
    }

    return holidays;
  }

  static async create(data) {
    const sql = `INSERT INTO holidays (date, name, description, createdBy) VALUES (?, ?, ?, ?)`;
    const params = [
      data.date,
      data.name,
      data.description || '',
      data.createdBy || null
    ];

    const result = await query(sql, params);
    return await Holiday.findById(result.insertId);
  }

  async save() {
    const sql = `UPDATE holidays SET date = ?, name = ?, description = ?, createdBy = ? WHERE id = ?`;
    const params = [
      this.date,
      this.name,
      this.description,
      this.createdBy,
      this.id
    ];

    await query(sql, params);
    return await Holiday.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const holiday = await Holiday.findById(id);
    if (!holiday) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        holiday[key] = updateData[key];
      }
    });

    return await holiday.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM holidays WHERE id = ?', [id]);
    return true;
  }
}

module.exports = Holiday;
