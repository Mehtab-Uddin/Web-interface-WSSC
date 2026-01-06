const { query } = require('../config/database');

async function addBoundariesColumn() {
  try {
    console.log('Adding boundaries column to locations table...');
    
    // Check if column already exists
    const [columns] = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'locations' 
      AND COLUMN_NAME = 'boundaries'
    `);
    
    if (columns && columns.length > 0) {
      console.log('✓ Boundaries column already exists');
      return;
    }
    
    // Add the column
    await query(`
      ALTER TABLE locations 
      ADD COLUMN boundaries JSON DEFAULT NULL 
      COMMENT 'Polygon coordinates array: [[lng, lat], ...]'
    `);
    
    console.log('✓ Successfully added boundaries column to locations table');
  } catch (error) {
    if (error.message && error.message.includes('Duplicate column name')) {
      console.log('✓ Boundaries column already exists');
    } else {
      console.error('✗ Error adding boundaries column:', error.message);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  addBoundariesColumn()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addBoundariesColumn;

