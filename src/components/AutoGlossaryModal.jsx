import React, { useState } from 'react';
import { X, Sparkles, Check, CheckSquare, Square, Plus, BookOpen, Tag, Edit2, Search, Download, Trash2, Copy } from 'lucide-react';

export default function AutoGlossaryModal({
  isOpen,
  onClose,
  extractedTerms = [],
  existingGlossary = [],
  onAddTermsToGlossary,
  onClearScannedTerms,
  onTriggerExtractGlossary,
  isExtractingGlossary = false
}) {
  const [selectedIds, setSelectedIds] = useState(() => (extractedTerms || []).map(t => t.id));
  const [editableTerms, setEditableTerms] = useState(extractedTerms || []);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync if extractedTerms changes
  React.useEffect(() => {
    setEditableTerms(extractedTerms || []);
    setSelectedIds((extractedTerms || []).map(t => t.id));
  }, [extractedTerms]);

  if (!isOpen) return null;

  const existingZhSet = new Set(
    (existingGlossary || []).map(g => (g.zh || '').trim().toLowerCase())
  );

  const categories = ['all', ...Array.from(new Set(editableTerms.map(t => t.category || 'Danh xưng & Khác')))];

  const filteredTerms = editableTerms.filter(t => {
    const matchesCat = activeCategory === 'all' || t.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      t.zh.toLowerCase().includes(q) ||
      t.vi.toLowerCase().includes(q) ||
      (t.meaning && t.meaning.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredTerms.map(t => t.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleTermChange = (id, field, value) => {
    setEditableTerms(prev =>
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  };

  const handleAddSelected = () => {
    const termsToAdd = editableTerms.filter(t => selectedIds.includes(t.id));
    if (termsToAdd.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 thuật ngữ để thêm vào Từ Điển.');
      return;
    }

    onAddTermsToGlossary(termsToAdd);
    alert(`🎉 Đã thêm thành công ${termsToAdd.length} thuật ngữ mới vào Từ Điển Tu Tiên!`);
  };

  const handleAddSingle = (term) => {
    onAddTermsToGlossary([term]);
    alert(`🎉 Đã thêm "${term.zh} (${term.vi})" vào Từ Điển Tu Tiên!`);
  };

  const handleCopyJSON = () => {
    const dataStr = JSON.stringify(editableTerms, null, 2);
    navigator.clipboard.writeText(dataStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card-panel"
        style={{ maxWidth: '920px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex-center gap-2">
            <Sparkles size={22} className="text-cyan pulse" />
            <h3 className="text-cyan font-bold mb-0">
              📖 Danh Sách Thuật Ngữ Đã Quét ({editableTerms.length} từ)
            </h3>
          </div>
          <div className="flex-center gap-2">
            {editableTerms.length > 0 && (
              <>
                <button
                  className="btn btn-secondary btn-xs flex-center gap-1"
                  onClick={handleCopyJSON}
                  title="Sao chép toàn bộ danh sách dạng JSON"
                >
                  {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  <span>{copied ? 'Đã Copy' : 'Copy JSON'}</span>
                </button>
                {onClearScannedTerms && (
                  <button
                    className="btn btn-secondary btn-xs text-red flex-center gap-1"
                    onClick={() => {
                      if (window.confirm('Xóa sạch danh sách các thuật ngữ đã quét này?')) {
                        onClearScannedTerms();
                      }
                    }}
                    title="Xóa danh sách lịch sử quét này"
                  >
                    <Trash2 size={13} /> Xóa Lịch Sử
                  </button>
                )}
              </>
            )}
            <button className="btn-icon text-muted ml-2" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {editableTerms.length === 0 ? (
          /* Empty State */
          <div className="card-panel empty-state-box text-center p-4 my-auto" style={{ border: '1px dashed rgba(6,182,212,0.3)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
            <Sparkles size={48} className="text-cyan pulse mx-auto mb-3" />
            <h4 className="text-cyan font-bold mb-2">Chưa Có Thuật Ngữ Nào Được Quét</h4>
            <p className="text-muted text-sm max-w-md mx-auto mb-4">
              AI sẽ tự động đọc ngữ cảnh phụ đề tiếng Trung của bộ phim để phát hiện tên nhân vật, tông môn, công pháp, cảnh giới, đan dược và pháp bảo mới.
            </p>
            {onTriggerExtractGlossary && (
              <button
                className="btn btn-cyan btn-lg font-bold btn-glow mx-auto flex-center gap-2"
                onClick={onTriggerExtractGlossary}
                disabled={isExtractingGlossary}
              >
                <Sparkles size={18} className={isExtractingGlossary ? 'spinner' : ''} />
                <span>{isExtractingGlossary ? 'Đang Quét Phim Bằng AI...' : '⚡ Bắt Đầu Quét Thuật Ngữ Bộ Phim Ngay'}</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Filter & Search Bar */}
            <div className="flex-between flex-wrap gap-2 mb-3">
              <div className="search-box" style={{ maxWidth: '280px', flex: 1 }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="🔍 Tìm theo tiếng Trung hoặc Hán Việt..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-field input-xs"
                />
                {searchQuery && (
                  <button className="btn-clear-search text-muted" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>

              <div className="flex-center flex-wrap gap-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-xs ${activeCategory === cat ? 'btn-cyan font-bold' : 'btn-secondary text-muted'}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat === 'all' ? `Tất Cả (${editableTerms.length})` : cat}
                  </button>
                ))}
              </div>

              <div className="flex-center gap-2">
                <button className="btn btn-secondary btn-xs" onClick={handleSelectAll}>
                  <CheckSquare size={13} /> Chọn Hết
                </button>
                <button className="btn btn-secondary btn-xs text-muted" onClick={handleDeselectAll}>
                  <Square size={13} /> Bỏ Chọn
                </button>
              </div>
            </div>

            {/* Terms Table List */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
              <table className="glossary-table" style={{ width: '100%', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 2 }}>
                    <th style={{ width: '38px', textAlign: 'center', padding: '8px 4px' }}>Chọn</th>
                    <th style={{ width: '140px', padding: '8px' }}>Chữ Hán (ZH)</th>
                    <th style={{ minWidth: '160px', padding: '8px' }}>Dịch Hán Việt (VI)</th>
                    <th style={{ width: '130px', padding: '8px' }}>Phân Loại</th>
                    <th style={{ minWidth: '150px', padding: '8px' }}>Vai Trò / Ý Nghĩa</th>
                    <th style={{ width: '120px', textAlign: 'center', padding: '8px' }}>Trạng Thái</th>
                    <th style={{ width: '70px', textAlign: 'center', padding: '8px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTerms.map(term => {
                    const isSelected = selectedIds.includes(term.id);
                    const isAlreadyInGlossary = existingZhSet.has(term.zh.trim().toLowerCase());

                    return (
                      <tr
                        key={term.id}
                        style={{
                          background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(term.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input-field input-xs font-bold text-amber font-mono"
                            value={term.zh}
                            onChange={e => handleTermChange(term.id, 'zh', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input-field input-xs font-bold text-cyan"
                            value={term.vi}
                            onChange={e => handleTermChange(term.id, 'vi', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <span className="badge badge-pending" style={{ fontSize: '0.72rem', padding: '2px 6px', display: 'inline-block' }}>
                            {term.category}
                          </span>
                        </td>
                        <td className="text-muted text-xs">
                          {term.meaning || 'Thuật ngữ phát hiện trong phim'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isAlreadyInGlossary ? (
                            <span className="badge badge-done" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                              ✓ Đã Có
                            </span>
                          ) : (
                            <span className="badge badge-pending text-cyan" style={{ fontSize: '0.72rem', padding: '2px 6px', borderColor: 'rgba(6,182,212,0.4)' }}>
                              ➕ Mới
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {!isAlreadyInGlossary ? (
                            <button
                              className="btn btn-green-glow btn-xs"
                              onClick={() => handleAddSingle(term)}
                              title="Thêm từ này vào Từ Điển ngay"
                              style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                            >
                              + Thêm
                            </button>
                          ) : (
                            <span className="text-emerald text-xs font-bold">Đã có</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTerms.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                        Không tìm thấy thuật ngữ nào khớp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="modal-footer flex-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="text-sm text-muted">
                Đã chọn: <strong className="highlight-cyan">{selectedIds.length}</strong> / {editableTerms.length} thuật ngữ
              </div>

              <div className="flex-center gap-2">
                <button className="btn btn-secondary btn-sm" onClick={onClose}>
                  Đóng
                </button>
                <button
                  className="btn btn-cyan btn-sm font-bold btn-glow flex-center gap-1"
                  onClick={handleAddSelected}
                  disabled={selectedIds.length === 0}
                >
                  <Plus size={16} /> Thêm {selectedIds.length} Thuật Ngữ Đã Chọn Vào Từ Điển
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
