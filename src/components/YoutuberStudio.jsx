import React, { useState, useRef } from 'react';
import {
  Video, Sparkles, Copy, Check, Image as ImageIcon, Tag, FileText,
  Play, RefreshCw, Wand2, Type, Flame, Layers, Upload, Trash2, CheckSquare, Square, Download, Palette
} from 'lucide-react';
import { generateYoutubeContent } from '../utils/youtuberGenerator';
import { exportThumbnailHD, generateAIThumbnailImage } from '../utils/thumbnailExporter';
import { uploadReferenceImageToOrimise, generateOrimiseImage } from '../utils/orimiseImageApi';
import { generateFreeAIImage, FREE_IMAGE_MODELS } from '../utils/freeImageApi';






export default function YoutuberStudio({
  files = [],
  activeFile,
  aiProvider,
  orimiseKey,
  orimiseBaseUrl,
  geminiKey,
  aiModel
}) {
  // Multi-file selection state: array of selected file IDs
  const [selectedFileIds, setSelectedFileIds] = useState(() => {
    if (activeFile) return [activeFile.id];
    return files.length > 0 ? [files[0].id] : [];
  });

  const [genre, setGenre] = useState('Tu Tiên / Tiên Hiệp');
  const [contentType, setContentType] = useState('Review Phim / Tóm Tắt Phim');

  // Reference Background Image State for Thumbnail Mockup
  const [referenceBgImage, setReferenceBgImage] = useState(null);
  const [orimiseRefUrl, setOrimiseRefUrl] = useState(null);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [genProgressText, setGenProgressText] = useState('');
  const bgImageInputRef = useRef(null);

  // Generated Content State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);

  // Selected title index
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);

  // 2-Line Text Thumbnail editing state
  const [selectedTextIndex, setSelectedTextIndex] = useState(0);
  const [customLine1, setCustomLine1] = useState('');
  const [customLine2, setCustomLine2] = useState('');

  // Copy status indicators
  const [copiedField, setCopiedField] = useState(null);

  const selectedFilesList = files.filter(f => selectedFileIds.includes(f.id));
  const totalSelectedSubtitles = selectedFilesList.reduce((sum, f) => sum + f.subtitles.length, 0);

  const handleToggleSelectFile = (fileId) => {
    setSelectedFileIds(prev => {
      if (prev.includes(fileId)) {
        // Prevent deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== fileId);
      }
      return [...prev, fileId];
    });
  };

  const handleSelectAllFiles = () => {
    setSelectedFileIds(files.map(f => f.id));
  };

  const handleDeselectAllFiles = () => {
    if (files.length > 0) {
      setSelectedFileIds([files[0].id]);
    }
  };

  // Image Upload Handler for Reference Thumbnail Image (with Orimise API upload support)
  const handleUploadBgImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setReferenceBgImage(evt.target.result);
    };
    reader.readAsDataURL(file);

    // Upload reference file to Orimise API for task image_urls if API key is provided
    if (orimiseKey) {
      try {
        setIsUploadingRef(true);
        const remoteUrl = await uploadReferenceImageToOrimise(file, orimiseKey);
        setOrimiseRefUrl(remoteUrl);
      } catch (err) {
        console.warn('Orimise reference image upload warning:', err);
      } finally {
        setIsUploadingRef(false);
      }
    }
  };

  const displayLine1 = customLine1 || 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ';
  const displayLine2 = customLine2 || 'TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC';

  // Dynamic image prompt combining scene prompt with active 2-line thumbnail text context
  const fullImagePromptEn = generatedData?.imagePromptEn
    ? `${generatedData.imagePromptEn}, featuring dramatic text space framed for 3D overlay text '${displayLine1} - ${displayLine2}'`
    : '';

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Generate 1-Click AI Background Image via Official Orimise API (gpt-image-1)
  const handleGenerateOrimiseBackground = async () => {
    if (!generatedData || !fullImagePromptEn) {
      alert('Vui lòng phân tích kịch bản bằng AI trước!');
      return;
    }

    if (!orimiseKey) {
      alert('Vui lòng nhập Orimise API Key trong Cấu Hình AI!');
      return;
    }

    setIsGeneratingImage(true);
    setGenProgressText('Đang kết nối Orimise API...');

    try {
      const imageUrl = await generateOrimiseImage({
        prompt: fullImagePromptEn,
        imageUrls: orimiseRefUrl ? [orimiseRefUrl] : [],
        apiKey: orimiseKey,
        model: 'gpt-image-1',
        onProgress: (msg) => setGenProgressText(msg)
      });

      setReferenceBgImage(imageUrl);
    } catch (err) {
      alert(`Lỗi Orimise Image API: ${err.message}`);
    } finally {
      setIsGeneratingImage(false);
      setGenProgressText('');
    }
  };

  const [selectedFreeModel, setSelectedFreeModel] = useState('flux');

  // Generate 1-Click AI Background Image via 100% Free AI Engine (Pollinations / Flux / SDXL)
  const handleGenerateAIBackground = async () => {
    if (!generatedData || !fullImagePromptEn) {
      alert('Vui lòng phân tích tạo content bằng AI trước!');
      return;
    }

    setIsGeneratingImage(true);
    setGenProgressText('Đang kết nối Server AI Miễn Phí vẽ ảnh...');

    try {
      const aiImageUrl = await generateFreeAIImage({
        prompt: fullImagePromptEn,
        modelId: selectedFreeModel,
        width: 1280,
        height: 720
      });

      setReferenceBgImage(aiImageUrl);
    } catch (err) {
      alert(`Lỗi tạo ảnh miễn phí: ${err.message}`);
    } finally {
      setIsGeneratingImage(false);
      setGenProgressText('');
    }
  };




  // Export 1080p HD PNG Thumbnail Image
  const handleDownloadThumbnailHD = async () => {
    try {
      const dataUrl = await exportThumbnailHD({
        bgImage: referenceBgImage,
        line1: displayLine1,
        line2: displayLine2,
        channelName: 'TU TIÊN ANIME'
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `thumbnail_youtube_tu_tien_${Date.now()}.png`;
      a.click();
    } catch (err) {
      alert(`Lỗi xuất ảnh thumbnail: ${err.message}`);
    }
  };


  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState(() => aiModel || 'claude-sonnet-5');

  const handleGenerate = async () => {
    if (selectedFilesList.length === 0) {
      alert('Vui lòng chọn ít nhất 1 file SRT phụ đề trước khi tạo content YouTube!');
      return;
    }

    const apiKey = aiProvider === 'orimise' ? orimiseKey : geminiKey;
    if (!apiKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateYoutubeContent({
        selectedFiles: selectedFilesList,
        genre,
        contentType,
        aiProvider,
        apiKey,
        baseUrl: orimiseBaseUrl,
        model: selectedAnalysisModel
      });

      setGeneratedData(result);
      setSelectedTitleIndex(0);
      setSelectedTextIndex(0);

      const firstTextObj = result.thumbnailTexts?.[0] || { line1: 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ', line2: 'TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC' };
      setCustomLine1(firstTextObj.line1);
      setCustomLine2(firstTextObj.line2);
    } catch (err) {
      alert(`Lỗi tạo nội dung YouTube: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };


  const currentTitle = generatedData?.titles?.[selectedTitleIndex] || 'TOÀN GIA BỊ BẮT XUYÊN KHÔNG ĐỘT PHÁ KIM ĐAN!';


  return (
    <div className="youtuber-studio-layout">
      {/* Top Banner Control Panel */}
      <div className="card-panel studio-banner">
        <div className="banner-title-group">
          <div className="youtube-badge">
            <Video size={26} className="text-red-accent" />
          </div>
          <div>
            <h2>🎬 YOUTUBER STUDIO & THUMBNAIL CREATOR PRO</h2>
            <p className="text-muted">
              Phân tích đa tập phim SRT để tạo 5 Title Giật Gân, Text Thumbnail 2 Dòng Ngắn Gọn Dễ Hiểu, Up Ảnh Tham Chiếu & Prompt AI!
            </p>
          </div>
        </div>

        {/* Multi-SRT File Selection Toolbar */}
        <div className="multi-file-selector-box mb-3">
          <div className="flex-between flex-wrap gap-2 mb-2">
            <label className="form-label mb-0">
              <CheckSquare size={16} className="text-cyan" />
              <span>Chọn Các Tập SRT Phân Tích Tổng Hợp ({selectedFileIds.length} / {files.length} tập chọn - {totalSelectedSubtitles} dòng):</span>
            </label>
            <div className="flex-center gap-2">
              <button className="btn btn-secondary btn-xs" onClick={handleSelectAllFiles}>
                [✓] Chọn Tất Cả
              </button>
              <button className="btn btn-secondary btn-xs" onClick={handleDeselectAllFiles}>
                [✕] Chọn 1 Tập
              </button>
            </div>
          </div>

          <div className="file-checkboxes-grid">
            {files.map(f => {
              const isChecked = selectedFileIds.includes(f.id);
              return (
                <label key={f.id} className={`file-checkbox-pill ${isChecked ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleSelectFile(f.id)}
                  />
                  <span className="file-pill-name" title={f.name}>{f.name}</span>
                  <span className="file-pill-lines">({f.subtitles.length} dòng)</span>
                </label>
              );
            })}
            {files.length === 0 && <span className="text-muted">Chưa có file SRT nào trong danh sách.</span>}
          </div>
        </div>

        <div className="studio-controls-grid">
          <div className="control-field">
            <label className="form-label font-bold text-cyan">Mô Hình AI Phân Tích Phim:</label>
            <select
              value={selectedAnalysisModel}
              onChange={e => setSelectedAnalysisModel(e.target.value)}
              className="input-field select-field font-bold text-cyan"
              title="Chọn mô hình AI chuyên trách phân tích kịch bản và sáng tạo content YouTube"
            >
              <option value="claude-sonnet-5">🏆 claude-sonnet-5 (Đỉnh Cao Content YouTube)</option>
              <option value="gemini-2.5-flash">⚡ gemini-2.5-flash (Siêu Nhanh 2s & Đọc Nhiều Tập)</option>
              <option value="gpt-4o">🤖 gpt-4o (OpenAI GPT-4o)</option>
              <option value="gpt-4o-mini">🚀 gpt-4o-mini (OpenAI Tiết Kiệm)</option>
              <option value="gemini-2.5-pro">🧠 gemini-2.5-pro (Phân Tích Sâu)</option>
            </select>
          </div>

          <div className="control-field">
            <label className="form-label">Thể Loại Phim / Truyện:</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="input-field select-field"
            >
              <option value="Tu Tiên / Tiên Hiệp">Tu Tiên / Tiên Hiệp</option>
              <option value="Huyền Huyễn / Thần Thoại">Huyền Huyễn / Thần Thoại</option>
              <option value="Xuyên Không / Trọng Sinh">Xuyên Không / Trọng Sinh</option>
              <option value="Đô Thị / Hệ Thống">Đô Thị / Hệ Thống</option>
              <option value="Cổ Trang / Kiếm Hiệp">Cổ Trang / Kiếm Hiệp</option>
            </select>
          </div>


          <div className="control-field">
            <label className="form-label">Định Dạng Video YouTube:</label>
            <select
              value={contentType}
              onChange={e => setContentType(e.target.value)}
              className="input-field select-field"
            >
              <option value="Review Phim / Tóm Tắt Phim">Review Phim / Tóm Tắt Phim</option>
              <option value="Phim Ngắn / Web Drama">Phim Ngắn / Web Drama</option>
              <option value="Audio Podcast / Truyện Đọc">Audio Podcast / Truyện Đọc</option>
              <option value="YouTube Shorts / Reel (Vertical)">YouTube Shorts / Reel (Vertical)</option>
            </select>
          </div>

          <div className="control-action">
            <button
              className="btn btn-cyan btn-lg font-bold btn-glow"
              onClick={handleGenerate}
              disabled={isGenerating || files.length === 0}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={20} className="spinner" />
                  <span>Đang Phân Tích AI...</span>
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  <span>⚡ PHÂN TÍCH {selectedFileIds.length} TẬP & TẠO CONTENT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Grid */}
      {generatedData ? (
        <div className="studio-results-grid">
          {/* Column 1: YouTube Titles & 2-Line Text Overlays */}
          <div className="studio-column card-panel">
            <div className="column-header">
              <Flame size={20} className="text-cyan" />
              <h3>📌 5 Tiêu Đề YouTube Hấp Dẫn (Clickbait SEO)</h3>
            </div>

            <div className="titles-list">
              {generatedData.titles.map((title, idx) => {
                const isSelected = selectedTitleIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`title-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTitleIndex(idx)}
                  >
                    <div className="title-number">#{idx + 1}</div>
                    <div className="title-text">{title}</div>
                    <button
                      className="btn-icon text-cyan"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(title, `title_${idx}`);
                      }}
                      title="Sao chép tiêu đề"
                    >
                      {copiedField === `title_${idx}` ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 2-Line Thumbnail Text Overlay Suggestions */}
            <div className="column-header mt-4">
              <Type size={20} className="text-purple" />
              <h3>🖼️ Chữ Thumbnail 2 Dòng Ngắn Gọn Dễ Hiểu</h3>
            </div>

            <div className="thumbnail-texts-list">
              {generatedData.thumbnailTexts.map((item, idx) => {
                const isSelected = selectedTextIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`text-overlay-card-2line ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTextIndex(idx);
                      setCustomLine1(item.line1);
                      setCustomLine2(item.line2);
                    }}
                  >
                    <span className="overlay-badge">Mẫu {idx + 1}</span>
                    <div className="overlay-2line-preview">
                      <div className="line1-gold">{item.line1}</div>
                      {item.line2 && <div className="line2-cyan">{item.line2}</div>}
                    </div>
                    <button
                      className="btn-icon text-purple"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(`${item.line1} ${item.line2}`, `thumb_text_${idx}`);
                      }}
                      title="Sao chép chữ thumbnail"
                    >
                      {copiedField === `thumb_text_${idx}` ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 2-Line Custom Inputs for Live Preview */}
            <div className="custom-2line-box mt-3">
              <label className="form-label font-bold text-cyan">Tùy Chỉnh Chữ 2 Dòng Trên Thumbnail (Live Preview):</label>

              <div className="form-group mb-2">
                <span className="text-xs text-muted">Dòng 1 (Chữ vàng 3D đập vào mắt):</span>
                <input
                  type="text"
                  className="input-field font-bold text-amber"
                  value={customLine1}
                  onChange={e => setCustomLine1(e.target.value)}
                  placeholder="Dòng 1: TÔ SƯ HUYNH XUYÊN KHÔNG..."
                />
              </div>

              <div className="form-group">
                <span className="text-xs text-muted">Dòng 2 (Chữ xanh ngọc kịch tính):</span>
                <input
                  type="text"
                  className="input-field font-bold text-cyan"
                  value={customLine2}
                  onChange={e => setCustomLine2(e.target.value)}
                  placeholder="Dòng 2: TOÀN GIA BỊ BẮT VÀO NGỤC..."
                />
              </div>
            </div>
          </div>

          {/* Column 2: Live Thumbnail Mockup & Reference Image Upload */}
          <div className="studio-column card-panel">
            <div className="column-header">
              <ImageIcon size={20} className="text-cyan" />
              <h3>🎨 Live Mockup Ảnh Bìa Thumbnail 16:9</h3>

              <div className="flex-center gap-2 ml-auto">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => bgImageInputRef.current?.click()}
                  title="Tải ảnh nhân vật/bối cảnh từ máy tính lên làm ảnh nền Thumbnail"
                >
                  <Upload size={14} />
                  <span>{referenceBgImage ? 'Đổi Ảnh Nền' : '📷 Up Ảnh Tham Chiếu'}</span>
                </button>
                {referenceBgImage && (
                  <button
                    className="btn btn-secondary btn-sm text-red"
                    onClick={() => setReferenceBgImage(null)}
                    title="Xóa ảnh nền đã up"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <input
                  type="file"
                  ref={bgImageInputRef}
                  accept="image/*"
                  onChange={handleUploadBgImage}
                  hidden
                />
              </div>
            </div>

            {/* Live 16:9 Cinematic Preview Card with Reference Image Support */}
            <div className="thumbnail-mockup-card">
              <div className="mockup-canvas">
                {/* Uploaded Reference Background Image */}
                {referenceBgImage ? (
                  <img
                    src={referenceBgImage}
                    alt="Thumbnail Reference Background"
                    className="mockup-bg-image"
                  />
                ) : (
                  <div className="mockup-background-glow" />
                )}

                <div className="mockup-vignette-overlay" />
                <div className="mockup-badge-hd">1080p HD</div>
                <div className="mockup-badge-duration">32:45</div>

                {/* Giant Bold 2-Line 3D Text Overlay */}
                <div className="mockup-text-overlay-2line">
                  {displayLine1 && <span className="text-stroke-3d-gold">{displayLine1}</span>}
                  {displayLine2 && <span className="text-stroke-3d-cyan">{displayLine2}</span>}
                </div>

                <div className="mockup-channel-watermark">
                  <Video size={16} className="text-red-accent" />
                  <span>TU TIÊN ANIME</span>
                </div>
              </div>

              <div className="mockup-title-footer">
                <div className="mockup-title">{currentTitle}</div>
                <div className="mockup-meta text-muted">Tu Tiên Anime Pro &bull; 185K lượt xem &bull; 1 giờ trước</div>
              </div>
            </div>

            {/* Thumbnail Action Buttons (Instant AI Generator & HD Download) */}
            <div className="flex-center flex-wrap gap-2 mt-3">
              <button
                className="btn btn-purple btn-sm font-bold flex-1"
                onClick={handleGenerateOrimiseBackground}
                disabled={isGeneratingImage}
                title="Tạo ảnh bằng chính thức Orimise API (gpt-image-1, $0.05/ảnh, hỗ trợ ảnh tham chiếu)"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw size={15} className="spinner" />
                    <span>Đang Kết Nối Orimise...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>✨ Gen Ảnh Orimise AI ($0.05)</span>
                  </>
                )}
              </button>

              <div className="flex-center gap-1 flex-1">
                <select
                  className="input-field select-field btn-sm font-bold text-cyan"
                  style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                  value={selectedFreeModel}
                  onChange={e => setSelectedFreeModel(e.target.value)}
                  title="Chọn mô hình AI tạo ảnh miễn phí"
                >
                  {FREE_IMAGE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>

                <button
                  className="btn btn-secondary btn-sm font-bold"
                  onClick={handleGenerateAIBackground}
                  disabled={isGeneratingImage}
                  title="Vẽ ảnh 16:9 chất lượng cao bằng Server AI Miễn Phí (Không tốn tiền)"
                >
                  <Palette size={15} />
                  <span>🎨 Tạo Ảnh (Free)</span>
                </button>
              </div>

              <button
                className="btn btn-green-glow btn-sm font-bold flex-1"
                onClick={handleDownloadThumbnailHD}
                title="Xuất trực tiếp file ảnh Thumbnail HD 1280x720 1080p sắc nét dạng .PNG về máy tính"
              >
                <Download size={15} />
                <span>📥 Tải Ảnh HD (.PNG)</span>
              </button>
            </div>


            {genProgressText && (
              <div className="progress-banner mt-2 text-cyan font-bold flex-center gap-2">
                <RefreshCw size={14} className="spinner" />
                <span>{genProgressText}</span>
              </div>
            )}



            {/* AI Image Prompts */}
            <div className="prompt-section mt-4">
              <div className="prompt-header">
                <div className="flex-center gap-2">
                  <Sparkles size={18} className="text-cyan" />
                  <h4>Prompt Tạo Ảnh Cho Midjourney / DALL-E / Flux AI:</h4>
                </div>
                <button
                  className="btn btn-cyan btn-sm"
                  onClick={() => handleCopy(fullImagePromptEn || generatedData.imagePromptEn, 'prompt_en')}
                >
                  {copiedField === 'prompt_en' ? <Check size={14} /> : <Copy size={14} />}
                  <span>Sao Chép Prompt Tiếng Anh</span>
                </button>
              </div>

              <textarea
                className="input-field textarea-field font-mono text-cyan"
                rows={4}
                value={fullImagePromptEn || generatedData.imagePromptEn}
                readOnly
              />

            </div>

            <div className="prompt-section mt-3">
              <div className="prompt-header">
                <div className="flex-center gap-2">
                  <FileText size={18} className="text-purple" />
                  <h4>Mô Tả Ý Tưởng Ảnh Bìa (Tiếng Việt):</h4>
                </div>
              </div>
              <p className="info-box-text">{generatedData.imagePromptVi}</p>
            </div>
          </div>

          {/* Column 3: YouTube Description & Tags */}
          <div className="studio-column card-panel">
            <div className="column-header">
              <FileText size={20} className="text-cyan" />
              <h3>📝 Mô Tả Video YouTube ({selectedFileIds.length} tập)</h3>
              <button
                className="btn btn-secondary btn-sm ml-auto"
                onClick={() => handleCopy(generatedData.description, 'desc')}
              >
                {copiedField === 'desc' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>Sao Chép Mô Tả</span>
              </button>
            </div>

            <textarea
              className="input-field textarea-field description-box"
              rows={12}
              value={generatedData.description}
              readOnly
            />

            <div className="column-header mt-4">
              <Tag size={20} className="text-purple" />
              <h3>🏷️ Thẻ Tags & Từ Khóa SEO YouTube</h3>
              <button
                className="btn btn-secondary btn-sm ml-auto"
                onClick={() => handleCopy(generatedData.tags, 'tags')}
              >
                {copiedField === 'tags' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>Sao Chép Tags</span>
              </button>
            </div>

            <textarea
              className="input-field textarea-field tags-box font-mono"
              rows={5}
              value={generatedData.tags}
              readOnly
            />
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="card-panel empty-studio-card">
          <Video size={64} className="text-muted pulse" />
          <h3>Chưa Tạo Nội Dung YouTube</h3>
          <p className="text-muted">
            Hãy chọn các tập SRT ở phía trên và bấm nút <strong className="highlight-cyan">"⚡ PHÂN TÍCH TẬP & TẠO CONTENT"</strong> để AI tự động phân tích và tạo trọn bộ metadata!
          </p>
        </div>
      )}
    </div>
  );
}
