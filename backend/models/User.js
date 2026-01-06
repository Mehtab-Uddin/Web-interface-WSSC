const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.username = data.username;
    this.password = data.password;
    this.fullName = data.fullName || '';
    this.role = data.role || 'staff';
    this.department = data.department;
    this.departments = data.departments ? (typeof data.departments === 'string' ? JSON.parse(data.departments) : data.departments) : [];
    this.managerId = data.managerId;
    this.generalManagerId = data.generalManagerId;
    this.empFname = data.empFname;
    this.empDeptt = data.empDeptt;
    this.empJob = data.empJob;
    this.empGrade = data.empGrade;
    this.empCell1 = data.empCell1;
    this.empCell2 = data.empCell2;
    this.empFlg = data.empFlg;
    this.empMarried = data.empMarried;
    this.empGender = data.empGender;
    this.empNo = data.empNo;
    this.empCnic = data.empCnic;
    this.shiftDays = data.shiftDays || 6;
    this.shiftTime = data.shiftTime || 'day';
    this.shiftStartTime = data.shiftStartTime || '09:00';
    this.shiftEndTime = data.shiftEndTime || '17:00';
    this.profilePhotoUrl = data.profilePhotoUrl;
    this.expoPushToken = data.expoPushToken;
    this.pushNotificationsEnabled = data.pushNotificationsEnabled || false;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

