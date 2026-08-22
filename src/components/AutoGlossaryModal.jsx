import React, { useState } from 'react';
import { X, Sparkles, Check, CheckSquare, Square, Plus, BookOpen, Tag, Edit2 } from 'lucide-react';

export default function AutoGlossaryModal({
  isOpen,
  onClose,
  extractedTerms = [],
  onAddTermsToGlossary
}) {
  const [selectedIds, setSelectedIds] = useState(() => extractedTerms.map(t => t.id));
  const [editableTerms, setEditableTerms] = useState(extractedTerms);
  const [activeCategory, setActiveCategory] = useState('all');

  // Sync if extractedTerms changes
  React.useEffect(() => {
    setEditableTerms(extractedTerms);
    setSelectedIds(extractedTerms.map(t => t.id));
  }, [extractedTerms]);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(editableTerms.map(t => t.category || 'Danh xưng & Khác')))];

  const filteredTerms = activeCategory === 'all'
    ? editableTerms
    : editableTerms.filter(t => t.category === activeCategory);

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
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card-panel"
        style={{ maxWidth: '820px', width: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex-center gap-2">
            <Sparkles size={22} className="text-cyan pulse" />
            <h3 className="text-cyan font-bold mb-0">🧠 AI Phát Hiện {editableTerms.length} Thuật Ngữ Mới Trong Phim</h3>
          </div>
          <button className="btn-icon text-muted" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Category Pills & Selection Toolbar */}
        <div className="flex-between flex-wrap gap-2 mb-3">
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
              <CheckSquare size={13} /> Chọn Tất Cả
            </button>
            <button className="btn btn-secondary btn-xs text-muted" onClick={handleDeselectAll}>
              <Square size={13} /> Bỏ Chọn
            </button>
          </div>
        </div>

        {/* Terms Table List */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
          <table className="glossary-table" style={{ width: '100%', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', position: 'sticky', top: 0, zIndex: 2 }}>
                <th style={{ width: '40px', textAlign: 'center', padding: '8px 4px' }}>Chọn</th>
                <th style={{ width: '150px', padding: '8px' }}>Tiếng Trung (ZH)</th>
                <th style={{ padding: '8px' }}>Dịch Hán Việt (VI)</th>
                <th style={{ width: '140px', padding: '8px' }}>Phân Loại</th>
                <th style={{ width: '180px', padding: '8px' }}>Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerms.map(term => {
                const isSelected = selectedIds.includes(term.id);
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
                        className="input-field input-xs font-bold text-amber"
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
                      <span className="badge badge-pending" style={{ fontSize: '0.75rem', padding: '2px 6px', display: 'inline-block' }}>
                        {term.category}
                      </span>
                    </td>
                    <td className="text-muted text-xs">
                      {term.meaning || 'Thuật ngữ xuất hiện trong phim'}
                    </td>
                  </tr>
                );
              })}
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
              <Plus size={16} /> Thêm {selectedIds.length} Thuật Ngữ Vào Từ Điển
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
