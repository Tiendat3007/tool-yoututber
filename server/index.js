import express from 'express';
import cors from 'cors';
import { initDatabase, getPool } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check & MySQL Status Endpoint
app.get('/api/health', async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ status: 'offline', message: 'MySQL chưa kết nối' });
  }
  try {
    const [rows] = await pool.query('SELECT 1 as connected');
    return res.json({ 
      status: 'connected', 
      db: 'tutien_srt_tool',
      user: 'root',
      time: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// ==========================================
// 1. CHARACTER LORE ENDPOINTS
// ==========================================

// Get all characters
app.get('/api/characters', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const [rows] = await pool.query('SELECT * FROM characters ORDER BY created_at DESC');
    const formatted = rows.map(r => ({
      ...r,
      enabled: Boolean(r.enabled),
      movieName: r.movie_name,
      originalName: r.original_name,
      firstFileName: r.first_filename,
      firstTimestamp: r.first_timestamp,
      firstEndTimestamp: r.first_end_timestamp,
      introTag: r.intro_tag
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save or Update Characters (Batch)
app.post('/api/characters/batch', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const characters = req.body.characters || [];
    if (characters.length === 0) return res.json({ success: true, count: 0 });

    for (const c of characters) {
      await pool.query(`
        INSERT INTO characters (
          id, movie_name, name, original_name, type, role, sect, realm, 
          first_filename, first_timestamp, first_end_timestamp, thumbnail, intro_tag, source, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          movie_name = VALUES(movie_name),
          name = VALUES(name),
          original_name = VALUES(original_name),
          type = VALUES(type),
          role = VALUES(role),
          sect = VALUES(sect),
          realm = VALUES(realm),
          first_filename = VALUES(first_filename),
          first_timestamp = VALUES(first_timestamp),
          first_end_timestamp = VALUES(first_end_timestamp),
          thumbnail = VALUES(thumbnail),
          intro_tag = VALUES(intro_tag),
          source = VALUES(source),
          enabled = VALUES(enabled);
      `, [
        c.id || `char_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        c.movieName || c.movie_name || '',
        c.name || 'Nhân vật',
        c.originalName || c.original_name || '',
        c.type || 'character',
        c.role || '',
        c.sect || '',
        c.realm || '',
        c.firstFileName || c.first_filename || '',
        c.firstTimestamp || c.first_timestamp || '00:00:00,000',
        c.firstEndTimestamp || c.first_end_timestamp || '00:00:02,000',
        c.thumbnail || '',
        c.introTag || c.intro_tag || '',
        c.source || 'manual',
        c.enabled !== false ? 1 : 0
      ]);
    }

    res.json({ success: true, count: characters.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Character by ID
app.delete('/api/characters/:id', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    await pool.query('DELETE FROM characters WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear All Characters
app.delete('/api/characters', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    await pool.query('DELETE FROM characters');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. SCAN HISTORY ENDPOINTS
// ==========================================

// Get Scan History
app.get('/api/scan-history', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const [rows] = await pool.query('SELECT * FROM scan_history ORDER BY created_at DESC LIMIT 50');
    const formatted = rows.map(r => ({
      id: r.id,
      timeFormatted: r.time_formatted,
      videoName: r.video_name,
      videoSize: r.video_size,
      type: r.type,
      count: r.count,
      characters: r.characters_json ? JSON.parse(r.characters_json) : [],
      settings: r.settings_json ? JSON.parse(r.settings_json) : {},
      tagDurationSec: r.tag_duration_sec
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Scan History Session
app.post('/api/scan-history', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const s = req.body;
    await pool.query(`
      INSERT INTO scan_history (
        id, time_formatted, video_name, video_size, type, count, characters_json, settings_json, tag_duration_sec
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        time_formatted = VALUES(time_formatted),
        video_name = VALUES(video_name),
        video_size = VALUES(video_size),
        count = VALUES(count),
        characters_json = VALUES(characters_json),
        settings_json = VALUES(settings_json);
    `, [
      s.id || `scan_${Date.now()}`,
      s.timeFormatted || new Date().toLocaleString('vi-VN'),
      s.videoName || 'Session',
      s.videoSize || '',
      s.type || 'vision',
      s.count || 0,
      JSON.stringify(s.characters || []),
      JSON.stringify(s.settings || {}),
      s.tagDurationSec || 2
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete History Session
app.delete('/api/scan-history/:id', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    await pool.query('DELETE FROM scan_history WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. GLOSSARY ENDPOINTS
// ==========================================

// Get Glossary
app.get('/api/glossary', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const [rows] = await pool.query('SELECT * FROM glossary_terms ORDER BY created_at DESC');
    res.json(rows.map(r => ({ ...r, enabled: Boolean(r.enabled) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Glossary Terms Batch
app.post('/api/glossary/batch', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const terms = req.body.terms || [];
    for (const t of terms) {
      await pool.query(`
        INSERT INTO glossary_terms (id, zh, vi, type, context, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          zh = VALUES(zh),
          vi = VALUES(vi),
          type = VALUES(type),
          context = VALUES(context),
          enabled = VALUES(enabled);
      `, [
        t.id || `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        t.zh,
        t.vi,
        t.type || 'term',
        t.context || '',
        t.enabled !== false ? 1 : 0
      ]);
    }
    res.json({ success: true, count: terms.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. PROJECT / SUBTITLES ENDPOINTS
// ==========================================

// Save Project State
app.post('/api/projects', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const { id = 'current_project', name = 'default', files = [], activeFileId, activeTab } = req.body;
    await pool.query(`
      INSERT INTO projects (id, name, files_json, active_file_id, active_tab)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        files_json = VALUES(files_json),
        active_file_id = VALUES(active_file_id),
        active_tab = VALUES(active_tab);
    `, [id, name, JSON.stringify(files), activeFileId, activeTab || 'editor']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load Project State
app.get('/api/projects', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', ['current_project']);
    if (rows.length === 0) return res.json(null);
    const p = rows[0];
    res.json({
      id: p.id,
      name: p.name,
      files: p.files_json ? JSON.parse(p.files_json) : [],
      activeFileId: p.active_file_id,
      activeTab: p.active_tab
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const id = req.params.id || 'current_project';
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (rows.length === 0) return res.json(null);
    const p = rows[0];
    res.json({
      id: p.id,
      name: p.name,
      files: p.files_json ? JSON.parse(p.files_json) : [],
      activeFileId: p.active_file_id,
      activeTab: p.active_tab
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Start Server & Connect Database
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 [Server] Backend REST API đang chạy tại http://localhost:${PORT}`);
  });
}

start();
