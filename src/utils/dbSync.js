// Frontend Client Synchronization Service for MySQL Backend with Hybrid Fallback

const API_BASE = 'http://localhost:3001/api';

export async function checkMySQLHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return { connected: true, data };
    }
    return { connected: false };
  } catch (e) {
    return { connected: false };
  }
}

export async function fetchCharactersFromMySQL() {
  try {
    const res = await fetch(`${API_BASE}/characters`);
    if (res.ok) return await res.json();
    return null;
  } catch (e) {
    return null;
  }
}

export async function saveCharactersToMySQL(characters) {
  try {
    const res = await fetch(`${API_BASE}/characters/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characters })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function deleteCharacterFromMySQL(id) {
  try {
    const res = await fetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchScanHistoryFromMySQL() {
  try {
    const res = await fetch(`${API_BASE}/scan-history`);
    if (res.ok) return await res.json();
    return null;
  } catch (e) {
    return null;
  }
}

export async function saveScanSessionToMySQL(session) {
  try {
    const res = await fetch(`${API_BASE}/scan-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function deleteScanSessionFromMySQL(id) {
  try {
    const res = await fetch(`${API_BASE}/scan-history/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function saveProjectToMySQL(files, activeFileId, activeTab = 'editor') {
  try {
    const cleanFiles = (files || []).map(f => ({
      id: f.id,
      name: f.name,
      subtitles: f.subtitles
    }));
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'current_project',
        name: 'Dự án Tu Tiên',
        files: cleanFiles,
        activeFileId,
        activeTab
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function loadProjectFromMySQL() {
  try {
    const res = await fetch(`${API_BASE}/projects/current_project`);
    if (res.ok) return await res.json();
    return null;
  } catch (e) {
    return null;
  }
}
