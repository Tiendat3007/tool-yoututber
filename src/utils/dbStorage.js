// IndexedDB Persistent Storage for Subtitle Files & App State across Page Reloads (F5)

const DB_NAME = 'TuTienSRTDB';
const STORE_NAME = 'project_state';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function saveProjectStateToDB(files, activeFileId, activeTab = 'editor') {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Prepare serializable file objects for IndexedDB
    const cleanFiles = files.map(f => {
      const item = {
        id: f.id,
        name: f.name,
        subtitles: f.subtitles
      };
      // Chromium browsers support storing FileSystemFileHandle in IndexedDB!
      if (f.fileHandle) {
        item.fileHandle = f.fileHandle;
      }
      return item;
    });

    store.put(cleanFiles, 'files');
    store.put(activeFileId, 'activeFileId');
    if (activeTab) {
      store.put(activeTab, 'activeTab');
    }
  } catch (err) {
    console.warn('Unable to persist project state to IndexedDB:', err);
  }
}

export async function loadProjectStateFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const getVal = (key) => new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    const files = await getVal('files');
    const activeFileId = await getVal('activeFileId');
    const activeTab = await getVal('activeTab');

    return {
      files: Array.isArray(files) ? files : [],
      activeFileId: activeFileId || (Array.isArray(files) && files.length > 0 ? files[0].id : null),
      activeTab: activeTab || 'editor'
    };
  } catch (err) {
    console.warn('Unable to restore project state from IndexedDB:', err);
    return { files: [], activeFileId: null, activeTab: 'editor' };
  }
}

export async function saveYoutuberStudioStateToDB(studioState) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(studioState, 'youtuber_studio_state');
  } catch (err) {
    console.warn('Unable to persist youtuber studio state to IndexedDB:', err);
  }
}

export async function loadYoutuberStudioStateFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const req = store.get('youtuber_studio_state');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Unable to restore youtuber studio state from IndexedDB:', err);
    return null;
  }
}

export async function saveYoutuberHistoryToDB(sessions, activeSessionId) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(sessions, 'youtuber_history_sessions');
    store.put(activeSessionId, 'youtuber_active_session_id');
  } catch (err) {
    console.warn('Unable to persist youtuber history sessions to IndexedDB:', err);
  }
}

export async function loadYoutuberHistoryFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const getVal = (key) => new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    const sessions = await getVal('youtuber_history_sessions');
    const activeSessionId = await getVal('youtuber_active_session_id');

    // Backward compatibility: If no history array yet but old single state exists, migrate it seamlessly
    if (!Array.isArray(sessions) || sessions.length === 0) {
      const oldState = await getVal('youtuber_studio_state');
      if (oldState && oldState.generatedData) {
        const migratedSession = {
          id: `session_legacy_${Date.now()}`,
          title: oldState.generatedData.titles?.[oldState.selectedTitleIndex || 0] || 'Phân Tích Ban Đầu',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
          fileNames: [],
          ...oldState
        };
        return {
          sessions: [migratedSession],
          activeSessionId: migratedSession.id
        };
      }
      return { sessions: [], activeSessionId: null };
    }

    return {
      sessions: Array.isArray(sessions) ? sessions : [],
      activeSessionId: activeSessionId || (sessions.length > 0 ? sessions[0].id : null)
    };
  } catch (err) {
    console.warn('Unable to restore youtuber history sessions from IndexedDB:', err);
    return { sessions: [], activeSessionId: null };
  }
}

