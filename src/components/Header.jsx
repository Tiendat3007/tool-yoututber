import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Sliders, FileText, Key, Download, RefreshCw, Layers, Video, Users, Database } from 'lucide-react';
import { checkMySQLHealth } from '../utils/dbSync';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  subtitleCount, 
  onOpenAISettings,
  isBatchProcessing = false,
  isLoreScanning = false
}) {
  const [dbStatus, setDbStatus] = useState({ connected: false, checking: true });

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      const res = await checkMySQLHealth();
      if (mounted) {
        setDbStatus({ connected: res.connected, checking: false, data: res.data });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-group">
          <div className="logo-icon-wrapper">
            <Sparkles className="logo-icon text-cyan" />
          </div>
          <div>
            <h1 className="brand-title flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
              <span>TU TIÊN <span className="highlight-cyan">SRT SUBTITLE</span> PRO</span>
              {dbStatus.connected ? (
                <span className="badge badge-green flex-center gap-1 font-mono text-xs" style={{ padding: '2px 8px', border: '1px solid #10b981' }} title="Đã kết nối Database MySQL cục bộ (tutien_srt_tool@localhost:3306)">
                  <Database size={11} className="text-green" /> MySQL: root@3306
                </span>
              ) : (
                <span className="badge badge-secondary flex-center gap-1 font-mono text-xs text-muted" style={{ padding: '2px 8px' }} title="MySQL Offline: Đang lưu trữ ngầm trên IndexedDB / LocalStorage">
                  <Database size={11} /> DB: IndexedDB
                </span>
              )}
            </h1>
            <p className="brand-subtitle">Tool Dịch & Chỉnh Sửa Phụ Đề Tu Tiên • Kiếm Hiệp • Hán Việt</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <FileText size={18} />
            <span>Biên Tập Subtitle</span>
            {isBatchProcessing ? (
              <span className="badge badge-purple flex-center gap-1" style={{ fontSize: '10px', padding: '1px 6px', animation: 'pulse 1.5s infinite' }}>
                <Sparkles size={10} className="spinner" /> Đang dịch
              </span>
            ) : (
              subtitleCount > 0 && <span className="badge-count">{subtitleCount}</span>
            )}
          </button>

          <button
            className={`nav-btn ${activeTab === 'glossary' ? 'active' : ''}`}
            onClick={() => setActiveTab('glossary')}
          >
            <BookOpen size={18} />
            <span>Từ Điển Tu Tiên</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'pronoun' ? 'active' : ''}`}
            onClick={() => setActiveTab('pronoun')}
          >
            <Layers size={18} />
            <span>Quy Tắc Xưng Hô</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'youtuber' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtuber')}
          >
            <Video size={18} className="text-red-accent" />
            <span>Youtuber Studio</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'lore' ? 'active' : ''}`}
            onClick={() => setActiveTab('lore')}
          >
            <Users size={18} className="text-purple" />
            <span>Hồ Sơ Nhân Vật & Chú Thích</span>
            {isLoreScanning && (
              <span className="badge badge-green flex-center gap-1" style={{ fontSize: '10px', padding: '1px 6px', animation: 'pulse 1.5s infinite' }}>
                <RefreshCw size={10} className="spinner text-green" /> Đang quét
              </span>
            )}
          </button>

          <button
            className="nav-btn ai-settings-btn"
            onClick={onOpenAISettings}
          >
            <Key size={18} className="text-cyan" />
            <span>Cấu Hình AI Gemini</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
