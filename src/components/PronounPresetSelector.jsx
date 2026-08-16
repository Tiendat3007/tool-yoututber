import React, { useState } from 'react';
import { Layers, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { PRONOUN_PRESETS } from '../data/defaultGlossary';

export default function PronounPresetSelector({ activePresetId, setActivePresetId, onApplyPresetToSubtitles }) {
  const selectedPreset = PRONOUN_PRESETS.find(p => p.id === activePresetId) || PRONOUN_PRESETS[0];

  return (
    <div className="pronoun-container card-panel">
      <div className="section-header">
        <div className="section-title">
          <Layers className="text-cyan" />
          <h2>Chọn Quy Tắc Xưng Hô Tu Tiên Chuyên Biệt</h2>
        </div>
      </div>

      <p className="description-text">
        Xưng hô trong phim/truyện Tu Tiên rất đặc thù theo vai vế và tính cách nhân vật. Chọn quy tắc phù hợp để chuẩn hóa đại từ xưng hô trên toàn bộ file phụ đề SRT:
      </p>

      <div className="preset-grid">
        {PRONOUN_PRESETS.map(preset => {
          const isSelected = preset.id === activePresetId;
          return (
            <div
              key={preset.id}
              className={`preset-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setActivePresetId(preset.id)}
            >
              <div className="preset-header">
                <h3>{preset.name}</h3>
                {isSelected && <CheckCircle2 className="text-cyan" size={20} />}
              </div>
              <p className="preset-desc">{preset.desc}</p>

              <div className="rules-preview">
                <span className="rules-title">Các quy tắc thay thế:</span>
                <ul>
                  {preset.rules.map((rule, i) => (
                    <li key={i}>
                      <code>{rule.from.source}</code> &rarr; <span className="highlight-cyan font-bold">{rule.to}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="apply-preset-box">
        <div className="apply-info">
          <h4>Đang chọn: <span className="highlight-cyan">{selectedPreset.name}</span></h4>
          <p>Nhấn vào nút bên dưới để áp dụng thay thế xưng hô ngay lập tức cho các dòng phụ đề hiện có trong editor!</p>
        </div>
        <button
          className="btn btn-cyan btn-lg"
          onClick={() => onApplyPresetToSubtitles(selectedPreset)}
        >
          <Zap size={18} /> Áp Dụng Xưng Hô Cho Tất Cả Phụ Đề
        </button>
      </div>
    </div>
  );
}
