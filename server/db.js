import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'tiendat',
  database: process.env.DB_NAME || 'tutien_srt_tool',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool = null;

export async function initDatabase() {
  try {
    // 1. Connect without database to ensure database exists
    const rootConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConnection.end();

    // 2. Create Connection Pool for the application
    pool = mysql.createPool(DB_CONFIG);

    // 3. Create tables if they do not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id VARCHAR(120) PRIMARY KEY,
        movie_name VARCHAR(255) DEFAULT '',
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) DEFAULT '',
        type VARCHAR(50) DEFAULT 'character',
        role VARCHAR(100) DEFAULT '',
        sect VARCHAR(255) DEFAULT '',
        realm VARCHAR(255) DEFAULT '',
        first_filename VARCHAR(255) DEFAULT '',
        first_timestamp VARCHAR(50) DEFAULT '00:00:00,000',
        first_end_timestamp VARCHAR(50) DEFAULT '00:00:02,000',
        thumbnail MEDIUMTEXT,
        intro_tag TEXT,
        source VARCHAR(50) DEFAULT 'manual',
        enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_history (
        id VARCHAR(120) PRIMARY KEY,
        time_formatted VARCHAR(100),
        video_name VARCHAR(255),
        video_size VARCHAR(50) DEFAULT '',
        type VARCHAR(50) DEFAULT 'vision',
        count INT DEFAULT 0,
        characters_json LONGTEXT,
        settings_json TEXT,
        tag_duration_sec INT DEFAULT 2,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS glossary_terms (
        id VARCHAR(120) PRIMARY KEY,
        zh VARCHAR(255) NOT NULL,
        vi VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'term',
        context TEXT,
        enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(120) PRIMARY KEY,
        name VARCHAR(255) DEFAULT 'default_project',
        files_json LONGTEXT,
        active_file_id VARCHAR(120),
        active_tab VARCHAR(50) DEFAULT 'editor',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log(`✅ [MySQL] Đã kết nối và khởi tạo Database "${DB_CONFIG.database}" thành công (User: ${DB_CONFIG.user}@${DB_CONFIG.host})!`);
    return true;
  } catch (err) {
    console.error('❌ [MySQL Connection Error]:', err.message);
    return false;
  }
}

export function getPool() {
  return pool;
}
