import React, { useRef, useState } from 'react';
import { Files, FileText, FolderPlus, Archive, Trash2, Plus, Download, Sparkles, BookOpen, Zap, Search, ArrowUpDown, Filter, Eraser, CheckCircle2, Check, CheckSquare, Square, Layers } from 'lucide-react';

export default function FileListPanel({
  files,
  activeFileId,
  setActiveFileId,
  onOpenFilesNative,
  onOpenFolderNative,
  onAddFiles,
  onAddFolder,
  onAddZip,
  onRemoveFile,
  onRemoveFilteredFiles,
  onKeepOnlyFilteredFiles,
  onRemoveSubGocFiles,
  onRemoveAllFiles,
  onBatchTranslateAI,
  onBatchApplyGlossary,
  onBatchApplyPronouns,
  onBatchSaveDirectAll,
  onExportZip,
  isBatchProcessing,
  batchProgressText,
  concurrency = 4,
  setConcurrency,
  translateBatchSize = 60,
  setTranslateBatchSize,
  customPrompt,
  setCustomPrompt,
  onExtractGlossary,
  isExtractingGlossary,
  extractedGlossaryTerms = [],
  onOpenScannedGlossary
}) {

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('natural');

  // File multi-selection state
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Count how many SubGoc files exist
  const subGocCount = files.filter(f => f.name.toLowerCase().includes('subgoc')).length;

  // Filter files by search term and status
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());

    const translatedCount = file.subtitles.filter(s => s.status === 'translated' || s.status === 'edited').length;
    const isDone = translatedCount === file.subtitles.length && file.subtitles.length > 0;

    if (statusFilter === 'done') return matchesSearch && isDone;
    if (statusFilter === 'pending') return matchesSearch && !isDone;
    return matchesSearch;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortOption === 'natural') {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (sortOption === 'name_asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortOption === 'name_desc') {
      return b.name.localeCompare(a.name);
    }
    if (sortOption === 'lines_desc') {
      return b.subtitles.length - a.subtitles.length;
    }
    return 0;
  });

  // Selection handlers
  const isAllFilteredFilesSelected = sortedFiles.length > 0 && sortedFiles.every(f => selectedFileIds.includes(f.id));
  const someFilteredFilesSelected = sortedFiles.some(f => selectedFileIds.includes(f.id));

  const handleSelectOnlyFilteredFiles = () => {
    const sortedIdSet = new Set(sortedFiles.map(f => f.id));
    setSelectedFileIds(prev => Array.from(new Set([...prev, ...sortedIdSet])));
  };

  const handleDeselectFilteredFiles = () => {
    const sortedIdSet = new Set(sortedFiles.map(f => f.id));
    setSelectedFileIds(prev => prev.filter(id => !sortedIdSet.has(id)));
  };

  const toggleSelectFile = (fileId, e) => {
    e?.stopPropagation();
    if (selectedFileIds.includes(fileId)) {
      setSelectedFileIds(prev => prev.filter(id => id !== fileId));
    } else {
      setSelectedFileIds(prev => [...prev, fileId]);
    }
  };

  const handleBatchDeleteFiltered = () => {
    if (sortedFiles.length === 0) return;
    onRemoveFilteredFiles(sortedFiles.map(f => f.id));
  };

  const handleKeepOnlyFiltered = () => {
    if (sortedFiles.length === 0) return;
    onKeepOnlyFilteredFiles(sortedFiles.map(f => f.id));
  };


  return (
    <div className="file-list-panel card-panel">
      <div className="section-header">
        <div className="section-title">
          <Files className="text-cyan" size={22} />
          <h2>
            Danh Sách Tập Phim SRT ({files.length} file đã nạp)
          </h2>
        </div>

        <div className="action-row">
          {subGocCount > 0 && (
            <button
              className="btn btn-red-glow btn-sm"
              onClick={onRemoveSubGocFiles}
              title="Tự động lọc và xóa sạch toàn bộ các file có chứa từ khóa 'SubGoc' trong 1 click!"
            >
              <Eraser size={15} /> Xóa Sạch {subGocCount} File "SubGoc"
            </button>
          )}

          <button
            className="btn btn-cyan btn-sm"
            onClick={async () => {
              if (onOpenFolderNative) {
                const handled = await onOpenFolderNative();
                if (handled) return;
              }
              folderInputRef.current?.click();
            }}
            title="Quét toàn bộ tất cả file SRT nằm trong thư mục chính và tất cả thư mục con (Tự động ghi nhớ vị trí lưu từng file!)"
          >
            <FolderPlus size={15} /> Thêm Nguyên Cả Thư Mục (Folder)
          </button>
          <input
            type="file"
            ref={folderInputRef}
            webkitdirectory=""
            directory=""
            multiple
            onChange={e => onAddFolder(Array.from(e.target.files))}
            hidden
          />


          <button
            className="btn btn-secondary btn-sm"
            onClick={() => zipInputRef.current?.click()}
            title="Đọc toàn bộ file SRT từ file nén .ZIP"
          >
            <Archive size={15} /> Thêm Từ File .ZIP
          </button>
          <input
            type="file"
            ref={zipInputRef}
            accept=".zip"
            onChange={e => e.target.files[0] && onAddZip(e.target.files[0])}
            hidden
          />

          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              if (onOpenFilesNative) {
                const handled = await onOpenFilesNative();
                if (handled) return;
              }
              fileInputRef.current?.click();
            }}
            title="Chọn các file SRT từ máy tính (Tự động ghi nhớ vị trí file để lưu trực tiếp 1-click)"
          >
            <Plus size={15} /> Chọn File SRT
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".srt"
            multiple
            onChange={e => onAddFiles(Array.from(e.target.files))}
            hidden
          />


          {files.length > 1 && (
            <button
              className="btn btn-secondary btn-sm text-red"
              onClick={onRemoveAllFiles}
            >
              <Trash2 size={15} /> Xóa Tất Cả File
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      {files.length > 0 && (
        <div className="file-filter-toolbar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="🔍 Gõ mã muốn giữ/xóa/chọn (VD: d1, c9, c2, SubGoc...)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field"
            />
            {searchQuery && (
              <button
                className="btn-clear-search text-muted"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-controls-group">
            {/* 🎯 SELECT ALL Filtered Files Button */}
            {sortedFiles.length > 0 && (
              <button
                className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                onClick={handleSelectOnlyFilteredFiles}
                title={`Chọn toàn bộ ${sortedFiles.length} file đang hiển thị${searchQuery ? ` ("${searchQuery}")` : ''} để dịch hoặc thao tác hàng loạt`}
              >
                <Check size={14} />
                <span>CHỌN TẤT CẢ {sortedFiles.length} FILE{searchQuery ? ` ("${searchQuery}")` : ''}</span>
              </button>
            )}

            {someFilteredFilesSelected && (
              <button
                className="btn btn-secondary btn-sm text-muted"
                onClick={handleDeselectFilteredFiles}
                title="Bỏ chọn các file đang lọc"
              >
                Bỏ Chọn
              </button>
            )}

            {/* KEEP ONLY Filtered Files Button */}
            {searchQuery && sortedFiles.length > 0 && (
              <button
                className="btn btn-green-glow btn-sm"
                onClick={handleKeepOnlyFiltered}
                title={`Chỉ giữ lại ${sortedFiles.length} file "${searchQuery}" và xóa toàn bộ các file khác trong 1 click!`}
              >
                <CheckCircle2 size={14} /> CHỈ GIỮ LẠI {sortedFiles.length} File ("{searchQuery}")
              </button>
            )}

            {/* DELETE Filtered Files Button */}
            {searchQuery && sortedFiles.length > 0 && (
              <button
                className="btn btn-red btn-sm"
                onClick={handleBatchDeleteFiltered}
                title={`Xóa toàn bộ ${sortedFiles.length} file đang lọc khớp với từ khóa "${searchQuery}"`}
              >
                <Trash2 size={14} /> Xóa Tất Cả {sortedFiles.length} File ("{searchQuery}")
              </button>
            )}

            <div className="select-with-icon">
              <Filter size={14} className="text-cyan" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-field select-field input-sm"
              >
                <option value="all">Tất cả ({files.length})</option>
                <option value="pending">Chưa dịch</option>
                <option value="done">Đã dịch xong</option>
              </select>
            </div>

            <div className="select-with-icon">
              <ArrowUpDown size={14} className="text-cyan" />
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className="input-field select-field input-sm"
              >
                <option value="natural">Sắp xếp tự nhiên (1, 2, ... 10)</option>
                <option value="name_asc">Tên A &rarr; Z</option>
                <option value="name_desc">Tên Z &rarr; A</option>
                <option value="lines_desc">Số dòng (Nhiều &rarr; Ít)</option>
              </select>
            </div>

            <div className="filter-counter text-muted flex-center gap-2">
              <span>Đang hiện: <strong className="highlight-cyan">{sortedFiles.length}</strong> / {files.length} file</span>
              {selectedFileIds.length > 0 && (
                <span className="badge badge-done" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>
                  Đã chọn: <strong className="highlight-cyan font-bold">{selectedFileIds.length}</strong> file
                </span>
              )}
              {selectedFileIds.length > 0 && (
                <button
                  className="btn btn-secondary btn-xs text-muted"
                  onClick={() => setSelectedFileIds([])}
                  title="Bỏ chọn toàn bộ file"
                >
                  Bỏ chọn hết
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Tabs / Badges Grid */}
      <div className="file-tabs-grid">
        {sortedFiles.map(file => {
          const isActive = file.id === activeFileId;
          const isSelected = selectedFileIds.includes(file.id);
          const translatedCount = file.subtitles.filter(s => s.status === 'translated' || s.status === 'edited').length;
          const isDone = translatedCount === file.subtitles.length && file.subtitles.length > 0;

          return (
            <div
              key={file.id}
              className={`file-tab-card ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isSelected ? 'selected-card' : ''}`}
              onClick={() => setActiveFileId(file.id)}
            >
              <div className="file-tab-header">
                <div className="flex-center gap-2" style={{ overflow: 'hidden', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectFile(file.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="custom-checkbox file-tab-checkbox"
                    title="Tích chọn file này để dịch / lưu / xuất hàng loạt"
                  />
                  <FileText className={isActive ? 'text-cyan' : 'text-muted'} size={18} style={{ flexShrink: 0 }} />
                  <span className="file-tab-name" title={file.name}>{file.name}</span>
                </div>
                <button
                  className="btn-icon btn-close-file text-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  title="Gỡ file này"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="file-tab-footer">
                <span className="file-line-count">
                  {file.subtitles.length} dòng
                </span>
                <span className={`status-badge ${isDone ? 'badge-done' : 'badge-pending'}`}>
                  {translatedCount}/{file.subtitles.length} dòng dịch
                </span>
              </div>
            </div>
          );
        })}

        {sortedFiles.length === 0 && files.length > 0 && (
          <div className="empty-state-filter">
            Không tìm thấy file nào khớp với từ khóa "<span className="highlight-cyan">{searchQuery}</span>".
            <button className="btn btn-secondary btn-sm ml-2" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Batch Processing Controls Bar */}
      {files.length > 0 && (() => {
        const effectiveTargetIds = selectedFileIds.length > 0
          ? selectedFileIds
          : (searchQuery || statusFilter !== 'all' ? sortedFiles.map(f => f.id) : null);
        const effectiveCount = effectiveTargetIds ? effectiveTargetIds.length : files.length;
        const isSubset = Boolean(effectiveTargetIds && effectiveTargetIds.length < files.length);
        const targetLabel = selectedFileIds.length > 0
          ? `${selectedFileIds.length} File Đang Chọn`
          : (searchQuery || statusFilter !== 'all' ? `${sortedFiles.length} File Đang Lọc ("${searchQuery}")` : `Tất Cả ${files.length} File`);

        return (
          <div className="batch-actions-bar">
            <div className="batch-title">
              <Zap className="text-cyan" size={18} />
              <span>Thao Tác Hàng Loạt Cho <strong className="highlight-cyan font-bold">{targetLabel}</strong>:</span>
            </div>

            {/* 💡 Inline Custom AI Translation Prompt for Entire Series */}
            <div className="prompt-inline-action-bar cyan mt-2 mb-2" style={{ width: '100%' }}>
              <Sparkles size={15} className="text-cyan" />
              <input
                type="text"
                className="prompt-inline-input"
                placeholder="💡 Nhập prompt yêu cầu dịch AI cho cả bộ phim (VD: Dịch phong cách Ma Tu hắc ám, Main xưng Ta - gọi Ngươi, dịch hài hước bắt trend, dịch ngắn gọn...)..."
                value={customPrompt || ''}
                onChange={e => setCustomPrompt && setCustomPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onBatchTranslateAI(effectiveTargetIds)}
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

            <div className="batch-btn-group">

              {setConcurrency && (
                <div className="select-with-icon select-concurrency" title="Chọn số luồng AI dịch song song cùng lúc">
                  <Zap size={14} className="text-cyan" />
                  <select
                    value={concurrency}
                    onChange={e => setConcurrency(Number(e.target.value))}
                    className="input-field select-field input-sm font-bold text-cyan"
                    style={{ background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.35)', minWidth: '130px' }}
                  >
                    <option value={1}>1 Luồng (Đơn luồng)</option>
                    <option value={2}>2 Luồng (Song song 2x)</option>
                    <option value={3}>3 Luồng (Song song 3x)</option>
                    <option value={4}>⚡ 4 Luồng (Turbo 4x)</option>
                    <option value={5}>5 Luồng (Song song 5x)</option>
                    <option value={6}>🚀 6 Luồng (Ultra 6x)</option>
                  </select>
                </div>
              )}

              {setTranslateBatchSize && (
                <div className="select-with-icon select-batch-size" title="Số dòng phụ đề gửi trong 1 request AI để tối ưu chi phí và số lượng request">
                  <Layers size={14} className="text-purple" />
                  <select
                    value={translateBatchSize}
                    onChange={e => setTranslateBatchSize(Number(e.target.value))}
                    className="input-field select-field input-sm font-bold text-purple"
                    style={{ background: 'rgba(168, 85, 247, 0.12)', borderColor: 'rgba(168, 85, 247, 0.35)', minWidth: '150px' }}
                  >
                    <option value={30}>30 Dòng / Request</option>
                    <option value={45}>45 Dòng / Request</option>
                    <option value={60}>⭐ 60 Dòng (Khuyên Dùng)</option>
                    <option value={80}>🚀 80 Dòng (Giảm 70% Reqs)</option>
                    <option value={100}>🔥 100 Dòng (Tối Đa)</option>
                  </select>
                </div>
              )}

              <button
                className="btn btn-purple btn-sm font-bold"
                onClick={() => onBatchTranslateAI(effectiveTargetIds)}
                disabled={isBatchProcessing || isExtractingGlossary}
                title={`Dịch ${targetLabel} bằng AI (${concurrency} Luồng, ${translateBatchSize} Dòng/Request)`}
              >
                <Sparkles size={16} /> Dịch AI {targetLabel} ({concurrency} Luồng, {translateBatchSize} dòng/req)
              </button>


              {onExtractGlossary && (
                <button
                  className="btn btn-secondary btn-sm text-cyan font-bold"
                  onClick={() => onExtractGlossary(effectiveTargetIds)}
                  disabled={isBatchProcessing || isExtractingGlossary}
                  title="AI tự động quét các file này để phát hiện nhân vật, môn phái, thuật ngữ mới chưa có trong Từ Điển"
                >
                  <Sparkles size={15} className={isExtractingGlossary ? 'spinner' : 'text-cyan'} />
                  <span>{isExtractingGlossary ? 'Đang Quét Thuật Ngữ...' : `🧠 AI Quét Thuật Ngữ Mới (${effectiveCount} File)`}</span>
                </button>
              )}

              {onOpenScannedGlossary && (
                <button
                  className={`btn btn-sm font-bold ${extractedGlossaryTerms && extractedGlossaryTerms.length > 0 ? 'btn-cyan btn-glow' : 'btn-secondary text-cyan'}`}
                  onClick={onOpenScannedGlossary}
                  title={`Mở danh sách ${extractedGlossaryTerms ? extractedGlossaryTerms.length : 0} thuật ngữ đã được AI quét từ bộ phim`}
                >
                  <BookOpen size={15} />
                  <span>📖 Xem Thuật Ngữ Đã Quét ({extractedGlossaryTerms ? extractedGlossaryTerms.length : 0})</span>
                </button>
              )}

              <button
                className="btn btn-cyan btn-sm"
                onClick={() => onBatchApplyGlossary(effectiveTargetIds)}
                disabled={isBatchProcessing || isExtractingGlossary}
                title={`Áp dụng từ điển Tu Tiên Hán Việt cho ${targetLabel}`}
              >
                <BookOpen size={16} /> Dịch Từ Điển {isSubset ? `${effectiveCount} File` : 'Tất Cả File'}
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onBatchApplyPronouns(effectiveTargetIds)}
                disabled={isBatchProcessing}
                title={`Áp dụng quy tắc xưng hô cho ${targetLabel}`}
              >
                <Zap size={16} /> Đổi Xưng Hô {isSubset ? `${effectiveCount} File` : 'Tất Cả File'}
              </button>

              <button
                className="btn btn-green-glow btn-sm font-bold"
                onClick={() => onBatchSaveDirectAll(effectiveTargetIds)}
                disabled={isBatchProcessing}
                title={`Ghi trực tiếp nội dung đã dịch đè thẳng lên ${targetLabel} trong thư mục gốc trên ổ đĩa máy tính`}
              >
                <CheckCircle2 size={16} /> 💾 Lưu Trực Tiếp {isSubset ? `${effectiveCount} File` : `Tất Cả ${files.length} File`} Về Ổ Đĩa
              </button>

              <button
                className="btn btn-green btn-sm"
                onClick={() => onExportZip(effectiveTargetIds)}
                title={`Đóng gói ${targetLabel} thành file ZIP để tải về`}
              >
                <Download size={16} /> Xuất {isSubset ? `${effectiveCount} File` : `Tất Cả File`} (.ZIP)
              </button>
            </div>

          </div>
        );
      })()}


      {batchProgressText && (
        <div className="progress-banner mt-3">
          <Sparkles size={18} className="text-cyan spinner" />
          <span>{batchProgressText}</span>
        </div>
      )}
    </div>
  );
}
