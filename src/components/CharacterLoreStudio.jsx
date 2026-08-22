import React, { useState, useRef } from 'react';
import { 
  Users, Sparkles, Plus, Download, Copy, Check, Trash2, Edit3, Film, 
  Layers, Clock, Shield, Search, ChevronRight, Video, ArrowRight, BookOpen, AlertCircle
} from 'lucide-react';
import { 
  extractCharactersWithAI, 
  generateCharacterIntroSRT, 
  generateCharacterIntroASS, 
  stitchAllFilesToFullMovieSRT,
  msToSrtTime,
  srtTimeToMs
} from '../utils/characterExtractor';

export default function CharacterLoreStudio({ 
  files = [], 
  aiProvider = 'orimise',
  orimiseKey = 'sk-544e5d8289b304b8198e534f18da07085ce0768a95d2ca1b76970a2d8a1d082f',
  orimiseBaseUrl = 'https://api.orimise.com/v1',
  geminiKey = '',
  aiModel = 'gemini-2.5-flash',
  characters = [], 
  setCharacters 
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [copiedText, setCopiedText] = useState(false);
  const [activeTabSub, setActiveTabSub] = useState('characters'); // 'characters' | 'stitching'

  // File filtering and selection for timeline stitching & selective AI scan
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Video Duration Table for Timeline Stitching: { [fileId]: durationInSeconds }
  const [fileDurations, setFileDurations] = useState({});
  const [gapSeconds, setGapSeconds] = useState(0);

  // Edit / Add Character Modal State
  const [editingChar, setEditingChar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const videoInputRef = useRef(null);

  // Filtered files for timeline stitching
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase()));

  // Effective target files for scanning and stitching
  const effectiveTargetFiles = selectedFileIds.length > 0 
    ? files.filter(f => selectedFileIds.includes(f.id)) 
    : (fileSearchQuery ? filteredFiles : files);

  const isAllFilteredSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedFileIds.includes(f.id));
  const someFilteredSelected = filteredFiles.some(f => selectedFileIds.includes(f.id));

  const handleSelectAllFilteredFiles = () => {
    const filteredIdSet = new Set(filteredFiles.map(f => f.id));
    setSelectedFileIds(prev => Array.from(new Set([...prev, ...filteredIdSet])));
  };

  const handleDeselectFilteredFiles = () => {
    const filteredIdSet = new Set(filteredFiles.map(f => f.id));
    setSelectedFileIds(prev => prev.filter(id => !filteredIdSet.has(id)));
  };

  const toggleSelectFile = (fileId, e) => {
    e?.stopPropagation();
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  // Handle AI Scan
  const handleScanCharacters = async () => {
    const effectiveKey = aiProvider === 'orimise'
      ? (orimiseKey || 'sk-544e5d8289b304b8198e534f18da07085ce0768a95d2ca1b76970a2d8a1d082f')
      : geminiKey;

    if (!effectiveKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong mục "Cấu Hình AI Gemini" trước khi quét!`);
      return;
    }
    if (!effectiveTargetFiles || effectiveTargetFiles.length === 0) {
      alert('Vui lòng chọn ít nhất 1 file phụ đề SRT để quét!');
      return;
    }

    setIsScanning(true);
    setScanProgress(`AI đang đọc và phân tích cốt truyện từ ${effectiveTargetFiles.length} tập phim...`);

    try {
      const extracted = await extractCharactersWithAI({
        files: effectiveTargetFiles,
        apiKey: effectiveKey,
        aiProvider,
        baseUrl: orimiseBaseUrl,
        model: aiModel
      });

      if (extracted.length === 0) {
        alert('Không tìm thấy nhân vật nào nổi bật trong các file phụ đề.');
      } else {
        setCharacters(prev => {
          // Merge with existing avoiding duplicate names
          const existingNames = new Set(prev.map(c => c.name.toLowerCase().trim()));
          const newUnique = extracted.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
          return [...prev, ...newUnique];
        });
        setScanProgress(`✅ Đã tìm thấy ${extracted.length} nhân vật và mốc thời gian xuất hiện đầu tiên!`);
        setTimeout(() => setScanProgress(''), 4000);
      }
    } catch (err) {
      alert(`Lỗi khi quét nhân vật: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };



  // Handle Video Upload to auto-detect clip durations
  const handleVideoUpload = (e) => {
    const uploadedVideos = Array.from(e.target.files || []);
    if (uploadedVideos.length === 0) return;

    uploadedVideos.forEach(videoFile => {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = URL.createObjectURL(videoFile);
      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(videoElement.src);
        const duration = Math.round(videoElement.duration * 100) / 100;

        // Try to match with loaded SRT files by name
        const cleanVideoName = videoFile.name.replace(/\.[^/.]+$/, "").toLowerCase();
        const matchedFile = files.find(f => {
          const cleanSrtName = f.name.replace(/\.[^/.]+$/, "").toLowerCase();
          return cleanSrtName.includes(cleanVideoName) || cleanVideoName.includes(cleanSrtName);
        });

        if (matchedFile) {
          setFileDurations(prev => ({
            ...prev,
            [matchedFile.id]: duration
          }));
        }
      };
    });

    setScanProgress(`✅ Đã tự động đọc thời lượng thực tế từ ${uploadedVideos.length} video clip!`);
    setTimeout(() => setScanProgress(''), 4000);
  };

  // Toggle Character Enabled
  const toggleCharacter = (id) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  // Delete Character
  const deleteCharacter = (id) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  // Save Character (Add/Edit)
  const saveCharacter = (charData) => {
    if (charData.id) {
      // Update
      setCharacters(prev => prev.map(c => c.id === charData.id ? charData : c));
    } else {
      // Add
      const newChar = {
        ...charData,
        id: `char_${Date.now()}`,
        enabled: true
      };
      setCharacters(prev => [newChar, ...prev]);
    }
    setIsModalOpen(false);
    setEditingChar(null);
  };

  // Export SRT Intro Tags
  const handleExportIntroSRT = (isFullMovie = false) => {
    const srtContent = generateCharacterIntroSRT(characters, effectiveTargetFiles, isFullMovie, fileDurations);
    if (!srtContent) {
      alert('Chưa có nhân vật nào được bật để xuất file chú thích!');
      return;
    }
    downloadTextFile(srtContent, isFullMovie ? `Full_Movie_${effectiveTargetFiles.length}Tap_Character_Tags.srt` : 'Character_Intro_Tags.srt');
  };

  // Export ASS Intro Tags (Stylized Calligraphy)
  const handleExportIntroASS = (isFullMovie = false) => {
    const assContent = generateCharacterIntroASS(characters, effectiveTargetFiles, isFullMovie, fileDurations);
    if (!assContent) {
      alert('Chưa có nhân vật nào được bật để xuất file chú thích!');
      return;
    }
    downloadTextFile(assContent, isFullMovie ? `Full_Movie_${effectiveTargetFiles.length}Tap_Character_Tags.ass` : 'Character_Intro_Tags.ass');
  };

  // Export Full Stitched Movie SRT (Continuous Timeline)
  const handleExportFullStitchedSRT = () => {
    if (!effectiveTargetFiles || effectiveTargetFiles.length === 0) {
      alert('Chưa có tập phim nào được chọn để ghép nối!');
      return;
    }
    const fullSRT = stitchAllFilesToFullMovieSRT(effectiveTargetFiles, fileDurations, gapSeconds);
    downloadTextFile(fullSRT, `Full_Movie_${effectiveTargetFiles.length}Tap_TronBo_Continuous.srt`);
  };

  // Copy Lore to Clipboard for YouTube Community/Description
  const handleCopyLoreForYouTube = () => {
    if (characters.length === 0) return;
    let text = `📜 BẢNG HỒ SƠ NHÂN VẬT & CẢNH GIỚI TU TIÊN:\n\n`;
    characters.forEach((c, idx) => {
      text += `${idx + 1}. 👤 ${c.name} ${c.originalName ? `(${c.originalName})` : ''}\n`;
      text += `   • Thân phận: ${c.role} | Môn phái: ${c.sect}\n`;
      text += `   • Cảnh giới: ${c.realm}\n`;
      if (c.quote) text += `   • Lời thoại: "${c.quote}"\n`;
      text += `   • Xuất hiện tại: Tập ${c.firstFileName || '1'} (${c.firstTimestamp})\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const downloadTextFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered Characters
  const filteredCharacters = characters.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.sect && c.sect.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.realm && c.realm.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterRole === 'all') return matchesSearch;
    if (filterRole === 'main') return matchesSearch && (c.role.toLowerCase().includes('chính') || c.role.toLowerCase().includes('nữ chính'));
    if (filterRole === 'antagonist') return matchesSearch && (c.role.toLowerCase().includes('phản') || c.role.toLowerCase().includes('ma'));
    return matchesSearch;
  });

  const targetLabel = selectedFileIds.length > 0
    ? `${selectedFileIds.length} Tập Đang Chọn`
    : (fileSearchQuery ? `${filteredFiles.length} Tập Đang Lọc ("${fileSearchQuery}")` : `Tất Cả ${files.length} Tập`);

  return (
    <div className="character-lore-studio card-panel fade-in">
      {/* Header Banner */}
      <div className="section-header flex-between">
        <div className="flex-center gap-2">
          <Users className="text-cyan" size={24} />
          <div>
            <h2 className="section-title">HỒ SƠ NHÂN VẬT & CHÚ THÍCH PHỤ ĐỀ SRT</h2>
            <p className="section-desc">AI tự động quét mốc xuất hiện của nhân vật, trích xuất cảnh giới, môn phái & tạo file thẻ chú thích riêng cho CapCut / Premiere</p>
          </div>
        </div>

        <div className="header-actions flex-center gap-2">
          <button
            className="btn btn-purple btn-glow font-bold flex-center gap-1"
            onClick={handleScanCharacters}
            disabled={isScanning}
            title={`AI tự động phân tích ${effectiveTargetFiles.length} tập phim đang chọn`}
          >
            <Sparkles size={16} className={isScanning ? 'spinner' : ''} />
            <span>{isScanning ? 'Đang Quét Nhân Vật...' : `🧠 AI Quét Nhân Vật (${effectiveTargetFiles.length} Tập)`}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm flex-center gap-1"
            onClick={() => {
              setEditingChar({
                name: '',
                originalName: '',
                role: 'Nhân vật phụ',
                sect: 'Vô Môn Phái',
                realm: 'Luyện Khí',
                firstFileName: files[0]?.name || '',
                firstFileId: files[0]?.id || '',
                firstTimestamp: '00:01:00,000',
                quote: '',
                introTag: ''
              });
              setIsModalOpen(true);
            }}
          >
            <Plus size={15} /> Thêm Nhân Vật
          </button>
        </div>
      </div>

      {scanProgress && (
        <div className="progress-banner mt-2 mb-2">
          <Sparkles size={16} className="text-cyan" />
          <span>{scanProgress}</span>
        </div>
      )}

      {/* Sub Navigation Bar */}
      <div className="sub-nav-bar mt-3 mb-3 flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="flex-center gap-2">
          <button
            className={`tab-pill-btn ${activeTabSub === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTabSub('characters')}
          >
            <Users size={16} /> Danh Sách Nhân Vật ({characters.length})
          </button>

          <button
            className={`tab-pill-btn ${activeTabSub === 'stitching' ? 'active' : ''}`}
            onClick={() => setActiveTabSub('stitching')}
          >
            <Clock size={16} /> ⚡ Ghép Nối Dòng Thời Gian Video Dài ({effectiveTargetFiles.length}/{files.length} Tập)
          </button>
        </div>

        {/* Global Export Buttons */}
        <div className="flex-center gap-2">
          <button
            className="btn btn-secondary btn-sm flex-center gap-1"
            onClick={handleCopyLoreForYouTube}
            title="Copy toàn bộ danh sách nhân vật để đăng YouTube Community hoặc Mô Tả Video"
          >
            {copiedText ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            <span>{copiedText ? 'Đã Copy!' : 'Copy Cho YouTube'}</span>
          </button>

          <button
            className="btn btn-cyan btn-sm font-bold flex-center gap-1"
            onClick={() => handleExportIntroSRT(false)}
            title="Xuất file SRT chứa các thẻ giới thiệu nhân vật để ném vào track trên cùng của CapCut / Premiere"
          >
            <Download size={14} /> Xuất Chú Thích (.SRT)
          </button>

          <button
            className="btn btn-green-glow btn-sm font-bold flex-center gap-1"
            onClick={() => handleExportIntroASS(false)}
            title="Xuất file .ASS có sẵn hiệu ứng font chữ cổ trang phát sáng viền đen siêu ngầu"
          >
            <Download size={14} /> Xuất Chú Thích (.ASS)
          </button>
        </div>
      </div>

      {/* TAB 1: CHARACTER CARDS GRID */}
      {activeTabSub === 'characters' && (
        <div className="character-tab-content">
          {/* Filter Bar */}
          <div className="filter-controls-group mb-3 flex-between">
            <div className="search-box" style={{ maxWidth: '350px' }}>
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="🔍 Tìm tên nhân vật, môn phái, cảnh giới..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="flex-center gap-2">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="input-field select-field input-sm"
              >
                <option value="all">Tất cả vai trò ({characters.length})</option>
                <option value="main">Nhân vật chính / Nữ chính</option>
                <option value="antagonist">Phản diện / Ma đạo</option>
              </select>

              <span className="text-muted text-sm">
                Đang hiển thị: <strong className="highlight-cyan">{filteredCharacters.length}</strong> nhân vật
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="character-grid">
            {filteredCharacters.map(char => (
              <div key={char.id} className={`character-card card-panel ${char.enabled ? 'enabled' : 'disabled'}`}>
                <div className="char-card-header flex-between">
                  <div className="char-title-group">
                    <h3 className="char-name">{char.name}</h3>
                    {char.originalName && <span className="char-original text-muted">({char.originalName})</span>}
                  </div>

                  <div className="char-actions flex-center gap-1">
                    <input
                      type="checkbox"
                      checked={char.enabled !== false}
                      onChange={() => toggleCharacter(char.id)}
                      className="custom-checkbox"
                      title="Bật/Tắt xuất thẻ chú thích cho nhân vật này"
                    />
                    <button
                      className="btn-icon text-muted"
                      onClick={() => {
                        setEditingChar(char);
                        setIsModalOpen(true);
                      }}
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="btn-icon text-red"
                      onClick={() => deleteCharacter(char.id)}
                      title="Xóa nhân vật này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="char-badges-row flex-center gap-1 mt-2 mb-2" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                  <span className="badge badge-role">{char.role}</span>
                  <span className="badge badge-sect">{char.sect}</span>
                  <span className="badge badge-realm">{char.realm}</span>
                </div>

                {char.quote && (
                  <div className="char-quote text-muted mt-1">
                    💬 <em>"{char.quote}"</em>
                  </div>
                )}

                <div className="char-timestamp-row flex-between text-xs text-muted mt-2 pt-2 border-top">
                  <span>📍 Lần đầu: <strong>{char.firstFileName || 'Tập 1'}</strong></span>
                  <span className="highlight-cyan font-mono font-bold">⏱️ {char.firstTimestamp}</span>
                </div>

                {/* Intro Tag Preview Banner */}
                <div className="char-tag-preview mt-2">
                  <span className="tag-preview-label">Thẻ chú thích trên video:</span>
                  <div className="tag-preview-box">
                    {char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCharacters.length === 0 && (
            <div className="empty-state card-panel text-center p-5">
              <Users size={48} className="text-muted mb-2" />
              <h3>Chưa có nhân vật nào trong hồ sơ</h3>
              <p className="text-muted">Nhấn <strong>"🧠 AI Quét Nhân Vật"</strong> để AI tự động đọc kịch bản và lập hồ sơ toàn bộ nhân vật!</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIMELINE STITCHING & CONTINUOUS FULL MOVIE */}
      {activeTabSub === 'stitching' && (
        <div className="stitching-tab-content">
          <div className="alert-box cyan mb-3">
            <Clock size={20} className="text-cyan flex-shrink-0" />
            <div>
              <strong>Ghép Nối Dòng Thời Gian Nối Tiếp Cho Video Dài (Full Movie Seamless Timeline)</strong>
              <p className="text-sm mt-1">
                Tự động tính toán mốc thời gian nối tiếp giữa các tập phim ngắn thành 1 dòng thời gian duy nhất khớp 100% video dài từ 00:00:00 đến 04:00:00!
              </p>
            </div>
          </div>

          {/* 🔍 FILE SEARCH & FILTER TOOLBAR FOR STITCHING */}
          {files.length > 0 && (
            <div className="file-filter-toolbar mb-3">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="🔍 Gõ mã tập muốn lọc / ghép nối (VD: d7, d1, burned...)..."
                  value={fileSearchQuery}
                  onChange={e => setFileSearchQuery(e.target.value)}
                  className="input-field"
                />
                {fileSearchQuery && (
                  <button
                    className="btn-clear-search text-muted"
                    onClick={() => setFileSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="filter-controls-group">
                {filteredFiles.length > 0 && (
                  <button
                    className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                    onClick={handleSelectAllFilteredFiles}
                    title={`Chọn toàn bộ ${filteredFiles.length} tập đang hiển thị`}
                  >
                    <Check size={14} />
                    <span>CHỌN TẤT CẢ {filteredFiles.length} TẬP{fileSearchQuery ? ` ("${fileSearchQuery}")` : ''}</span>
                  </button>
                )}

                {someFilteredSelected && (
                  <button
                    className="btn btn-secondary btn-sm text-muted"
                    onClick={handleDeselectFilteredFiles}
                    title="Bỏ chọn các tập đang lọc"
                  >
                    Bỏ Chọn
                  </button>
                )}

                <div className="filter-counter text-muted flex-center gap-2">
                  <span>Đang hiện: <strong className="highlight-cyan">{filteredFiles.length}</strong> / {files.length} tập</span>
                  {selectedFileIds.length > 0 && (
                    <span className="badge badge-done" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>
                      Đã chọn: <strong className="highlight-cyan font-bold">{selectedFileIds.length}</strong> tập
                    </span>
                  )}
                  {selectedFileIds.length > 0 && (
                    <button
                      className="btn btn-secondary btn-xs text-muted"
                      onClick={() => setSelectedFileIds([])}
                    >
                      Bỏ chọn hết
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Video Clip Duration Detector Controls */}
          <div className="video-detection-bar card-panel flex-between mb-3" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className="flex-center gap-2">
              <Film className="text-cyan" size={20} />
              <div>
                <strong>Tự Động Đọc Thời Lượng Thực Tế Từ File Video MP4:</strong>
                <p className="text-xs text-muted">Kéo thả các file video clip để trình duyệt tự đọc độ dài chính xác từng mili-giây (khớp cả đoạn nhạc nghỉ ở đuôi)</p>
              </div>
            </div>

            <div className="flex-center gap-2">
              <input
                type="file"
                ref={videoInputRef}
                multiple
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleVideoUpload}
              />
              <button
                className="btn btn-secondary btn-sm flex-center gap-1"
                onClick={() => videoInputRef.current?.click()}
              >
                <Video size={15} /> Chọn File Video Clip (.MP4)
              </button>

              <div className="flex-center gap-1 text-sm">
                <span>Khoảng nghỉ đệm (Gap):</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={gapSeconds}
                  onChange={e => setGapSeconds(Number(e.target.value))}
                  className="input-field input-xs font-bold text-center"
                  style={{ width: '55px' }}
                />
                <span>giây</span>
              </div>
            </div>
          </div>

          {/* Episode Sequence Timeline Table */}
          <div className="stitching-table-wrapper card-panel mb-3">
            <table className="stitching-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={isAllFilteredSelected ? handleDeselectFilteredFiles : handleSelectAllFilteredFiles}
                      className="custom-checkbox"
                      title="Chọn/Bỏ chọn tất cả các tập đang lọc"
                    />
                  </th>
                  <th style={{ width: '50px' }}>STT</th>
                  <th>Tên Tập Phim (File SRT)</th>
                  <th style={{ width: '150px' }}>Mốc Bắt Đầu (Video Dài)</th>
                  <th style={{ width: '160px' }}>Thời Lượng Thực Tế (Giây)</th>
                  <th style={{ width: '150px' }}>Mốc Kết Thúc (Video Dài)</th>
                  <th style={{ width: '110px' }}>Số Dòng Thoại</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let cumulativeOffsetMs = 0;
                  return filteredFiles.map((file, idx) => {
                    const isSelected = selectedFileIds.includes(file.id);
                    const fileSubs = file.subtitles || [];
                    const lastSub = fileSubs[fileSubs.length - 1];
                    const defaultSubDurationSec = lastSub ? Math.round(srtTimeToMs(lastSub.endTime) / 1000) : 0;
                    
                    const actualDurationSec = fileDurations[file.id] || defaultSubDurationSec;
                    const startMs = cumulativeOffsetMs;
                    const endMs = startMs + (actualDurationSec * 1000);
                    
                    // If selected or no filter, advance cumulative timeline
                    cumulativeOffsetMs = endMs + (gapSeconds * 1000);

                    return (
                      <tr 
                        key={file.id} 
                        className={isSelected ? 'selected-row' : ''}
                        onClick={() => toggleSelectFile(file.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectFile(file.id, e)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="text-center font-bold">{idx + 1}</td>
                        <td>
                          <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                            <Film size={15} className={isSelected ? 'text-purple' : 'text-cyan'} />
                            <span className="font-bold">{file.name}</span>
                          </div>
                        </td>
                        <td className="font-mono text-cyan font-bold">{msToSrtTime(startMs)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={fileDurations[file.id] || actualDurationSec}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setFileDurations(prev => ({ ...prev, [file.id]: val }));
                              }}
                              className="input-field input-xs font-mono font-bold"
                              style={{ width: '90px' }}
                            />
                            <span className="text-xs text-muted">giây</span>
                          </div>
                        </td>
                        <td className="font-mono text-green font-bold">{msToSrtTime(endMs)}</td>
                        <td className="text-center">{fileSubs.length} dòng</td>
                      </tr>
                    );
                  });
                })()}

                {filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-muted">
                      Không tìm thấy tập phim nào khớp với từ khóa "{fileSearchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Full Movie Actions */}
          <div className="full-movie-actions-card card-panel flex-between p-3" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 className="font-bold text-cyan flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                <Sparkles size={16} /> Thao Tác Ghép Nối Cho: <strong className="highlight-cyan">{targetLabel}</strong>
              </h4>
              <p className="text-xs text-muted mt-1">Dòng thời gian được nối tiếp chuẩn xác 100% từng giây khớp hoàn hảo với video dài trên CapCut / Premiere</p>
            </div>

            <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn-purple btn-glow font-bold flex-center gap-1"
                onClick={handleExportFullStitchedSRT}
                title={`Ghép nối và xuất file SRT thoại dài cho ${effectiveTargetFiles.length} tập`}
              >
                <Download size={16} /> 📥 Xuất Thoại Liền Mạch ({effectiveTargetFiles.length} Tập)
              </button>

              <button
                className="btn btn-cyan btn-glow font-bold flex-center gap-1"
                onClick={() => handleExportIntroSRT(true)}
                title={`Xuất thẻ chú thích nhân vật khớp dòng thời gian video dài của ${effectiveTargetFiles.length} tập`}
              >
                <Download size={16} /> 📥 Xuất Thẻ Chú Thích Video Dài (.SRT)
              </button>

              <button
                className="btn btn-green-glow font-bold flex-center gap-1"
                onClick={() => handleExportIntroASS(true)}
                title={`Xuất thẻ chú thích định dạng .ASS đồ họa cổ trang cho video dài của ${effectiveTargetFiles.length} tập`}
              >
                <Download size={16} /> 📥 Xuất Thẻ Chú Thích Video Dài (.ASS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ADD CHARACTER MODAL */}
      {isModalOpen && editingChar && (
        <div className="modal-backdrop modal-overlay flex-center">
          <div className="modal-content card-panel" style={{ maxWidth: '550px', width: '95%' }}>
            <div className="modal-header flex-between mb-3">
              <h3 className="modal-title flex-center gap-2">
                <Users className="text-cyan" size={20} />
                <span>{editingChar.id ? 'Chỉnh Sửa Nhân Vật' : 'Thêm Nhân Vật Mới'}</span>
              </h3>
              <button className="btn-close text-muted" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="form-group mb-2">
              <label className="form-label">Tên nhân vật (Hán-Việt):</label>
              <input
                type="text"
                value={editingChar.name || ''}
                onChange={e => setEditingChar(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="VD: Tiêu Viêm, Lý Mộ Uyển..."
              />
            </div>

            <div className="grid-2-col gap-2 mb-2">
              <div className="form-group">
                <label className="form-label">Tên gốc chữ Hán:</label>
                <input
                  type="text"
                  value={editingChar.originalName || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, originalName: e.target.value }))}
                  className="input-field"
                  placeholder="VD: 萧炎, 李慕婉..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vai trò / Thân phận:</label>
                <input
                  type="text"
                  value={editingChar.role || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, role: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Nhân vật chính, Nữ chính, Phản diện..."
                />
              </div>
            </div>

            <div className="grid-2-col gap-2 mb-2">
              <div className="form-group">
                <label className="form-label">Tông môn / Gia tộc:</label>
                <input
                  type="text"
                  value={editingChar.sect || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, sect: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Bách Hoa Cốc, Tiêu Gia..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cảnh giới tu luyện:</label>
                <input
                  type="text"
                  value={editingChar.realm || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, realm: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Trúc Cơ sơ kỳ, Kim Đan..."
                />
              </div>
            </div>

            <div className="grid-2-col gap-2 mb-2">
              <div className="form-group">
                <label className="form-label">Xuất hiện tại tập:</label>
                <select
                  value={editingChar.firstFileId || ''}
                  onChange={e => {
                    const selFile = files.find(f => f.id === e.target.value);
                    setEditingChar(prev => ({
                      ...prev,
                      firstFileId: e.target.value,
                      firstFileName: selFile ? selFile.name : ''
                    }));
                  }}
                  className="input-field select-field"
                >
                  {files.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mốc thời gian (00:00:00,000):</label>
                <input
                  type="text"
                  value={editingChar.firstTimestamp || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, firstTimestamp: e.target.value }))}
                  className="input-field font-mono"
                  placeholder="00:03:15,000"
                />
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Mẫu thẻ chú thích hiện trên video:</label>
              <input
                type="text"
                value={editingChar.introTag || ''}
                onChange={e => setEditingChar(prev => ({ ...prev, introTag: e.target.value }))}
                className="input-field font-bold text-cyan"
                placeholder="【 NHÂN VẬT: TIÊU VIÊM | TIÊU GIA | ĐẤU CHI KHÍ TAM ĐOẠN 】"
              />
            </div>

            <div className="modal-footer flex-end gap-2 pt-2 border-top">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
              <button className="btn btn-cyan font-bold" onClick={() => saveCharacter(editingChar)}>Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
