import React, { useState, useRef, useEffect } from 'react';
import {
  Video, Sparkles, Copy, Check, Image as ImageIcon, Tag, FileText,
  Play, RefreshCw, Wand2, Type, Flame, Layers, Upload, Trash2, CheckSquare, Square, Download, Palette, BookOpen,
  History, Plus, Edit2, Clock
} from 'lucide-react';

import { generateYoutubeContent } from '../utils/youtuberGenerator';
import { exportThumbnailHD, generateAIThumbnailImage, THUMBNAIL_COLOR_THEMES } from '../utils/thumbnailExporter';
import { uploadReferenceImageToOrimise, generateOrimiseImage } from '../utils/orimiseImageApi';
import { generateFreeAIImage, FREE_IMAGE_MODELS } from '../utils/freeImageApi';
import { saveYoutuberStudioStateToDB, loadYoutuberStudioStateFromDB, saveYoutuberHistoryToDB, loadYoutuberHistoryFromDB } from '../utils/dbStorage';

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

  // History Sessions State
  const [historySessions, setHistorySessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');

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

  // Theme & Model states
  const [selectedThemeId, setSelectedThemeId] = useState('gold-cyan');
  const [selectedFreeModel, setSelectedFreeModel] = useState('flux');
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState(() => aiModel || 'claude-sonnet-5');
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore history sessions & active session from IndexedDB across page reloads (F5)
  useEffect(() => {
    let isMounted = true;
    async function restoreStudioHistory() {
      try {
        const { sessions, activeSessionId: loadedId } = await loadYoutuberHistoryFromDB();
        if (isMounted) {
          if (Array.isArray(sessions) && sessions.length > 0) {
            setHistorySessions(sessions);
            const targetId = loadedId && sessions.some(s => s.id === loadedId) ? loadedId : sessions[0].id;
            setActiveSessionId(targetId);

            const activeSess = sessions.find(s => s.id === targetId);
            if (activeSess) {
              if (activeSess.generatedData) setGeneratedData(activeSess.generatedData);
              if (Array.isArray(activeSess.selectedFileIds)) setSelectedFileIds(activeSess.selectedFileIds);
              if (typeof activeSess.selectedTitleIndex === 'number') setSelectedTitleIndex(activeSess.selectedTitleIndex);
              if (typeof activeSess.selectedTextIndex === 'number') setSelectedTextIndex(activeSess.selectedTextIndex);
              if (activeSess.customLine1 !== undefined) setCustomLine1(activeSess.customLine1);
              if (activeSess.customLine2 !== undefined) setCustomLine2(activeSess.customLine2);
              if (activeSess.referenceBgImage) setReferenceBgImage(activeSess.referenceBgImage);
              if (activeSess.selectedThemeId) setSelectedThemeId(activeSess.selectedThemeId);
              if (activeSess.genre) setGenre(activeSess.genre);
              if (activeSess.contentType) setContentType(activeSess.contentType);
              if (activeSess.selectedAnalysisModel) setSelectedAnalysisModel(activeSess.selectedAnalysisModel);
              if (activeSess.selectedFreeModel) setSelectedFreeModel(activeSess.selectedFreeModel);
            }
          }
        }
      } catch (err) {
        console.warn('Could not restore YoutuberStudio history:', err);
      } finally {
        if (isMounted) setIsRestoring(false);
      }
    }
    restoreStudioHistory();
    return () => { isMounted = false; };
  }, []);

  // Sync edits to the active history session and persist to IndexedDB
  useEffect(() => {
    if (isRestoring || !activeSessionId) return;

    setHistorySessions(prevSessions => {
      const sessIdx = prevSessions.findIndex(s => s.id === activeSessionId);
      if (sessIdx < 0) return prevSessions;

      const currentSess = prevSessions[sessIdx];
      const updatedSess = {
        ...currentSess,
        generatedData,
        selectedFileIds,
        selectedTitleIndex,
        selectedTextIndex,
        customLine1,
        customLine2,
        referenceBgImage,
        selectedThemeId,
        genre,
        contentType,
        selectedAnalysisModel,
        selectedFreeModel
      };

      const newSessions = [...prevSessions];
      newSessions[sessIdx] = updatedSess;
      saveYoutuberHistoryToDB(newSessions, activeSessionId);
      return newSessions;
    });
  }, [
    isRestoring,
    activeSessionId,
    generatedData,
    selectedFileIds,
    selectedTitleIndex,
    selectedTextIndex,
    customLine1,
    customLine2,
    referenceBgImage,
    selectedThemeId,
    genre,
    contentType,
    selectedAnalysisModel,
    selectedFreeModel
  ]);

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




  const activeColorTheme = THUMBNAIL_COLOR_THEMES.find(t => t.id === selectedThemeId) || THUMBNAIL_COLOR_THEMES[0];

  // Export 1080p HD PNG Thumbnail Image
  const handleDownloadThumbnailHD = async () => {
    try {
      const dataUrl = await exportThumbnailHD({
        bgImage: referenceBgImage,
        line1: displayLine1,
        line2: displayLine2,
        channelName: 'TU TIÊN ANIME',
        themeId: selectedThemeId
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `thumbnail_youtube_tu_tien_${Date.now()}.png`;
      a.click();
    } catch (err) {
      alert(`Lỗi xuất ảnh thumbnail: ${err.message}`);
    }
  };

  // 1-Click Export Full YouTube Creator Pack (.TXT metadata + HD .PNG)
  const handleExportFullPack = async () => {
    if (!generatedData) {
      alert('Vui lòng phân tích tạo content bằng AI trước!');
      return;
    }

    try {
      // 1. Export HD PNG Thumbnail
      const pngDataUrl = await exportThumbnailHD({
        bgImage: referenceBgImage,
        line1: displayLine1,
        line2: displayLine2,
        channelName: 'TU TIÊN ANIME',
        themeId: selectedThemeId
      });

      const pngLink = document.createElement('a');
      pngLink.href = pngDataUrl;
      pngLink.download = `thumbnail_1080p_${Date.now()}.png`;
      pngLink.click();

      // 2. Generate and download Metadata .TXT file
      const packContent = `=====================================================
🎬 BỘ XUẤT BẢN YOUTUBE PRO - TU TIÊN ANIME
Tập phim phân tích: ${selectedFilesList.map(f => f.name).join(', ')}
Ngày tạo: ${new Date().toLocaleString('vi-VN')}
=====================================================

📌 5 TIÊU ĐỀ YOUTUBE (CLICKBAIT SEO 80-90 KÝ TỰ):
${generatedData.titles.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

-----------------------------------------------------
🖼️ CHỮ THUMBNAIL 2 DÒNG:
Dòng 1: ${displayLine1}
Dòng 2: ${displayLine2}

-----------------------------------------------------
📖 TÓM TẮT CỐT TRUYỆN TOÀN TẬP:
${generatedData.storySummary || 'Chưa có tóm tắt'}

-----------------------------------------------------
⏱️ MỐC THỜI GIAN (TIMESTAMPS):
${(generatedData.timestamps || []).join('\n') || '00:00 Mở đầu: Bắt Đầu Tập Phim'}

-----------------------------------------------------
📝 MÔ TẢ VIDEO YOUTUBE (DESCRIPTION):
${generatedData.description}

-----------------------------------------------------
🏷️ THẺ TAGS YOUTUBE:
${generatedData.tags}

-----------------------------------------------------
🎨 PROMPT TẠO ẢNH AI (MIDJOURNEY / FLUX):
${fullImagePromptEn || generatedData.imagePromptEn}
`;

      const blob = new Blob([packContent], { type: 'text/plain;charset=utf-8' });
      const txtUrl = URL.createObjectURL(blob);
      const txtLink = document.createElement('a');
      txtLink.href = txtUrl;
      txtLink.download = `youtube_pack_${Date.now()}.txt`;
      txtLink.click();
      URL.revokeObjectURL(txtUrl);
    } catch (err) {
      alert(`Lỗi xuất gói xuất bản: ${err.message}`);
    }
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };



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
      const newLine1 = firstTextObj.line1;
      const newLine2 = firstTextObj.line2;
      setCustomLine1(newLine1);
      setCustomLine2(newLine2);

      // Create or update history session
      const epCount = selectedFilesList.length;
      const epNames = selectedFilesList.map(f => f.name.replace(/\.srt$/i, '')).join(', ');
      const defaultTitle = result.titles?.[0] || `${epNames} (${epCount} tập)`;
      const newSessionId = activeSessionId || `session_${Date.now()}`;

      const newSession = {
        id: newSessionId,
        title: defaultTitle,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
        fileNames: selectedFilesList.map(f => f.name),
        selectedFileIds: [...selectedFileIds],
        generatedData: result,
        selectedTitleIndex: 0,
        selectedTextIndex: 0,
        customLine1: newLine1,
        customLine2: newLine2,
        referenceBgImage,
        selectedThemeId,
        genre,
        contentType,
        selectedAnalysisModel,
        selectedFreeModel
      };

      setHistorySessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === newSessionId);
        let updated;
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = newSession;
        } else {
          updated = [newSession, ...prev];
        }
        saveYoutuberHistoryToDB(updated, newSessionId);
        return updated;
      });
      setActiveSessionId(newSessionId);
    } catch (err) {
      alert(`Lỗi tạo nội dung YouTube: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Switch to a chosen history session
  const handleSelectSession = (session) => {
    setActiveSessionId(session.id);
    if (session.generatedData) setGeneratedData(session.generatedData);
    if (Array.isArray(session.selectedFileIds)) setSelectedFileIds(session.selectedFileIds);
    if (typeof session.selectedTitleIndex === 'number') setSelectedTitleIndex(session.selectedTitleIndex);
    if (typeof session.selectedTextIndex === 'number') setSelectedTextIndex(session.selectedTextIndex);
    setCustomLine1(session.customLine1 || '');
    setCustomLine2(session.customLine2 || '');
    if (session.referenceBgImage) setReferenceBgImage(session.referenceBgImage);
    if (session.selectedThemeId) setSelectedThemeId(session.selectedThemeId);
    if (session.genre) setGenre(session.genre);
    if (session.contentType) setContentType(session.contentType);
    if (session.selectedAnalysisModel) setSelectedAnalysisModel(session.selectedAnalysisModel);
    if (session.selectedFreeModel) setSelectedFreeModel(session.selectedFreeModel);

    saveYoutuberHistoryToDB(historySessions, session.id);
  };

  // Start fresh analysis without overwriting existing tabs
  const handleCreateNewSession = () => {
    setActiveSessionId(null);
    setGeneratedData(null);
    setCustomLine1('');
    setCustomLine2('');
    setReferenceBgImage(null);
    setSelectedTitleIndex(0);
    setSelectedTextIndex(0);
    saveYoutuberHistoryToDB(historySessions, null);
  };

  // Delete a history session
  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    const updated = historySessions.filter(s => s.id !== sessionId);
    setHistorySessions(updated);

    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0]);
      } else {
        handleCreateNewSession();
      }
    } else {
      saveYoutuberHistoryToDB(updated, activeSessionId);
    }
  };

  // Save renamed session title
  const handleSaveRenameSession = (sessionId) => {
    if (!editSessionTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    setHistorySessions(prev => {
      const updated = prev.map(s => s.id === sessionId ? { ...s, title: editSessionTitle.trim() } : s);
      saveYoutuberHistoryToDB(updated, activeSessionId);
      return updated;
    });
    setEditingSessionId(null);
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử các tab phân tích?')) {
      setHistorySessions([]);
      handleCreateNewSession();
    }
  };

  const currentTitle = generatedData?.titles?.[selectedTitleIndex] || 'TOÀN GIA BỊ BẮT XUYÊN KHÔNG ĐỘT PHÁ KIM ĐAN!';

  return (
    <div className="youtuber-studio-layout">
      {/* History Sessions / Tabs Strip */}
      <div className="history-sessions-panel">
        <div className="history-sessions-header">
          <div className="history-sessions-title">
            <History size={18} className="text-cyan" />
            <span>Lịch Sử Phân Tích ({historySessions.length} phiên đã lưu):</span>
          </div>

          <div className="flex-center gap-2">
            <button
              className="btn btn-cyan btn-sm font-bold"
              onClick={handleCreateNewSession}
              title="Mở một phiên phân tích mới để phân tích bộ phim/tập phim khác mà không làm mất kết quả cũ"
            >
              <Plus size={15} /> ➕ Phân Tích Phiên Mới
            </button>

            {historySessions.length > 1 && (
              <button
                className="btn btn-secondary btn-sm text-red"
                onClick={handleClearAllHistory}
                title="Xóa toàn bộ lịch sử các phiên phân tích"
              >
                <Trash2 size={14} /> Xóa Tất Cả
              </button>
            )}
          </div>
        </div>

        {historySessions.length > 0 ? (
          <div className="history-tabs-track">
            {historySessions.map((session, idx) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={`history-tab-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectSession(session)}
                  title="Bấm để xem lại kết quả phân tích của phiên này"
                >
                  <div className="history-tab-top">
                    {isEditing ? (
                      <input
                        type="text"
                        className="input-field input-xs"
                        autoFocus
                        value={editSessionTitle}
                        onChange={e => setEditSessionTitle(e.target.value)}
                        onBlur={() => handleSaveRenameSession(session.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRenameSession(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="history-tab-name"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditSessionTitle(session.title || '');
                        }}
                      >
                        {session.title || `Phiên #${idx + 1}`}
                      </span>
                    )}

                    <div className="flex-center gap-1">
                      <button
                        className="history-tab-btn-del"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditSessionTitle(session.title || '');
                        }}
                        title="Đổi tên tab này"
                      >
                        <Edit2 size={12} />
                      </button>

                      <button
                        className="history-tab-btn-del"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        title="Xóa phiên phân tích này khỏi lịch sử"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="history-tab-meta">
                    <span>{session.fileNames?.length || session.selectedFileIds?.length || 1} tập</span>
                    <span><Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />{session.createdAt || 'Vừa xong'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-muted" style={{ padding: '6px 2px' }}>
            Chưa có phiên phân tích nào. Hãy chọn các tập phim SRT bên dưới rồi nhấn <strong>[🚀 Phân Tích Kịch Bản & Tạo Bộ Xuất Bản]</strong> để tự động lưu vào lịch sử!
          </div>
        )}
      </div>

      {/* Top Banner Control Panel (BƯỚC 1) */}
      <div className="card-panel studio-banner">
        <div className="banner-title-group">
          <div className="youtube-badge">
            <Video size={26} className="text-red-accent" />
          </div>
          <div>
            <div className="flex-center gap-2 mb-1">
              <span className="step-badge">BƯỚC 1</span>
              <h2 style={{ margin: 0 }}>🎬 YOUTUBER STUDIO & THUMBNAIL CREATOR PRO</h2>
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Chọn các tập phim SRT &bull; AI đọc toàn bộ kịch bản &bull; Tóm tắt cốt truyện, tạo 5 Title Giật Gân, Chữ Thumbnail 2 Dòng, Thiết kế ảnh bìa 16:9 & Trọn bộ Metadata!
            </p>
          </div>
        </div>

        {/* Multi-SRT File Selection Toolbar */}
        <div className="multi-file-selector-box mb-3 mt-3">
          <div className="flex-between flex-wrap gap-2 mb-2">
            <label className="form-label mb-0 font-bold text-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} />
              <span>Chọn Các Tập SRT Phân Tích Tổng Hợp ({selectedFileIds.length} / {files.length} tập chọn — Tổng {totalSelectedSubtitles} dòng thoại):</span>
            </label>
            <div className="flex-center gap-2">
              <button className="btn btn-secondary btn-xs font-bold" onClick={handleSelectAllFiles}>
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
            {files.length === 0 && <span className="text-muted">Chưa có file SRT nào trong danh sách. Hãy nạp file SRT ở tab Trình Dịch.</span>}
          </div>
        </div>

        <div className="studio-controls-grid">
          <div className="control-field">
            <label className="form-label font-bold text-cyan">Mô Hình AI Phân Tích Kịch Bản:</label>
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
                  <span>Đang Phân Tích Kịch Bản AI...</span>
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
        <>
          {/* Full Story Summary Synopsis Box (BƯỚC 2) */}
          {generatedData.storySummary && (
            <div className="card-panel story-summary-banner mb-3">
              <div className="flex-between flex-wrap gap-2 mb-2">
                <div className="flex-center gap-2">
                  <span className="step-badge emerald">BƯỚC 2</span>
                  <BookOpen size={20} className="text-emerald" />
                  <h3 className="text-emerald font-bold mb-0">📖 TÓM TẮT CỐT TRUYỆN CHI TIẾT ({selectedFileIds.length} TẬP)</h3>
                </div>
                <button
                  className="btn btn-secondary btn-sm font-bold"
                  onClick={() => handleCopy(generatedData.storySummary, 'story_summary')}
                  title="Sao chép toàn bộ tóm tắt cốt truyện"
                >
                  {copiedField === 'story_summary' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>Sao Chép Tóm Tắt</span>
                </button>
              </div>

              <div className="story-summary-box">
                <p className="story-summary-text">{generatedData.storySummary}</p>
              </div>
            </div>
          )}

          <div className="studio-results-grid">

          {/* Column 1: YouTube Titles & 2-Line Text Overlays (BƯỚC 3) */}
          <div className="studio-column card-panel">
            <div className="column-header">
              <span className="step-badge gold">BƯỚC 3</span>
              <Flame size={20} className="text-amber" />
              <h3>📌 5 Tiêu Đề YouTube (Clickbait SEO)</h3>
            </div>

            <div className="titles-list">
              {generatedData.titles.map((title, idx) => {
                const isSelected = selectedTitleIndex === idx;
                const charCount = title.length;
                const isOptimal = charCount >= 60 && charCount <= 95;

                return (
                  <div
                    key={idx}
                    className={`title-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTitleIndex(idx)}
                    title="Bấm để chọn tiêu đề này hiển thị trên mockup"
                  >
                    <div className="title-number">#{idx + 1}</div>
                    <div className="title-text" style={{ flex: 1 }}>{title}</div>
                    <span className={`char-count-badge ${isOptimal ? 'optimal' : ''}`} title={`${charCount} ký tự (Độ dài lý tưởng: 60-90 ký tự)`}>
                      {charCount} ký tự
                    </span>
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
                    title="Bấm để đưa mẫu chữ này lên ảnh bìa"
                  >
                    <span className="overlay-badge">Mẫu {idx + 1}</span>
                    <div className="overlay-2line-preview" style={{ flex: 1 }}>
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
              <label className="form-label font-bold text-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit2 size={14} /> Tùy Chỉnh Chữ 2 Dòng Trực Tiếp (Live Update):
              </label>

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

          {/* Column 2: Live Thumbnail Mockup & Reference Image Upload (BƯỚC 4) */}
          <div className="studio-column card-panel">
            <div className="column-header">
              <span className="step-badge purple">BƯỚC 4</span>
              <ImageIcon size={20} className="text-purple" />
              <h3>🎨 Thiết Kế Thumbnail 16:9 & AI Vẽ Ảnh</h3>

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

                {/* Giant Bold 2-Line 3D Text Overlay with Dynamic Theme */}
                <div className="mockup-text-overlay-2line">
                  {displayLine1 && (
                    <span
                      className="text-stroke-3d-gold"
                      style={{ color: activeColorTheme.color1, textShadow: `3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 20px ${activeColorTheme.glow1}` }}
                    >
                      {displayLine1}
                    </span>
                  )}
                  {displayLine2 && (
                    <span
                      className="text-stroke-3d-cyan"
                      style={{ color: activeColorTheme.color2, textShadow: `3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 20px ${activeColorTheme.glow2}` }}
                    >
                      {displayLine2}
                    </span>
                  )}
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

            {/* Thumbnail Theme Selector Toolbar */}
            <div className="flex-between flex-wrap gap-2 mt-3 p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
              <span className="text-xs font-bold text-cyan flex-center gap-1">
                <Palette size={14} /> Màu Chữ 3D:
              </span>
              <select
                className="input-field select-field btn-xs font-bold"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                value={selectedThemeId}
                onChange={e => setSelectedThemeId(e.target.value)}
              >
                {THUMBNAIL_COLOR_THEMES.map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>

              <button
                className="btn btn-green-glow btn-xs font-bold ml-auto"
                onClick={handleExportFullPack}
                title="Tải về trọn bộ file ảnh Thumbnail 1080p HD (.PNG) + Toàn bộ Metadata kịch bản (.TXT) chỉ với 1 Click"
              >
                <Download size={13} />
                <span>📦 Xuất Trọn Gói (.TXT + .PNG)</span>
              </button>
            </div>

            {/* Thumbnail Action Buttons (Instant AI Generator & HD Download) */}
            <div className="flex-center flex-wrap gap-2 mt-2">
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
                    <span>✨ Gen Ảnh Orimise ($0.05)</span>
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
                  <span>🎨 Tạo Ảnh Free</span>
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

          {/* Column 3: YouTube Description, Timestamps & Tags (BƯỚC 5) */}
          <div className="studio-column card-panel">
            <div className="column-header">
              <span className="step-badge emerald">BƯỚC 5</span>
              <FileText size={20} className="text-cyan" />
              <h3>📝 Mô Tả & Metadata Xuất Bản ({selectedFileIds.length} tập)</h3>
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
              rows={9}
              value={generatedData.description}
              readOnly
            />

            {/* Timestamps Chapter Breakdown */}
            {generatedData.timestamps && generatedData.timestamps.length > 0 && (
              <div className="timestamps-section mt-3">
                <div className="flex-between mb-1">
                  <span className="text-xs font-bold text-amber flex-center gap-1">
                    ⏱️ Mốc Thời Gian Phân Cảnh (Timestamps):
                  </span>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => handleCopy(generatedData.timestamps.join('\n'), 'timestamps')}
                  >
                    {copiedField === 'timestamps' ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                    <span>Sao Chép Mốc Giờ</span>
                  </button>
                </div>
                <div className="timestamps-box p-2 rounded text-xs font-mono" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fbbf24', maxHeight: '110px', overflowY: 'auto' }}>
                  {generatedData.timestamps.map((ts, idx) => (
                    <div key={idx} className="py-0.5">{ts}</div>
                  ))}
                </div>
              </div>
            )}

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
              rows={4}
              value={generatedData.tags}
              readOnly
            />
          </div>
        </div>
      </>


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
