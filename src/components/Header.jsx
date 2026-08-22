import React from 'react';
import { Sparkles, BookOpen, Sliders, FileText, Key, Download, RefreshCw, Layers, Video, Users } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  subtitleCount, 
  onOpenAISettings,
  isBatchProcessing = false,
  isLoreScanning = false
}) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-group">
          <div className="logo-icon-wrapper">
            <Sparkles className="logo-icon text-cyan" />
          </div>
          <div>
            <h1 className="brand-title">
              TU TIÊN <span className="highlight-cyan">SRT SUBTITLE</span> PRO
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

