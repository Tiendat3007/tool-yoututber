import React, { useState, useRef } from 'react';
import {
  Upload, Sparkles, Download, Clock, Search, Replace, Trash2, Plus,
  CheckCircle, Play, FileText, Zap, BookOpen, Layers, Eye, RefreshCw, ArrowRight, EyeOff, FolderPlus, Archive, Save
} from 'lucide-react';
import { parseSRT, generateSRT, generateVTT, shiftSubtitlesTime } from '../utils/srtParser';
import { localTranslateLine, translateBatchWithGemini, translateBatchWithOrimise, translateSubtitlesWithThreadPool } from '../utils/translator';
import { PRONOUN_PRESETS } from '../data/defaultGlossary';
import DiffViewer from './DiffViewer';

export default function SubtitleEditor({
  files = [],
  activeFile,
  subtitles = [],
  setSubtitles,
  onOpenFilesNative,
  onSetFileHandle,
  onAddFiles,
  onAddFolder,
  onAddZip,
  onDropDataTransfer,
  onLoadSampleSeries,
  glossary,
  aiProvider = 'orimise',
  orimiseKey,
  orimiseBaseUrl,
  geminiKey,
  aiModel,
  concurrency = 4,
  setConcurrency,
  customPrompt,
  setCustomPrompt,
  activePresetId,
  showDiffLog,
  setShowDiffLog
}) {


  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Search & Replace modal / toolbar state
  const [showReplaceTool, setShowReplaceTool] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [useRegex, setUseRegex] = useState(false);

  // Time shift state
  const [showTimeShift, setShowTimeShift] = useState(false);
  const [shiftSeconds, setShiftSeconds] = useState(0);

  // Translation progress state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Handle Multi-file & Folder Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer) {
      onDropDataTransfer(e.dataTransfer);
    }
  };

  // Selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(subtitles.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Line edits
  const handleTextChange = (id, newText) => {
    setSubtitles(subtitles.map(s => {
      if (s.id === id) {
        return {
          ...s,
          previousText: s.translatedText,
          translatedText: newText,
          status: 'edited'
        };
      }
      return s;
    }));
  };

  const handleTranslateSingleLine = (id) => {
    const activeRules = PRONOUN_PRESETS.find(p => p.id === activePresetId)?.rules || [];
    setSubtitles(subtitles.map(s => {
      if (s.id === id) {
        const translated = localTranslateLine(s.originalText, glossary, activeRules);
        return {
          ...s,
          previousText: s.translatedText,
          translatedText: translated,
          status: 'translated'
        };
      }
      return s;
    }));
  };

  // 1-Click Glossary Replace on selected or all lines
  const handleApplyGlossaryBatch = () => {
    const targetIds = selectedIds.length > 0 ? selectedIds : subtitles.map(s => s.id);
    const activeRules = PRONOUN_PRESETS.find(p => p.id === activePresetId)?.rules || [];

    setSubtitles(subtitles.map(s => {
      if (targetIds.includes(s.id)) {
        const translated = localTranslateLine(s.originalText, glossary, activeRules);
        return {
          ...s,
          previousText: s.translatedText,
          translatedText: translated,
          status: 'translated'
        };
      }
      return s;
    }));
  };

  // AI Translate Batch with Turbo Multi-Threading Pool
  const handleAIBatchTranslate = async () => {
    const isOrimise = aiProvider === 'orimise';
    const activeKey = isOrimise ? orimiseKey : geminiKey;

    if (!activeKey) {
      alert(`Vui lòng nhập ${isOrimise ? 'Orimise' : 'Google Gemini'} API Key trong menu Cấu hình AI!`);
      return;
    }

    const targetSubtitles = selectedIds.length > 0
      ? subtitles.filter(s => selectedIds.includes(s.id))
      : subtitles;

    if (targetSubtitles.length === 0) return;

    setIsTranslating(true);
    const providerName = isOrimise ? `Orimise (${aiModel})` : `Gemini (${aiModel})`;
    setTranslationProgress(`⚡ Đang khởi chạy ${concurrency} luồng Turbo dịch ${targetSubtitles.length} dòng qua ${providerName}...`);

    try {
      const resultMap = await translateSubtitlesWithThreadPool({
        subtitles: targetSubtitles,
        isOrimise,
        apiKey: activeKey,
        baseUrl: orimiseBaseUrl,
        systemPrompt: customPrompt,
        glossary,
        model: aiModel,
        batchSize: 25,
        concurrency: concurrency,
        onProgress: (doneChunks, totalChunks, doneLines, total) => {
          setTranslationProgress(
            `⚡ Turbo ${concurrency} Luồng (${providerName}): Đã xong ${doneChunks}/${totalChunks} khối (${Math.round((doneChunks / totalChunks) * 100)}%) — ${doneLines}/${total} dòng...`
          );
        }
      });

      setSubtitles(subtitles.map(sub => {
        if (resultMap.has(sub.index)) {
          return {
            ...sub,
            previousText: sub.translatedText,
            translatedText: resultMap.get(sub.index),
            status: 'translated'
          };
        }
        return sub;
      }));

      setTranslationProgress(`🎉 Dịch AI hoàn tất siêu tốc bằng ${providerName}!`);
      setTimeout(() => setTranslationProgress(''), 3000);
    } catch (err) {
      alert(`Lỗi khi dịch AI: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Search & Replace
  const handleSearchAndReplace = () => {
    if (!findText) return;

    try {
      const regex = useRegex ? new RegExp(findText, 'g') : null;
      let count = 0;

      const updated = subtitles.map(s => {
        let newText = s.translatedText;
        if (useRegex && regex) {
          if (regex.test(newText)) {
            newText = newText.replace(regex, replaceText);
            count++;
          }
        } else {
          if (newText.includes(findText)) {
            newText = newText.split(findText).join(replaceText);
            count++;
          }
        }
        return {
          ...s,
          previousText: s.translatedText,
          translatedText: newText,
          status: 'edited'
        };
      });

      setSubtitles(updated);
      alert(`Đã thay thế thành công ở ${count} dòng trong file hiện tại!`);
    } catch (err) {
      alert(`Lỗi cú pháp Regex: ${err.message}`);
    }
  };

  // Time shift
  const handleApplyTimeShift = () => {
    const offsetMs = parseFloat(shiftSeconds) * 1000;
    if (isNaN(offsetMs) || offsetMs === 0) return;

    setSubtitles(shiftSubtitlesTime(subtitles, offsetMs));
    setShowTimeShift(false);
    alert(`Đã điều chỉnh mốc thời gian phụ đề (${shiftSeconds > 0 ? '+' : ''}${shiftSeconds} giây).`);
  };

  // Direct Overwrite to File on Disk (Remembers file location for silent 1-click save)
  const handleSaveDirectSRT = async () => {
    if (!activeFile) return;

    const srtContent = generateSRT(subtitles, true);
    const cleanFileName = (activeFile.name || 'subtitles.srt').replace(/^.*[\\/]/, '').replace(/ \/ /g, '_');
    const targetFileName = cleanFileName.endsWith('.srt') ? cleanFileName : `${cleanFileName}.srt`;

    // 1. If fileHandle exists from Native File System API, write directly with ZERO Save As dialogs!
    if (activeFile.fileHandle && activeFile.fileHandle.createWritable) {
      try {
        if (activeFile.fileHandle.queryPermission) {
          const hasPerm = (await activeFile.fileHandle.queryPermission({ mode: 'readwrite' })) === 'granted' ||
                          (activeFile.fileHandle.requestPermission && (await activeFile.fileHandle.requestPermission({ mode: 'readwrite' })) === 'granted');
          if (!hasPerm) {
            alert('Quyền ghi vào file bị từ chối.');
            return;
          }
        }
        const writable = await activeFile.fileHandle.createWritable();
        await writable.write(srtContent);
        await writable.close();
        alert(`✅ ĐÃ LƯU TRỰC TIẾP THÀNH CÔNG VÀO FILE GỐC ON DISK:\n"${activeFile.name}"`);
        return;
      } catch (err) {
        console.warn("Direct file handle write failed/cancelled, fallback to Save Picker:", err);
      }
    }


    // 2. Fallback to Native Save File Picker & REMEMBER handle for subsequent 1-click silent saves
    if (window.showSaveFilePicker) {
      try {
        const opts = {
          suggestedName: targetFileName,
          types: [{
            description: 'SubRip Subtitle File (*.srt)',
            accept: { 'text/plain': ['.srt'] }
          }]
        };
        const handle = await window.showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        await writable.write(srtContent);
        await writable.close();

        // PERSIST FILE HANDLE so all future clicks write silently without Save As window!
        activeFile.fileHandle = handle;
        if (onSetFileHandle) {
          onSetFileHandle(activeFile.id, handle);
        }

        alert(`✅ ĐÃ GHI VÀ GHI NHỚ VỊ TRÍ FILE ON DISK:\n"${handle.name}"\n\nTừ bây giờ mỗi lần bấm nút Lưu Trực Tiếp, hệ thống sẽ lưu ngầm tức thì mà không hiện bảng hỏi nữa!`);
      } catch (err) {
        if (err.name !== 'AbortError') {
          alert(`Lỗi khi lưu file: ${err.message}`);
        }
      }
    } else {
      // Browser fallback download
      downloadFile(srtContent, targetFileName, 'text/plain');
    }
  };


  // Export single SRT & VTT (Download)
  const handleExportSRT = () => {
    const content = generateSRT(subtitles, true);
    const fileName = activeFile?.name || 'subtitles_tutien_translated.srt';
    downloadFile(content, fileName, 'text/plain');
  };

  const handleExportVTT = () => {
    const content = generateVTT(subtitles, true);
    const fileName = (activeFile?.name || 'subtitles').replace(/\.srt$/i, '') + '.vtt';
    downloadFile(content, fileName, 'text/plain');
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete line
  const handleDeleteLine = (id) => {
    setSubtitles(subtitles.filter(s => s.id !== id));
  };

  // Add line
  const handleAddLine = () => {
    const newId = `sub_${Date.now()}`;
    const newSub = {
      id: newId,
      index: subtitles.length + 1,
      startTime: '00:00:00,000',
      endTime: '00:00:03,000',
      originalText: 'Dòng phụ đề mới',
      previousText: 'Dòng phụ đề mới',
      translatedText: 'Dòng phụ đề mới',
      status: 'pending'
    };
    setSubtitles([...subtitles, newSub]);
  };

  // Filter & Search
  const filteredSubtitles = subtitles.filter(s => {
    const matchesSearch =
      s.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.translatedText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.index).includes(searchTerm);

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && s.status === filterStatus;
  });

  return (
    <div className="editor-layout">
      {/* Upload Zone / Multi-file Drop Card */}
      {files.length === 0 ? (
        <div
          className={`dropzone-card ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="dropzone-icon">
            <Upload size={48} className="text-cyan pulse" />
          </div>
          <h3>Kéo & Thả Thư Mục Chính (Chứa 50+ Folder con) Hoặc File .ZIP Vào Đây</h3>
          <p className="text-muted">Hệ thống tự động quét đệ quy mọi file .srt trong tất cả thư mục con chỉ trong 1 giây!</p>

          <div className="dropzone-actions">
            <button
              className="btn btn-cyan btn-lg"
              onClick={async () => {
                if (onOpenFolderNative) {
                  const handled = await onOpenFolderNative();
                  if (handled) return;
                }
                folderInputRef.current?.click();
              }}
              title="Quét toàn bộ thư mục và các thư mục con (Tự động liên kết lưu đè đĩa)"
            >
              <FolderPlus size={20} /> Thêm Nguyên Cả Thư Mục (Folder)
            </button>


            <button
              className="btn btn-purple btn-lg"
              onClick={() => zipInputRef.current?.click()}
            >
              <Archive size={20} /> Nạp File .ZIP Chứa Các Tập
            </button>

            <button
              className="btn btn-secondary btn-lg"
              onClick={async () => {
                if (onOpenFilesNative) {
                  const handled = await onOpenFilesNative();
                  if (handled) return;
                }
                fileInputRef.current?.click();
              }}
              title="Chọn các file SRT từ máy tính (Tự động ghi nhớ vị trí file để lưu trực tiếp 1-click)"
            >
              <FileText size={18} /> Chọn Các File SRT
            </button>

          </div>

          <div className="mt-4">
            <button className="btn btn-secondary btn-sm" onClick={onLoadSampleSeries}>
              <Sparkles size={16} className="text-cyan" /> Hoặc Nạp Bộ Phim Mẫu Demo (3 Tập SRT)
            </button>
          </div>

          <input
            type="file"
            ref={folderInputRef}
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => onAddFolder(Array.from(e.target.files))}
            hidden
          />

          <input
            type="file"
            ref={zipInputRef}
            accept=".zip"
            onChange={(e) => e.target.files[0] && onAddZip(e.target.files[0])}
            hidden
          />

          <input
            type="file"
            ref={fileInputRef}
            accept=".srt"
            multiple
            onChange={(e) => onAddFiles(Array.from(e.target.files))}
            hidden
          />
        </div>
      ) : (
        <>
          {/* Main Toolbar */}
          <div className="toolbar-panel card-panel">
            {/* 💡 Inline Custom AI Translation Prompt for Current File */}
            <div className="prompt-inline-action-bar purple mb-2" style={{ width: '100%' }}>
              <Sparkles size={15} className="text-purple" />
              <input
                type="text"
                className="prompt-inline-input"
                placeholder="💡 Nhập prompt yêu cầu dịch AI cho file này (VD: Sư tôn - Đồ nhi, dịch sát nghĩa câu thoại ngắn, phong cách đô thị hào môn...)..."
                value={customPrompt || ''}
                onChange={e => setCustomPrompt && setCustomPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAIBatchTranslate()}
              />
              {customPrompt && (
                <button
                  type="button"
                  className="btn-icon text-muted"
                  onClick={() => setCustomPrompt && setCustomPrompt('')}
                  title="Xóa prompt dịch"
                  style={{ padding: '0 4px', fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="toolbar-group">

              <button
                className="btn btn-cyan btn-sm"
                onClick={handleApplyGlossaryBatch}
                title="Dịch thay thế tự động theo Từ Điển Tu Tiên"
              >
                <BookOpen size={16} /> Dịch Từ Điển File Hiện Tại ({selectedIds.length > 0 ? selectedIds.length : 'Tất cả'})
              </button>

              {setConcurrency && (
                <div className="select-with-icon select-concurrency" title="Chọn số luồng AI dịch song song cùng lúc">
                  <Zap size={14} className="text-cyan" />
                  <select
                    value={concurrency}
                    onChange={e => setConcurrency(Number(e.target.value))}
                    className="input-field select-field input-sm font-bold text-cyan"
                    style={{ background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.35)', minWidth: '125px' }}
                  >
                    <option value={1}>1 Luồng</option>
                    <option value={2}>2 Luồng (2x)</option>
                    <option value={3}>3 Luồng (3x)</option>
                    <option value={4}>⚡ 4 Luồng (Turbo)</option>
                    <option value={5}>5 Luồng (5x)</option>
                    <option value={6}>🚀 6 Luồng (Ultra)</option>
                  </select>
                </div>
              )}

              <button
                className="btn btn-purple btn-sm font-bold"
                onClick={handleAIBatchTranslate}
                disabled={isTranslating}
                title={`Dịch file hiện tại bằng AI ${aiProvider === 'orimise' ? `Orimise (${aiModel})` : `Gemini (${aiModel})`}`}
              >
                <Sparkles size={16} /> Dịch AI File Này ({concurrency} Luồng)
              </button>

              {/* Red/Green Diff Toggle Button */}
              <button
                className={`btn btn-sm ${showDiffLog ? 'btn-green-glow' : 'btn-secondary'}`}
                onClick={() => setShowDiffLog(!showDiffLog)}
                title="Bật/Tắt chế độ theo dõi lịch sử thay đổi (Đỏ = Cũ, Xanh = Mới)"
              >
                {showDiffLog ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>{showDiffLog ? 'Ẩn Diff Đỏ/Xanh' : 'Xem Diff Đỏ/Xanh'}</span>
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowReplaceTool(!showReplaceTool)}
              >
                <Replace size={16} /> Tìm & Thay Thế
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowTimeShift(!showTimeShift)}
              >
                <Clock size={16} /> Lệch Giờ (Shift Time)
              </button>

              <button className="btn btn-secondary btn-sm" onClick={handleAddLine}>
                <Plus size={16} /> Thêm Dòng
              </button>
            </div>

            <div className="toolbar-group">
              {/* Direct Save Overwrite Button */}
              <button
                className="btn btn-cyan btn-sm font-bold"
                onClick={handleSaveDirectSRT}
                title="Ghi trực tiếp nội dung đã sửa đè thẳng vào file SRT gốc trên ổ đĩa máy tính (Không tạo file tải về mới)"
              >
                <Save size={16} /> 💾 Lưu Trực Tiếp Vào File SRT Gốc
              </button>

              <button className="btn btn-green btn-sm" onClick={handleExportSRT} title="Tải về file SRT mới">
                <Download size={16} /> Tải Về SRT
              </button>
              <button className="btn btn-green btn-sm" onClick={handleExportVTT} title="Tải về file VTT mới">
                <Download size={16} /> Xuất VTT
              </button>
            </div>
          </div>

          {/* Time Shift Tool Panel */}
          {showTimeShift && (
            <div className="tool-box card-panel">
              <div className="tool-box-header">
                <Clock className="text-cyan" size={18} />
                <h4>Điều Chỉnh Lệch Giờ Phụ Đề (Time Offset)</h4>
              </div>
              <div className="tool-box-body">
                <span>Nhập số giây offset (Dương để trễ hơn, Âm để sớm hơn):</span>
                <input
                  type="number"
                  step="0.1"
                  value={shiftSeconds}
                  onChange={e => setShiftSeconds(e.target.value)}
                  className="input-field input-sm"
                  style={{ width: '120px' }}
                  placeholder="+1.5 hoặc -0.5"
                />
                <button className="btn btn-cyan btn-sm" onClick={handleApplyTimeShift}>
                  Áp Dụng
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowTimeShift(false)}>
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Search & Replace Tool Panel */}
          {showReplaceTool && (
            <div className="tool-box card-panel">
              <div className="tool-box-header">
                <Replace className="text-cyan" size={18} />
                <h4>Tìm Kiếm & Thay Thế Hàng Loạt Trong File</h4>
              </div>
              <div className="tool-box-body flex-wrap">
                <input
                  type="text"
                  placeholder="Tìm từ/cụm từ (VD: tôi)"
                  value={findText}
                  onChange={e => setFindText(e.target.value)}
                  className="input-field input-sm"
                />
                <ArrowRight size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Thay bằng (VD: ta)"
                  value={replaceText}
                  onChange={e => setReplaceText(e.target.value)}
                  className="input-field input-sm"
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useRegex}
                    onChange={e => setUseRegex(e.target.checked)}
                  />
                  <span>Regex</span>
                </label>
                <button className="btn btn-cyan btn-sm" onClick={handleSearchAndReplace}>
                  Thay Thế Tất Cả
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReplaceTool(false)}>
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Translation Progress Banner */}
          {translationProgress && (
            <div className="progress-banner card-panel">
              <Sparkles size={18} className="text-cyan spinner" />
              <span>{translationProgress}</span>
            </div>
          )}

          {/* Subtitle Table Container */}
          <div className="editor-card card-panel">
            <div className="active-file-banner">
              <FileText className="text-cyan" size={18} />
              <span>Đang chỉnh sửa tập: <strong className="highlight-cyan">{activeFile?.name}</strong></span>
              {showDiffLog && (
                <span className="diff-mode-badge">
                  🔴🟢 Chế độ Lịch sử Thay đổi (Đỏ = Cũ, Xanh = Mới) Đang BẬT
                </span>
              )}
            </div>

            {/* Table Search & Filter Bar */}
            <div className="table-filter-bar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Tìm theo nội dung phụ đề hoặc số ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="filter-group">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="input-field select-field"
                >
                  <option value="all">Tất cả trạng thái ({subtitles.length})</option>
                  <option value="pending">Chưa dịch</option>
                  <option value="translated">Đã dịch</option>
                  <option value="edited">Đã chỉnh sửa</option>
                </select>

                <div className="select-counter">
                  Đã chọn: <span className="highlight-cyan font-bold">{selectedIds.length}</span> dòng
                </div>
              </div>
            </div>

            {/* Subtitles Table */}
            <div className="table-responsive editor-table-wrapper">
              <table className="editor-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === subtitles.length && subtitles.length > 0}
                        onChange={handleSelectAll}
                        className="custom-checkbox"
                      />
                    </th>
                    <th style={{ width: '50px' }}>#</th>
                    <th style={{ width: '180px' }}>Thời Gian</th>
                    <th style={{ width: '32%' }}>Nội Dung Gốc (Gốc Ban Đầu)</th>
                    <th>Nội Dung Dịch / Theo Dõi Thay Đổi (Đỏ - Xanh)</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubtitles.map(sub => {
                    const isSelected = selectedIds.includes(sub.id);
                    const oldContent = sub.previousText || sub.originalText;
                    const hasChanged = oldContent !== sub.translatedText;

                    return (
                      <tr key={sub.id} className={isSelected ? 'selected-row' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(sub.id)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="font-mono text-muted">{sub.index}</td>
                        <td className="font-mono text-sm timestamp-cell">
                          <div>{sub.startTime}</div>
                          <div className="text-muted">&darr;</div>
                          <div>{sub.endTime}</div>
                        </td>
                        <td className="original-cell">
                          <div className="original-text">{sub.originalText}</div>
                        </td>
                        <td className="translated-cell">
                          {/* Live Textarea Input */}
                          <textarea
                            className="subtitle-textarea"
                            value={sub.translatedText}
                            onChange={e => handleTextChange(sub.id, e.target.value)}
                            rows={2}
                          />

                          {/* Red / Green Diff Comparison Block */}
                          {showDiffLog && hasChanged && (
                            <DiffViewer
                              oldText={oldContent}
                              newText={sub.translatedText}
                              titleOld="Gốc/Cũ (Đỏ)"
                              titleNew="Mới (Xanh)"
                            />
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="btn-group-column">
                            <button
                              className="btn-icon text-cyan"
                              onClick={() => handleTranslateSingleLine(sub.id)}
                              title="Dịch dòng này bằng từ điển"
                            >
                              <BookOpen size={16} />
                            </button>
                            <button
                              className="btn-icon text-red"
                              onClick={() => handleDeleteLine(sub.id)}
                              title="Xóa dòng"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubtitles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        Không có dòng phụ đề nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
