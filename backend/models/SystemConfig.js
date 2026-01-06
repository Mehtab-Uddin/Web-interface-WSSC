const { query } = require('../config/database');

class SystemConfig {
  constructor(data) {
    this.id = data.id;
    this.configKey = data.configKey;
    this.gracePeriodMinutes = data.gracePeriodMinutes || 15;
    this.minClockIntervalHours = data.minClockIntervalHours || 6;
    this.otherSettings = data.otherSettings ? (typeof data.otherSettings === 'string' ? JSON.parse(data.otherSettings) : data.otherSettings) : {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findById(id) {
    const results = await query('SELECT * FROM system_configs WHERE id = ?', [id]);
    return results.length > 0 ? new SystemConfig(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM system_configs WHERE ';
    const params = [];
    const conditionsArray = [];

    Object.keys(conditions).forEach((key) => {
      conditionsArray.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += conditionsArray.join(' AND ');

    const results = await query(sql, params);
    return results.length > 0 ? new SystemConfig(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    let sql = 'SELECT * FROM system_configs';
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
    return results.map(row => new SystemConfig(row));
  }

  static async create(data) {
    const otherSettingsJson = data.otherSettings ? JSON.stringify(data.otherSettings) : null;

    const sql = `INSERT INTO system_configs (
      configKey, gracePeriodMinutes, minClockIntervalHours, otherSettings
    ) VALUES (?, ?, ?, ?)`;

    const params = [
      data.configKey,
      data.gracePeriodMinutes || 15,
      data.minClockIntervalHours || 6,
      otherSettingsJson
    ];

    const result = await query(sql, params);
    return await SystemConfig.findById(result.insertId);
  }

  async save() {
    const otherSettingsJson = this.otherSettings ? JSON.stringify(this.otherSettings) : null;

    const sql = `UPDATE system_configs SET
      configKey = ?, gracePeriodMinutes = ?, minClockIntervalHours = ?, otherSettings = ?
      WHERE id = ?`;

    const params = [
      this.configKey,
      this.gracePeriodMinutes,
      this.minClockIntervalHours,
      otherSettingsJson,
      this.id
    ];

    await query(sql, params);
    return await SystemConfig.findById(this.id);
  }

  static async findByIdAndUpdate(id, updateData) {
    const config = await SystemConfig.findById(id);
    if (!config) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        config[key] = updateData[key];
      }
    });

    return await config.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM system_configs WHERE id = ?', [id]);
    return true;
  }
}

module.exports = SystemConfig;
