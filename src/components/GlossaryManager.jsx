import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, Search, Download, Upload, RefreshCw, BookOpen, ShieldCheck, HelpCircle, Sparkles } from 'lucide-react';
import { DEFAULT_GLOSSARY } from '../data/defaultGlossary';

export default function GlossaryManager({
  glossary,
  setGlossary,
  onExtractGlossary,
  isExtractingGlossary,
  extractedGlossaryTerms = [],
  onOpenScannedGlossary
}) {


  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editZh, setEditZh] = useState('');
  const [editVi, setEditVi] = useState('');
  const [editUsage, setEditUsage] = useState('');

  // New term state
  const [newZh, setNewZh] = useState('');
  const [newVi, setNewVi] = useState('');
  const [newUsage, setNewUsage] = useState('');
  const [newCategory, setNewCategory] = useState('canh_gioi');

  const categories = [
    { id: 'all', label: 'Tất cả từ vựng' },
    { id: 'canh_gioi', label: 'Cảnh Giới' },
    { id: 'xung_ho', label: 'Xưng Hô' },
    { id: 'thuat_ngu', label: 'Thuật Ngữ & Khẩu Khí' },
    { id: 'vat_pham', label: 'Vật Phẩm & Đan Dược' },
  ];

  const filteredGlossary = glossary.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.zh.toLowerCase().includes(q) ||
      item.vi.toLowerCase().includes(q) ||
      (item.usage && item.usage.toLowerCase().includes(q));
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleAddTerm = (e) => {
    e.preventDefault();
    if (!newZh.trim() || !newVi.trim()) return;

    const newItem = {
      id: `custom_${Date.now()}`,
      zh: newZh.trim(),
      vi: newVi.trim(),
      usage: newUsage.trim(),
      category: newCategory,
      enabled: true
    };

    setGlossary([newItem, ...glossary]);
    setNewZh('');
    setNewVi('');
    setNewUsage('');
  };

  const handleToggle = (id) => {
    setGlossary(glossary.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa từ này khỏi từ điển?')) {
      setGlossary(glossary.filter(item => item.id !== id));
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditZh(item.zh);
    setEditVi(item.vi);
    setEditUsage(item.usage || '');
  };

  const saveEdit = (id) => {
    setGlossary(glossary.map(item =>
      item.id === id ? { ...item, zh: editZh, vi: editVi, usage: editUsage } : item
    ));
    setEditingId(null);
  };

  const resetToDefault = () => {
    if (window.confirm('Khôi phục toàn bộ từ điển Tu Tiên Master Script chuẩn về mặc định?')) {
      setGlossary(DEFAULT_GLOSSARY);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(glossary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tu_tien_glossary_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        let parsedList = [];

        if (Array.isArray(imported)) {
          parsedList = imported;
        } else if (typeof imported === 'object' && imported !== null) {
          // Parse Key-Value or Key-Object JSON dictionary: { "师尊": { "translation": "Sư tôn", "usage": "..." } }
          parsedList = Object.entries(imported).map(([zh, val], idx) => {
            if (typeof val === 'object' && val !== null) {
              return {
                id: `import_${Date.now()}_${idx}`,
                zh: zh.trim(),
                vi: (val.translation || val.vi || val.text || '').trim(),
                usage: (val.usage || val.note || '').trim(),
                category: val.category || 'thuat_ngu',
                enabled: true
              };
            } else if (typeof val === 'string') {
              return {
                id: `import_${Date.now()}_${idx}`,
                zh: zh.trim(),
                vi: val.trim(),
                usage: '',
                category: 'thuat_ngu',
                enabled: true
              };
            }
            return null;
          }).filter(Boolean);
        }

        if (parsedList.length > 0) {
          setGlossary(parsedList);
          alert(`Đã nhập thành công ${parsedList.length} thuật ngữ vào từ điển Tu Tiên!`);
        } else {
          alert('Không tìm thấy thuật ngữ nào trong file JSON.');
        }
      } catch (err) {
        alert(`Lỗi đọc file JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="glossary-container card-panel">
      <div className="section-header">
        <div className="section-title">
          <BookOpen className="text-cyan" />
          <h2>Từ Điển Hán-Việt Tu Tiên Master ({glossary.length} thuật ngữ)</h2>
        </div>
        <div className="action-row flex-center flex-wrap gap-2">
          {onExtractGlossary && (
            <button
              className="btn btn-cyan btn-sm font-bold btn-glow flex-center gap-1"
              onClick={onExtractGlossary}
              disabled={isExtractingGlossary}
              title="AI tự động quét toàn bộ phụ đề các tập phim đang nạp để tìm ra nhân vật, môn phái, đan dược mới chưa có trong từ điển"
            >
              <Sparkles size={15} className={isExtractingGlossary ? 'spinner' : ''} />
              <span>{isExtractingGlossary ? 'Đang Quét Phim...' : '🧠 AI Quét Phim Tìm Thuật Ngữ Mới'}</span>
            </button>
          )}

          {onOpenScannedGlossary && (
            <button
              className={`btn btn-sm font-bold flex-center gap-1 ${extractedGlossaryTerms && extractedGlossaryTerms.length > 0 ? 'btn-purple-glow' : 'btn-secondary text-cyan'}`}
              onClick={onOpenScannedGlossary}
              title={`Mở danh sách ${extractedGlossaryTerms ? extractedGlossaryTerms.length : 0} thuật ngữ đã quét từ bộ phim`}
            >
              <BookOpen size={15} />
              <span>📖 Xem Thuật Ngữ Đã Quét ({extractedGlossaryTerms ? extractedGlossaryTerms.length : 0})</span>
            </button>
          )}


          <button className="btn btn-secondary btn-sm" onClick={resetToDefault}>
            <RefreshCw size={15} /> Khôi Phục Mặc Định ({DEFAULT_GLOSSARY.length} Từ)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportJSON}>
            <Download size={15} /> Xuất JSON
          </button>
          <label className="btn btn-secondary btn-sm custom-file-upload">
            <Upload size={15} /> Nhập JSON
            <input type="file" accept=".json" onChange={importJSON} hidden />
          </label>
        </div>

      </div>

      {/* 🧠 Scanned Terms Persistent Banner */}
      {extractedGlossaryTerms && extractedGlossaryTerms.length > 0 && onOpenScannedGlossary && (
        <div
          className="scanned-terms-banner card-panel flex-between flex-wrap gap-2 mb-3"
          style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.35)', padding: '10px 14px' }}
        >
          <div className="flex-center gap-2">
            <Sparkles size={18} className="text-cyan pulse" />
            <div>
              <span className="font-bold text-cyan">Đang lưu giữ {extractedGlossaryTerms.length} thuật ngữ đã quét từ phim: </span>
              <span className="text-xs text-muted">Bạn có thể xem lại, chỉnh sửa hoặc nạp bổ sung vào từ điển bất cứ lúc nào.</span>
            </div>
          </div>
          <button
            className="btn btn-cyan btn-sm font-bold flex-center gap-1"
            onClick={onOpenScannedGlossary}
          >
            <BookOpen size={14} /> Mở Bảng Thuật Ngữ Đã Quét
          </button>
        </div>
      )}


      {/* Add New Term Form */}
      <form onSubmit={handleAddTerm} className="add-term-form">
        <h4>Thêm Thuật Ngữ Mới Vào Từ Điển:</h4>
        <div className="form-grid">
          <input
            type="text"
            placeholder="Từ gốc / Chữ Hán (VD: 筑基 / 师尊)"
            value={newZh}
            onChange={e => setNewZh(e.target.value)}
            className="input-field font-bold font-mono"
            required
          />
          <input
            type="text"
            placeholder="Dịch Hán Việt Tu Tiên chuẩn (VD: Trúc Cơ / Sư tôn)"
            value={newVi}
            onChange={e => setNewVi(e.target.value)}
            className="input-field font-bold text-cyan"
            required
          />
          <input
            type="text"
            placeholder="Ngữ cảnh sử dụng / Ghi chú (VD: Kính xưng trang trọng...)"
            value={newUsage}
            onChange={e => setNewUsage(e.target.value)}
            className="input-field text-muted text-xs"
          />
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="input-field select-field"
          >
            <option value="canh_gioi">Cảnh Giới</option>
            <option value="xung_ho">Xưng Hô</option>
            <option value="thuat_ngu">Thuật Ngữ & Khẩu Khí</option>
            <option value="vat_pham">Vật Phẩm & Đan Dược</option>
          </select>
          <button type="submit" className="btn btn-cyan font-bold">
            <Plus size={16} /> Thêm Vào Từ Điển
          </button>
        </div>
      </form>

      {/* Search and Category Filter */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm chữ Hán, từ Hán Việt hoặc ngữ cảnh sử dụng..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field"
          />
        </div>
        <div className="category-pills">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Glossary List Table */}
      <div className="table-responsive">
        <table className="glossary-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>Dùng</th>
              <th style={{ width: '180px' }}>Từ Gốc (Chữ Hán)</th>
              <th style={{ width: '220px' }}>Dịch Hán Việt Chuẩn</th>
              <th>Ngữ Cảnh & Hướng Dẫn Sử Dụng</th>
              <th style={{ width: '130px' }}>Phân Loại</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredGlossary.map(item => (
              <tr key={item.id} className={!item.enabled ? 'disabled-row' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => handleToggle(item.id)}
                    className="custom-checkbox"
                  />
                </td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editZh}
                      onChange={e => setEditZh(e.target.value)}
                      className="input-field input-sm font-mono"
                    />
                  ) : (
                    <span className="font-mono text-cyan-light font-bold" style={{ fontSize: '1rem' }}>{item.zh}</span>
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editVi}
                      onChange={e => setEditVi(e.target.value)}
                      className="input-field input-sm font-bold text-cyan"
                    />
                  ) : (
                    <span className="highlight-text font-bold" style={{ fontSize: '0.95rem' }}>{item.vi}</span>
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editUsage}
                      onChange={e => setEditUsage(e.target.value)}
                      className="input-field input-sm text-xs"
                      placeholder="Ghi chú ngữ cảnh..."
                    />
                  ) : (
                    <span className="text-xs text-muted" style={{ lineHeight: '1.4', display: 'block' }}>
                      {item.usage || 'Thuật ngữ Tu Tiên cố định'}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge-cat cat-${item.category}`}>
                    {categories.find(c => c.id === item.category)?.label || item.category}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {editingId === item.id ? (
                    <div className="btn-group-sm">
                      <button className="btn-icon text-green" onClick={() => saveEdit(item.id)} title="Lưu">
                        <Check size={16} />
                      </button>
                      <button className="btn-icon text-red" onClick={() => setEditingId(null)} title="Hủy">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="btn-group-sm">
                      <button className="btn-icon text-blue" onClick={() => startEdit(item)} title="Chỉnh sửa">
                        <Edit3 size={16} />
                      </button>
                      <button className="btn-icon text-red" onClick={() => handleDelete(item.id)} title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredGlossary.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  Không tìm thấy thuật ngữ nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
