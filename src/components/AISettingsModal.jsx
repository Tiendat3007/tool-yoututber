import React, { useState } from 'react';
import { X, Key, Cpu, Sparkles, ExternalLink, Check, AlertCircle, Server, Zap, Eye, EyeOff } from 'lucide-react';

export default function AISettingsModal({
  isOpen,
  onClose,
  aiProvider,
  setAiProvider,
  orimiseKey,
  setOrimiseKey,
  orimiseBaseUrl,
  setOrimiseBaseUrl,
  geminiKey,
  setGeminiKey,
  aiModel,
  setAiModel,
  concurrency = 4,
  setConcurrency,
  customPrompt,
  setCustomPrompt
}) {
  const [testStatus, setTestStatus] = useState(null);
  const [showOrimiseKey, setShowOrimiseKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);


  if (!isOpen) return null;

  const handleTestKey = async () => {
    setTestStatus({ loading: true, message: 'Đang gửi request kiểm tra kết nối API...' });

    try {
      if (aiProvider === 'orimise') {
        if (!orimiseKey) {
          setTestStatus({ error: true, message: 'Vui lòng nhập Orimise API Key!' });
          return;
        }

        const endpoint = orimiseBaseUrl.endsWith('/chat/completions')
          ? orimiseBaseUrl
          : `${orimiseBaseUrl.replace(/\/$/, '')}/chat/completions`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orimiseKey}`
          },
          body: JSON.stringify({
            model: aiModel || 'gemini-2.5-flash',
            messages: [{ role: 'user', content: 'Say OK' }]
          })
        });

        if (response.ok) {
          setTestStatus({ error: false, message: `API Key ĐÃ HOẠT ĐỘNG HOÀN HẢO! Orimise model "${aiModel}" phản hồi thành công.` });
        } else {
          const err = await response.json().catch(() => ({}));
          setTestStatus({ error: true, message: `Lỗi Orimise API (${response.status}): ${err.error?.message || err.detail || 'Key hoặc endpoint không hợp lệ'}` });
        }
      } else {
        if (!geminiKey) {
          setTestStatus({ error: true, message: 'Vui lòng nhập Google Gemini API Key!' });
          return;
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Trả về chuỗi "OK".' }] }]
            })
          }
        );

        if (response.ok) {
          setTestStatus({ error: false, message: 'Kết nối Google Gemini thành công!' });
        } else {
          const err = await response.json().catch(() => ({}));
          setTestStatus({ error: true, message: `Lỗi Gemini API (${response.status}): ${err.error?.message || 'Key không hợp lệ'}` });
        }
      }
    } catch (error) {
      setTestStatus({ error: true, message: `Kết nối thất bại: ${error.message}` });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content card-panel">
        <div className="modal-header">
          <div className="modal-title">
            <Key className="text-cyan" size={22} />
            <h3>Cấu Hình Nguồn Dịch AI (Orimise API / Gemini)</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-callout">
            <Sparkles className="text-cyan" size={20} />
            <p>
              Tích hợp Orimise API (Hỗ trợ Gemini 2.5/3.6, GPT-5.6, Claude 5...) & Google Gemini cho phép dịch phụ đề SRT tự động đúng chuẩn văn phong Tu Tiên Hán-Việt!
            </p>
          </div>

          {/* Provider Selection */}
          <div className="form-group">
            <label className="form-label">Chọn Nhà Cung Cấp AI (AI Provider):</label>
            <div className="provider-toggle">
              <button
                className={`btn btn-sm ${aiProvider === 'orimise' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => {
                  setAiProvider('orimise');
                  setAiModel('gemini-2.5-flash');
                }}
              >
                <Server size={15} /> Orimise API (Đã Kích Hoạt Key OK)
              </button>
              <button
                className={`btn btn-sm ${aiProvider === 'gemini' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => {
                  setAiProvider('gemini');
                  setAiModel('gemini-2.5-flash');
                }}
              >
                <Cpu size={15} /> Google Gemini Direct
              </button>
            </div>
          </div>

          {aiProvider === 'orimise' ? (
            <>
              <div className="form-group">
                <label className="form-label">
                  <span>Orimise API Key:</span>
                  <a
                    href="https://orimise.com/dashboard/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="link-cyan text-sm"
                  >
                    Orimise Keys Dashboard <ExternalLink size={14} />
                  </a>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showOrimiseKey ? "text" : "password"}
                    className="input-field font-mono text-cyan"
                    style={{ paddingRight: '40px' }}
                    placeholder="sk-..."
                    value={orimiseKey}
                    onChange={e => setOrimiseKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOrimiseKey(!showOrimiseKey)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    title={showOrimiseKey ? "Ẩn Key" : "Hiện Key"}
                  >
                    {showOrimiseKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Orimise Base URL:</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="https://api.orimise.com/v1"
                  value={orimiseBaseUrl}
                  onChange={e => setOrimiseBaseUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô Hình AI Đang Hoạt Động (Orimise Active Models):</label>
                <select
                  className="input-field select-field"
                  value={['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-fable-5', 'gemini-3.6-flash', 'gpt-5.6-sol', 'gpt-5.6-luna', 'claude-opus-5'].includes(aiModel) ? aiModel : 'custom'}
                  onChange={e => {
                    if (e.target.value !== 'custom') {
                      setAiModel(e.target.value);
                    }
                  }}
                >
                  <option value="claude-haiku-4-5-20251001">🔥 claude-haiku-4-5-20251001 (Claude 4.5 Haiku ⭐ KHÔNG PHÍ SÀN, Tiết Kiệm & Dịch Siêu Mượt)</option>
                  <option value="gemini-2.5-flash-lite">⚡ gemini-2.5-flash-lite (Siêu Tiết Kiệm Token & Cực Nhanh)</option>
                  <option value="gemini-2.5-flash">⚡ gemini-2.5-flash (Chuẩn Tu Tiên & Vision Đồ Họa)</option>
                  <option value="claude-fable-5">🎭 claude-fable-5 (Model sáng tạo văn phong & dịch thuật của Orimise)</option>
                  <option value="claude-sonnet-5">🎨 claude-sonnet-5 (Đỉnh cao văn học Anthropic Claude)</option>
                  <option value="gemini-3.6-flash">gemini-3.6-flash (Google Gemini 3.6 Mới nhất)</option>
                  <option value="gpt-5.6-sol">gpt-5.6-sol (Mô hình OpenAI GPT-5.6)</option>
                  <option value="gpt-5.6-luna">gpt-5.6-luna (Mô hình OpenAI GPT-5.6 Luna)</option>
                  <option value="claude-opus-5">claude-opus-5 (Anthropic Claude Opus 5)</option>
                  <option value="custom">⚙️ Tự Nhập Tên Model Khác...</option>
                </select>

                {!['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-fable-5', 'gemini-3.6-flash', 'gpt-5.6-sol', 'gpt-5.6-luna', 'claude-opus-5'].includes(aiModel) && (
                  <div className="mt-2">
                    <label className="text-xs text-muted mb-1 block">Nhập chính xác mã Model từ Orimise:</label>
                    <input
                      type="text"
                      className="input-field font-mono text-cyan input-sm"
                      value={aiModel}
                      onChange={e => setAiModel(e.target.value)}
                      placeholder="VD: claude-haiku-4-5-20251001, claude-fable-5..."
                    />
                  </div>
                )}
              </div>


            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">
                  <span>Google Gemini API Key:</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="link-cyan text-sm"
                  >
                    Google AI Studio <ExternalLink size={14} />
                  </a>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    className="input-field font-mono"
                    style={{ paddingRight: '40px' }}
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    title={showGeminiKey ? "Ẩn Key" : "Hiện Key"}
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>


              <div className="form-group">
                <label className="form-label">Mô Hình Gemini:</label>
                <select
                  className="input-field select-field"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                >
                  <option value="gemini-2.5-flash-lite">⚡ Gemini 2.5 Flash Lite (Siêu Rẻ Token ⭐)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rất nhanh)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>
            </>
          )}


          {/* Turbo Multi-Threading Concurrency Selector */}
          <div className="form-group">
            <label className="form-label font-bold text-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} /> Chế Độ Dịch Đa Luồng Song Song (Worker Threads Pool):
            </label>
            <select
              className="input-field select-field font-bold"
              value={concurrency}
              onChange={e => setConcurrency(Number(e.target.value))}
            >
              <option value={1}>1 Luồng — Tuần tự chuẩn (1 request/lần)</option>
              <option value={2}>2 Luồng — Song song 2x (2 khối cùng lúc)</option>
              <option value={3}>3 Luồng — Song song 3x (3 khối cùng lúc)</option>
              <option value={4}>⚡ 4 Luồng — Turbo 4x Siêu Tốc (Khuyên dùng - Nhanh gấp 400%)</option>
              <option value={5}>5 Luồng — Tốc độ cao 5x (5 khối cùng lúc)</option>
              <option value={6}>🚀 6 Luồng — Ultra 6x Cực Đại (Xử lý 30-50 tập phim siêu tốc)</option>
            </select>
            <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
              Chia nhỏ toàn bộ phụ đề và kích hoạt nhiều tiến trình AI dịch song song cùng lúc, tự động kẹp ngữ cảnh 3 câu trước và tự động thử lại khi gặp lỗi Bad Request.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Tùy Chỉnh System Prompt Tu Tiên:</label>
            <textarea
              className="input-field textarea-field"
              rows={3}
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Để trống nếu muốn sử dụng Prompt Tu Tiên tối ưu mặc định..."
            />
          </div>

          {testStatus && (
            <div className={`status-box ${testStatus.error ? 'error' : testStatus.loading ? 'info' : 'success'}`}>
              {testStatus.error ? <AlertCircle size={18} /> : <Check size={18} />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleTestKey}>
            Kiểm Tra API Key
          </button>
          <button className="btn-cyan btn" onClick={onClose}>
            Lưu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
