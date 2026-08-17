import React, { useState } from 'react';
import { X, Key, Cpu, Sparkles, ExternalLink, Check, AlertCircle, Server, Zap } from 'lucide-react';

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
                <input
                  type="password"
                  className="input-field font-mono text-cyan"
                  placeholder="sk-..."
                  value={orimiseKey}
                  onChange={e => setOrimiseKey(e.target.value)}
                />
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
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                >
                  <option value="gemini-2.5-flash">⚡ gemini-2.5-flash (Khuyên dùng 1 - Siêu nhanh, Chuẩn Tu Tiên)</option>
                  <option value="claude-sonnet-5">🎨 claude-sonnet-5 (Khuyên dùng 2 - Đỉnh cao văn học Anthropic Claude)</option>
                  <option value="gemini-3.6-flash">gemini-3.6-flash (Google Gemini 3.6 Mới nhất)</option>
                  <option value="gpt-5.6-sol">gpt-5.6-sol (Mô hình OpenAI GPT-5.6)</option>
                  <option value="gpt-5.6-luna">gpt-5.6-luna (Mô hình OpenAI GPT-5.6 Luna)</option>
                  <option value="claude-opus-5">claude-opus-5 (Anthropic Claude Opus 5)</option>
                  <option value="claude-haiku-4-5-20251001">claude-4.5-haiku (Lưu ý: Bị Orimise bọc CLI Code - Không nên dùng)</option>
                </select>


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
                <input
                  type="password"
                  className="input-field font-mono"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô Hình Gemini:</label>
                <select
                  className="input-field select-field"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                >
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
              <Zap size={16} /> Chế Độ Dịch Đa Luồng Siêu Tốc (Turbo Worker Pool):
            </label>
            <select
              className="input-field select-field font-bold"
              value={concurrency}
              onChange={e => setConcurrency(Number(e.target.value))}
            >
              <option value={1}>1 Luồng — Tuần tự tiêu chuẩn (Chậm, an toàn)</option>
              <option value={2}>2 Luồng — Song song gấp 2x</option>
              <option value={4}>⚡ 4 Luồng — Turbo 4x Siêu Tốc (Khuyên dùng - Nhanh gấp 400%)</option>
              <option value={6}>🚀 6 Luồng — Ultra 6x Cực Đại (Dành cho bộ phim 50+ tập dài)</option>
            </select>
            <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
              Chia nhỏ toàn bộ phụ đề và kích hoạt nhiều tiến trình AI dịch song song cùng lúc, rút ngắn thời gian dịch từ vài phút xuống còn vài chục giây.
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