// Hash password before saving
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Compare password
  async comparePassword(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
  }

  // Convert to JSON (exclude password)
  toJSON() {
    const obj = { ...this };
  delete obj.password;
  return obj;
  }

  // Static methods for database operations

  static async findById(id) {
    const results = await query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return results.length > 0 ? new User(results[0]) : null;
  }

  static async findOne(conditions) {
    let sql = 'SELECT * FROM users WHERE ';
    const params = [];
    const conditionsArray = [];

    if (conditions.$or) {
      // Handle $or conditions (MongoDB style)
      const orConditions = conditions.$or.map(cond => {
        if (cond.email) {
          conditionsArray.push('(email = ? OR username = ?)');
          params.push(cond.email, cond.email);
        } else if (cond.username) {
          conditionsArray.push('(email = ? OR username = ?)');
          params.push(cond.username, cond.username);
        }
        return null;
      }).filter(Boolean);
      sql += conditionsArray.join(' OR ');
    } else {
      // Handle regular conditions
      Object.keys(conditions).forEach((key, index) => {
        if (index > 0) conditionsArray.push(' AND ');
        conditionsArray.push(`${key} = ?`);
        params.push(conditions[key]);
      });
      sql += conditionsArray.join('');
    }

    const results = await query(sql, params);
    return results.length > 0 ? new User(results[0]) : null;
  }

  static async find(conditions = {}, options = {}) {
    // Handle select fields
    let selectFields = '*';
    if (options.select) {
      const fields = options.select.replace(/^-/, '').split(' ').filter(f => f && f !== '-password');
      if (fields.length > 0) {
        selectFields = fields.join(', ');
      }
      // Always exclude password unless explicitly requested
      if (!options.select.includes('password') && !options.select.includes('+password')) {
        selectFields = selectFields.split(', ').filter(f => f !== 'password').join(', ');
        if (!selectFields.includes('id')) selectFields = 'id, ' + selectFields;
      }
    }

    let sql = `SELECT ${selectFields} FROM users`;
    const params = [];
    const conditionsArray = [];

    // Build WHERE clause
    if (Object.keys(conditions).length > 0) {
      Object.keys(conditions).forEach((key) => {
        if (key === '$or' && Array.isArray(conditions[key])) {
          // Handle $or queries
          const orConditions = [];
          conditions[key].forEach(orCond => {
            Object.keys(orCond).forEach(orKey => {
              const orValue = orCond[orKey];
              // Handle nested $in operator like { empDeptt: { $in: [1, 2, 3] } }
              if (typeof orValue === 'object' && orValue !== null && orValue.$in && Array.isArray(orValue.$in)) {
                const inArray = orValue.$in;
                if (inArray.length > 0) {
                  orConditions.push(`(${orKey} IN (${inArray.map(() => '?').join(', ')}))`);
                  params.push(...inArray);
                }
              } else if (orKey === 'empDeptt' || orKey === 'department') {
                // Handle direct array or single value
                const deptArray = Array.isArray(orValue) ? orValue : [orValue];
                if (deptArray.length > 0) {
                  orConditions.push(`(${orKey} IN (${deptArray.map(() => '?').join(', ')}))`);
                  params.push(...deptArray);
                }
              }
            });
          });
          if (orConditions.length > 0) {
            conditionsArray.push('(' + orConditions.join(' OR ') + ')');
          }
        } else if (key === 'role' && typeof conditions[key] === 'object' && conditions[key].$in) {
          // Handle $in queries
          const roleArray = conditions[key].$in;
          conditionsArray.push(`role IN (${roleArray.map(() => '?').join(', ')})`);
          params.push(...roleArray);
        } else {
          conditionsArray.push(`${key} = ?`);
          params.push(conditions[key]);
        }
      });
      if (conditionsArray.length > 0) {
        sql += ' WHERE ' + conditionsArray.join(' AND ');
      }
    }

    // Handle sorting
    if (options.sort) {
      if (typeof options.sort === 'object') {
        // Handle sort object like { fullName: 1 }
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

    // Handle limit
    if (options.limit) {
      sql += ` LIMIT ${parseInt(options.limit)}`;
    }

    const results = await query(sql, params);
    return results.map(row => new User(row));
  }

  static async create(data) {
    // Hash password if provided
    let password = data.password;
    if (password) {
      password = await User.hashPassword(password);
    }

    // Handle departments array
    const departmentsJson = data.departments ? JSON.stringify(data.departments) : null;

    const sql = `INSERT INTO users (
      email, username, password, fullName, role, department, departments,
      managerId, generalManagerId, empFname, empDeptt, empJob, empGrade,
      empCell1, empCell2, empFlg, empMarried, empGender, empNo, empCnic,
      shiftDays, shiftTime, shiftStartTime, shiftEndTime, profilePhotoUrl,
      expoPushToken, pushNotificationsEnabled, isActive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      data.email.toLowerCase().trim(),
      data.username || data.email.toLowerCase().trim(),
      password,
      data.fullName || '',
      data.role || 'staff',
      data.department || null,
      departmentsJson,
      data.managerId || null,
      data.generalManagerId || null,
      data.empFname || null,
      data.empDeptt || null,
      data.empJob || null,
      data.empGrade || null,
      data.empCell1 || null,
      data.empCell2 || null,
      data.empFlg || null,
      data.empMarried || null,
      data.empGender || null,
      data.empNo || null,
      data.empCnic || null,
      data.shiftDays || 6,
      data.shiftTime || 'day',
      data.shiftStartTime || '09:00',
      data.shiftEndTime || '17:00',
      data.profilePhotoUrl || null,
      data.expoPushToken || null,
      data.pushNotificationsEnabled || false,
      data.isActive !== undefined ? data.isActive : true
    ];

    const result = await query(sql, params);
    return await User.findById(result.insertId);
  }

  async save() {
    // Hash password if modified
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await User.hashPassword(this.password);
    }

    // Handle departments array
    const departmentsJson = this.departments ? JSON.stringify(this.departments) : null;

    const sql = `UPDATE users SET
      email = ?, username = ?, password = ?, fullName = ?, role = ?, department = ?, departments = ?,
      managerId = ?, generalManagerId = ?, empFname = ?, empDeptt = ?, empJob = ?, empGrade = ?,
      empCell1 = ?, empCell2 = ?, empFlg = ?, empMarried = ?, empGender = ?, empNo = ?, empCnic = ?,
      shiftDays = ?, shiftTime = ?, shiftStartTime = ?, shiftEndTime = ?, profilePhotoUrl = ?,
      expoPushToken = ?, pushNotificationsEnabled = ?, isActive = ?
      WHERE id = ?`;

    const params = [
      this.email.toLowerCase().trim(),
      this.username.trim(),
      this.password,
      this.fullName,
      this.role,
      this.department,
      departmentsJson,
      this.managerId,
      this.generalManagerId,
      this.empFname,
      this.empDeptt,
      this.empJob,
      this.empGrade,
      this.empCell1,
      this.empCell2,
      this.empFlg,
      this.empMarried,
      this.empGender,
      this.empNo,
      this.empCnic,
      this.shiftDays,
      this.shiftTime,
      this.shiftStartTime,
      this.shiftEndTime,
      this.profilePhotoUrl,
      this.expoPushToken,
      this.pushNotificationsEnabled,
      this.isActive,
      this.id
    ];

    await query(sql, params);
    return await User.findById(this.id);
  }

  static async countDocuments(conditions = {}) {
    let sql = 'SELECT COUNT(*) as count FROM users';
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

  static async findByIdAndUpdate(id, updateData) {
    const user = await User.findById(id);
    if (!user) return null;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        user[key] = updateData[key];
      }
    });

    return await user.save();
  }

  static async findByIdAndDelete(id) {
    await query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }
}

module.exports = User;
