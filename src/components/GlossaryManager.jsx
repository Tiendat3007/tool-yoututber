import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, Search, Download, Upload, RefreshCw, BookOpen, ShieldCheck } from 'lucide-react';
import { DEFAULT_GLOSSARY } from '../data/defaultGlossary';

export default function GlossaryManager({ glossary, setGlossary }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editZh, setEditZh] = useState('');
  const [editVi, setEditVi] = useState('');

  // New term state
  const [newZh, setNewZh] = useState('');
  const [newVi, setNewVi] = useState('');
  const [newCategory, setNewCategory] = useState('canh_gioi');

  const categories = [
    { id: 'all', label: 'Tất cả từ vựng' },
    { id: 'canh_gioi', label: 'Cảnh Giới' },
    { id: 'xung_ho', label: 'Xưng Hô' },
    { id: 'thuat_ngu', label: 'Thuật Ngữ' },
    { id: 'vat_pham', label: 'Vật Phẩm & Đan Dược' },
  ];

  const filteredGlossary = glossary.filter(item => {
    const matchesSearch =
      item.zh.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vi.toLowerCase().includes(searchTerm.toLowerCase());
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
      category: newCategory,
      enabled: true
    };

    setGlossary([newItem, ...glossary]);
    setNewZh('');
    setNewVi('');
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
  };

  const saveEdit = (id) => {
    setGlossary(glossary.map(item =>
      item.id === id ? { ...item, zh: editZh, vi: editVi } : item
    ));
    setEditingId(null);
  };

  const resetToDefault = () => {
    if (window.confirm('Khôi phục từ điển Tu Tiên về mặc định? Mọi thay đổi tùy chỉnh sẽ bị ghi đè.')) {
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
        if (Array.isArray(imported)) {
          setGlossary(imported);
          alert(`Đã nhập thành công ${imported.length} từ vựng vào từ điển!`);
        }
      } catch (err) {
        alert('File JSON từ điển không hợp lệ.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="glossary-container card-panel">
      <div className="section-header">
        <div className="section-title">
          <BookOpen className="text-cyan" />
          <h2>Từ Điển Hán-Việt Tu Tiên ({glossary.length} từ vựng)</h2>
        </div>
        <div className="action-row">
          <button className="btn btn-secondary btn-sm" onClick={resetToDefault}>
            <RefreshCw size={15} /> Khôi Phục Mặc Định
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

      {/* Add New Term Form */}
      <form onSubmit={handleAddTerm} className="add-term-form">
        <h4>Thêm Từ Mới Vào Từ Điển Tu Tiên:</h4>
        <div className="form-grid">
          <input
            type="text"
            placeholder="Từ gốc / Từ Trung / Tiếng Anh (VD: 筑基 / golden core)"
            value={newZh}
            onChange={e => setNewZh(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="text"
            placeholder="Dịch Hán Việt Tu Tiên chuẩn (VD: Trúc Cơ)"
            value={newVi}
            onChange={e => setNewVi(e.target.value)}
            className="input-field"
            required
          />
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="input-field select-field"
          >
            <option value="canh_gioi">Cảnh Giới</option>
            <option value="xung_ho">Xưng Hô</option>
            <option value="thuat_ngu">Thuật Ngữ</option>
            <option value="vat_pham">Vật Phẩm & Đan Dược</option>
          </select>
          <button type="submit" className="btn btn-cyan">
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
            placeholder="Tìm kiếm từ Hán Việt hoặc từ gốc..."
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
              <th style={{ width: '60px' }}>Dùng</th>
              <th>Từ Gốc / Gốc Tiếng Trung</th>
              <th>Dịch Hán Việt Tu Tiên</th>
              <th>Phân Loại</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Thao Tác</th>
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
                      className="input-field input-sm"
                    />
                  ) : (
                    <span className="font-mono text-cyan-light">{item.zh}</span>
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editVi}
                      onChange={e => setEditVi(e.target.value)}
                      className="input-field input-sm"
                    />
                  ) : (
                    <span className="highlight-text">{item.vi}</span>
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
                <td colSpan={5} className="empty-state">
                  Không tìm thấy từ vựng nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
