import React, { useState, useRef, useEffect } from 'react';
import {
  Video, Sparkles, Copy, Check, Image as ImageIcon, Tag, FileText,
  Play, RefreshCw, Wand2, Type, Flame, Layers, Upload, Trash2, CheckSquare, Square, Download, Palette, BookOpen,
  History, Plus, Edit2, Clock, Search, Filter, ArrowUpDown, CheckCircle2, ChevronDown, ChevronUp, Users
} from 'lucide-react';


import {
  generateYoutubeContent,
  regenerateTitlesAndThumbnailTexts,
  regenerateDescriptionOnly,
  regenerateStorySummaryOnly,
  regenerateImagePromptOnly,
  generateBatchStudioForFiles,
  exportStudioResultsToCSV,
  exportStudioResultsToTXT
} from '../utils/youtuberGenerator';

import { exportThumbnailHD, generateAIThumbnailImage, THUMBNAIL_COLOR_THEMES } from '../utils/thumbnailExporter';
import { uploadReferenceImageToOrimise, generateOrimiseImage } from '../utils/orimiseImageApi';
import { generateFreeAIImage, FREE_IMAGE_MODELS } from '../utils/freeImageApi';
import { saveYoutuberStudioStateToDB, loadYoutuberStudioStateFromDB, saveYoutuberHistoryToDB, loadYoutuberHistoryFromDB } from '../utils/dbStorage';

// Helper to generate concise episode range name (e.g. c3-1-3 or c3_01 - c3_22)
function formatFileRangeTitle(fileList = []) {
  if (!fileList || fileList.length === 0) return 'Tập Phim Mới';
  const cleanNames = fileList.map(f => {
    const raw = typeof f === 'string' ? f : (f.name || '');
    return raw.replace(/\.srt$/i, '').replace(/^.*[\\/]/, '').trim();
  });

  if (cleanNames.length === 1) return cleanNames[0];

  const first = cleanNames[0];
  const last = cleanNames[cleanNames.length - 1];

  // Try matching numeric range like c3-1 and c3-3 or c3_01 and c3_22
  const matchFirst = first.match(/^(.*?)(\d+)$/);
  const matchLast = last.match(/^(.*?)(\d+)$/);

  if (matchFirst && matchLast && matchFirst[1] === matchLast[1]) {
    const prefix = matchFirst[1].replace(/[-_]$/, '');
    const num1 = parseInt(matchFirst[2], 10);
    const num2 = parseInt(matchLast[2], 10);
    return `${prefix}-${num1}-${num2}`;
  }

  return `${first} - ${last}`;
}

export default function YoutuberStudio({
  files = [],
  activeFile,
  aiProvider,
  orimiseKey,
  orimiseBaseUrl,
  geminiKey,
  aiModel,
  characters = [],
  onApplySubtitle
}) {
  // Multi-file selection state: array of selected file IDs
  const [selectedFileIds, setSelectedFileIds] = useState(() => {
    if (activeFile) return [activeFile.id];
    return files.length > 0 ? [files[0].id] : [];
  });

  const [genre, setGenre] = useState('Tu Tiên / Tiên Hiệp');
  const [contentType, setContentType] = useState('Review Phim / Tóm Tắt Phim');
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(false);

  // Dedicated prompt inputs for ALL sections (Step 2, Step 3, Step 4, Step 5)
  const [summaryPrompt, setSummaryPrompt] = useState('');
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);

  const [titlePrompt, setTitlePrompt] = useState('');
  const [isRegeneratingTitles, setIsRegeneratingTitles] = useState(false);

  const [imageIdeaPrompt, setImageIdeaPrompt] = useState('');
  const [isRegeneratingImagePrompt, setIsRegeneratingImagePrompt] = useState(false);

  const [descPrompt, setDescPrompt] = useState('');
  const [isRegeneratingDesc, setIsRegeneratingDesc] = useState(false);

  // 👥 Character Reference Images for AI Image Prompt Generation
  const [characterRefImages, setCharacterRefImages] = useState([]);
  const [isCharPickerOpen, setIsCharPickerOpen] = useState(false);
  const charImageInputRef = useRef(null);

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

  // Batch Series Processing State (Feature 6)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const [batchResults, setBatchResults] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Theme & Model states
  const [selectedThemeId, setSelectedThemeId] = useState('gold-cyan');
  const [selectedFreeModel, setSelectedFreeModel] = useState('flux');
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState(() => aiModel || 'claude-sonnet-5');
  const [isRestoring, setIsRestoring] = useState(true);

  // Helper to convert tags string into comma-separated list
  const formatCommaTags = (tagsString = '') => {
    if (!tagsString) return '';
    return tagsString
      .replace(/#/g, '')
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .join(', ');
  };

  // Helper to convert tags string into hashtags
  const formatHashTags = (tagsString = '') => {
    if (!tagsString) return '';
    return tagsString
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`)
      .join(' ');
  };


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
              if (activeSess.customPrompt) setCustomPrompt(activeSess.customPrompt);
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

  // Search & Filter state for episode selection
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('natural');

  // Filter & Sort files
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const translatedCount = file.subtitles.filter(s => s.status === 'translated' || s.status === 'edited').length;
    const isDone = translatedCount === file.subtitles.length && file.subtitles.length > 0;

    if (statusFilter === 'done') return matchesSearch && isDone;
    if (statusFilter === 'pending') return matchesSearch && !isDone;
    return matchesSearch;
  });

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

  // Select all currently filtered files
  const handleSelectAllFiltered = () => {
    const idsToAdd = sortedFiles.map(f => f.id);
    setSelectedFileIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
  };

  // Deselect all currently filtered files
  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(sortedFiles.map(f => f.id));
    setSelectedFileIds(prev => {
      const remaining = prev.filter(id => !idsToRemove.has(id));
      return remaining.length > 0 ? remaining : (files.length > 0 ? [files[0].id] : []);
    });
  };

  // Keep / Select ONLY the currently filtered files in 1 click
  const handleKeepOnlyFiltered = () => {
    if (sortedFiles.length === 0) return;
    setSelectedFileIds(sortedFiles.map(f => f.id));
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
        characterReferences: characterRefImages,
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

      // Create or update history session with concise file range name (e.g. c3-1-3)
      const epCount = selectedFilesList.length;
      const fileRangeTitle = formatFileRangeTitle(selectedFilesList);
      const newSessionId = activeSessionId || `session_${Date.now()}`;

      const newSession = {
        id: newSessionId,
        title: fileRangeTitle,
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

  // 🚀 Batch Generator for ALL Episodes in the Series (Feature 6)
  const handleBatchGenerateSeries = async () => {
    if (files.length === 0) {
      alert('Chưa có file SRT nào trong danh sách. Hãy nạp file ở tab Trình Dịch!');
      return;
    }
    const apiKey = aiProvider === 'orimise' ? orimiseKey : geminiKey;
    if (!apiKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    if (!window.confirm(`Khởi chạy phân tích trọn bộ ${files.length} tập phim bằng AI ${selectedAnalysisModel}?\n\nQuá trình chạy song song đa luồng và tự động tổng hợp thành bảng Excel / CSV để đăng video hàng loạt.`)) {
      return;
    }

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: files.length, currentFile: files[0]?.name || '' });

    try {
      const results = await generateBatchStudioForFiles({
        files,
        genre,
        contentType,
        aiProvider,
        apiKey,
        baseUrl: orimiseBaseUrl,
        model: selectedAnalysisModel,
        concurrency: 3,
        onProgress: (current, total, currentFile) => {
          setBatchProgress({ current, total, currentFile });
        }
      });

      setBatchResults(results);
      setShowBatchModal(true);
    } catch (err) {
      alert(`Lỗi khi phân tích hàng loạt: ${err.message}`);
    } finally {
      setIsBatchGenerating(false);
    }
  };


  // 🪄 1. Re-render Story Summary according to prompt
  const handleRegenerateSummary = async () => {
    if (!generatedData) {
      alert('Vui lòng phân tích tạo content bằng AI trước!');
      return;
    }
    if (!summaryPrompt.trim()) {
      alert('Vui lòng nhập prompt yêu cầu cho Tóm Tắt Cốt Truyện!');
      return;
    }
    const apiKey = aiProvider === 'orimise' ? orimiseKey : geminiKey;
    if (!apiKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    setIsRegeneratingSummary(true);
    try {
      const res = await regenerateStorySummaryOnly({
        storySummary: generatedData.storySummary,
        customPrompt: summaryPrompt,
        genre,
        contentType,
        aiProvider,
        apiKey,
        baseUrl: orimiseBaseUrl,
        model: selectedAnalysisModel
      });

      const updatedData = {
        ...generatedData,
        storySummary: res.storySummary
      };
      setGeneratedData(updatedData);

      if (activeSessionId) {
        setHistorySessions(prev => {
          const updated = prev.map(s => s.id === activeSessionId ? { ...s, generatedData: updatedData } : s);
          saveYoutuberHistoryToDB(updated, activeSessionId);
          return updated;
        });
      }
    } catch (err) {
      alert(`Lỗi tạo lại Tóm Tắt: ${err.message}`);
    } finally {
      setIsRegeneratingSummary(false);
    }
  };

  // 🪄 2. Re-render 5 Titles & 5 Paired 2-Line Thumbnail Texts according to prompt
  const handleRegenerateTitles = async () => {
    if (!generatedData) {
      alert('Vui lòng phân tích tạo content bằng AI trước!');
      return;
    }
    if (!titlePrompt.trim()) {
      alert('Vui lòng nhập prompt yêu cầu cho 5 Tiêu đề & Chữ Thumbnail!');
      return;
    }
    const apiKey = aiProvider === 'orimise' ? orimiseKey : geminiKey;
    if (!apiKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    setIsRegeneratingTitles(true);
    try {
      const res = await regenerateTitlesAndThumbnailTexts({
        storySummary: generatedData.storySummary,
        customPrompt: titlePrompt,
        genre,
        contentType,
        aiProvider,
        apiKey,
        baseUrl: orimiseBaseUrl,
        model: selectedAnalysisModel
      });

      const updatedData = {
        ...generatedData,
        titles: res.titles,
        thumbnailTexts: res.thumbnailTexts
      };
      setGeneratedData(updatedData);
      setSelectedTitleIndex(0);
      setSelectedTextIndex(0);

      if (res.thumbnailTexts?.[0]) {
        setCustomLine1(res.thumbnailTexts[0].line1);
        setCustomLine2(res.thumbnailTexts[0].line2);
      }

      if (activeSessionId) {
        setHistorySessions(prev => {
          const updated = prev.map(s => s.id === activeSessionId ? { ...s, generatedData: updatedData } : s);
          saveYoutuberHistoryToDB(updated, activeSessionId);
          return updated;
        });
      }
    } catch (err) {
      alert(`Lỗi tạo lại Tiêu Đề & Thumbnail: ${err.message}`);
    } finally {
      setIsRegeneratingTitles(false);
    }
  };

  // 👥 Upload custom character reference photos from computer
  const handleUploadCharacterImage = (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 480;
          const maxH = 480;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          const newRef = {
            id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            role: 'Nhân vật tham chiếu',
            sect: '',
            realm: '',
            thumbnail: compressedBase64,
            imageBase64: compressedBase64,
            source: 'uploaded'
          };
          setCharacterRefImages(prev => [...prev, newRef]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  // 🎭 Toggle or select a character from the scanned character list (from Character Lore Studio)
  const handleToggleLoreCharacterRef = (char) => {
    const exists = characterRefImages.some(c => c.id === char.id || (c.name && c.name === char.name));
    if (exists) {
      setCharacterRefImages(prev => prev.filter(c => c.id !== char.id && c.name !== char.name));
    } else {
      setCharacterRefImages(prev => [
        ...prev,
        {
          id: char.id || `lore_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: char.name,
          role: char.role || '',
          sect: char.sect || '',
          realm: char.realm || '',
          thumbnail: char.thumbnail,
          imageBase64: char.thumbnail,
          source: 'lore'
        }
      ]);
    }
  };

  const handleRemoveCharacterRef = (id) => {
    setCharacterRefImages(prev => prev.filter(c => c.id !== id));
  };

  // 🪄 3. Re-render AI Image Prompts (En & Vi) according to prompt & Character Reference Images
  const handleRegenerateImagePrompt = async () => {
    if (!generatedData) {
      alert('Vui lòng phân tích tạo content bằng AI trước!');
      return;
    }
    if (!imageIdeaPrompt.trim() && characterRefImages.length === 0) {
      alert('Vui lòng nhập prompt yêu cầu hoặc chọn ít nhất 1 ảnh nhân vật tham chiếu!');
      return;
    }
    const apiKey = aiProvider === 'orimise' ? orimiseKey : geminiKey;
    if (!apiKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    setIsRegeneratingImagePrompt(true);
    try {
      const res = await regenerateImagePromptOnly({
        storySummary: generatedData.storySummary,
        customPrompt: imageIdeaPrompt,
        characterReferences: characterRefImages,
        selectedFiles: selectedFilesList,
        genre,
        contentType,
        aiProvider,
        apiKey,
        baseUrl: orimiseBaseUrl,
        model: selectedAnalysisModel
      });


      const updatedData = {
        ...generatedData,
        imagePromptEn: res.imagePromptEn,
        imagePromptVi: res.imagePromptVi
      };
      setGeneratedData(updatedData);

      if (activeSessionId) {
        setHistorySessions(prev => {
          const updated = prev.map(s => s.id === activeSessionId ? { ...s, generatedData: updatedData } : s);
          saveYoutuberHistoryToDB(updated, activeSessionId);
          return updated;
        });
      }
    } catch (err) {
      alert(`Lỗi tạo lại Prompt Vẽ Ảnh: ${err.message}`);
    } finally {
      setIsRegeneratingImagePrompt(false);
    }
  };


  // 🪄 4. Re-render Description & Tags according to prompt
  const handleRegenerateDesc = async () => {
    if (!generatedData) {
      alert('Vui lòng phân tích tạo content bằng AI trước!');
      return;
    }
    if (!descPrompt.trim()) {
      alert('Vui lòng nhập prompt yêu cầu cho phần Mô Tả Video!');
      return;
    }
    const apiKey = aiProvider === 'orimise' ? orimiseKey : geminiKey;
    if (!apiKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    setIsRegeneratingDesc(true);
    try {
      const res = await regenerateDescriptionOnly({
        storySummary: generatedData.storySummary,
        timestamps: generatedData.timestamps || [],
        currentDescription: generatedData.description || '',
        customPrompt: descPrompt,
        genre,
        contentType,
        aiProvider,
        apiKey,
        baseUrl: orimiseBaseUrl,
        model: selectedAnalysisModel
      });

      const updatedData = {
        ...generatedData,
        description: res.description,
        tags: res.tags || generatedData.tags
      };
      setGeneratedData(updatedData);

      if (activeSessionId) {
        setHistorySessions(prev => {
          const updated = prev.map(s => s.id === activeSessionId ? { ...s, generatedData: updatedData } : s);
          saveYoutuberHistoryToDB(updated, activeSessionId);
          return updated;
        });
      }
    } catch (err) {
      alert(`Lỗi viết lại Mô Tả: ${err.message}`);
    } finally {
      setIsRegeneratingDesc(false);
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
  const activeSession = historySessions.find(s => s.id === activeSessionId) || (historySessions.length > 0 ? historySessions[0] : null);

  return (
    <div className="youtuber-studio-layout">
      {/* History Sessions Dropdown Bar */}
      <div className="history-sessions-panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="flex-center gap-2 flex-wrap" style={{ flex: 1, minWidth: '280px' }}>
          <div className="flex-center gap-2 font-bold text-cyan" style={{ whiteSpace: 'nowrap' }}>
            <History size={18} />
            <span>Lịch Sử Phân Tích ({historySessions.length}):</span>
          </div>

          {historySessions.length > 0 ? (
            <div className="select-with-icon" style={{ flex: 1, minWidth: '220px', maxWidth: '420px' }}>
              <FileText size={15} className="text-cyan" />
              <select
                className="input-field select-field font-bold text-cyan"
                style={{ background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.35)', fontSize: '0.88rem' }}
                value={activeSessionId || (historySessions[0] ? historySessions[0].id : '')}
                onChange={(e) => {
                  const chosen = historySessions.find(s => s.id === e.target.value);
                  if (chosen) handleSelectSession(chosen);
                }}
              >
                {historySessions.map((session) => {
                  const displayName = session.title || formatFileRangeTitle(session.fileNames || session.selectedFileIds);
                  const count = session.fileNames?.length || session.selectedFileIds?.length || 1;
                  const time = session.createdAt || '';
                  return (
                    <option key={session.id} value={session.id}>
                      📁 {displayName} ({count} tập) • {time}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <span className="text-xs text-muted">Chưa có phiên phân tích nào. Hãy chọn các tập bên dưới rồi bấm Phân Tích!</span>
          )}

          {/* Quick Action buttons for current active session */}
          {activeSession && (
            <div className="flex-center gap-1">
              {editingSessionId === activeSession.id ? (
                <div className="flex-center gap-1">
                  <input
                    type="text"
                    className="input-field input-xs font-bold"
                    style={{ width: '140px' }}
                    autoFocus
                    value={editSessionTitle}
                    onChange={e => setEditSessionTitle(e.target.value)}
                    onBlur={() => handleSaveRenameSession(activeSession.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRenameSession(activeSession.id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                  />
                  <button className="btn btn-cyan btn-xs font-bold" onClick={() => handleSaveRenameSession(activeSession.id)}>Lưu</button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary btn-xs font-bold"
                  onClick={() => {
                    setEditingSessionId(activeSession.id);
                    setEditSessionTitle(activeSession.title || formatFileRangeTitle(activeSession.fileNames || activeSession.selectedFileIds));
                  }}
                  title="Đổi tên phiên phân tích này"
                >
                  <Edit2 size={13} /> Đổi Tên
                </button>
              )}

              <button
                className="btn btn-secondary btn-xs text-red"
                onClick={(e) => handleDeleteSession(e, activeSession.id)}
                title="Xóa phiên phân tích hiện tại"
              >
                <Trash2 size={13} /> Xóa Phiên Này
              </button>
            </div>
          )}
        </div>

        <div className="flex-center gap-2 ml-auto">
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
              title="Xóa toàn bộ tất cả lịch sử các phiên phân tích"
            >
              <Trash2 size={14} /> Xóa Tất Cả
            </button>
          )}
        </div>
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

        {/* Multi-SRT File Selection Toolbar (Collapsible) */}
        <div className="multi-file-selector-box mb-3 mt-3">
          <div className="flex-between align-start flex-wrap gap-3 mb-2">
            <div>
              <div className="flex-center gap-2 mb-1" style={{ justifyContent: 'flex-start' }}>
                <CheckSquare size={16} className="text-cyan" />
                <span className="text-muted font-bold" style={{ fontSize: '0.85rem' }}>
                  Đang hiện: <strong className="highlight-cyan">{sortedFiles.length}</strong> / {files.length} tập
                </span>
              </div>

              {files.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm font-bold text-cyan flex-center gap-1 mt-1"
                  onClick={() => setIsEpisodesExpanded(prev => !prev)}
                  title={isEpisodesExpanded ? "Thu gọn danh sách tập" : "Mở rộng danh sách tất cả các tập"}
                >
                  {isEpisodesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{isEpisodesExpanded ? 'Thu Gọn Danh Sách' : `Mở Rộng (${files.length} tập)`}</span>
                </button>
              )}
            </div>

            <div style={{ textAlign: 'right', maxWidth: '650px' }}>
              <span className="font-bold text-cyan" style={{ fontSize: '0.92rem' }}>
                Chọn Các Tập SRT Phân Tích Tổng Hợp ({selectedFileIds.length} / {files.length} tập chọn — Tổng {totalSelectedSubtitles.toLocaleString()} dòng thoại):
              </span>
            </div>
          </div>

          {/* Full Selection Controls & Pill Grid (Visible ONLY when expanded - Ảnh 1) */}
          {isEpisodesExpanded && (
            <div className="mt-3" style={{ animation: 'fadeIn 0.2s ease' }}>
              {/* Search, Filter & Bulk Selection Controls */}
              {files.length > 0 && (
                <div className="file-filter-toolbar mb-3" style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="search-box" style={{ maxWidth: '320px', flex: 1 }}>
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="🔍 Tìm mã tập (VD: c9, c2, b2, tập 1, SubGoc...)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="input-field input-sm"
                      autoFocus
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

                  <div className="filter-controls-group flex-wrap gap-2">
                    {/* Search Quick Selection Buttons */}
                    {searchQuery && sortedFiles.length > 0 ? (
                      <>
                        <button
                          className="btn btn-green-glow btn-xs font-bold"
                          onClick={handleKeepOnlyFiltered}
                          title={`Bỏ chọn các tập khác và CHỈ CHỌN đúng ${sortedFiles.length} tập đang khớp với "${searchQuery}"`}
                        >
                          <CheckCircle2 size={13} /> CHỈ CHỌN {sortedFiles.length} TẬP ĐANG LỌC
                        </button>
                        <button
                          className="btn btn-cyan btn-xs font-bold"
                          onClick={handleSelectAllFiltered}
                          title={`Thêm ${sortedFiles.length} tập đang lọc vào danh sách chọn`}
                        >
                          [✓] Thêm {sortedFiles.length} Tập
                        </button>
                        <button
                          className="btn btn-secondary btn-xs text-red"
                          onClick={handleDeselectAllFiltered}
                          title={`Bỏ chọn ${sortedFiles.length} tập đang lọc`}
                        >
                          [✕] Bỏ {sortedFiles.length} Tập
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-secondary btn-xs font-bold" onClick={handleSelectAllFiles}>
                          [✓] Chọn Tất Cả ({files.length} tập)
                        </button>
                        <button className="btn btn-secondary btn-xs" onClick={handleDeselectAllFiles}>
                          [✕] Chọn 1 Tập
                        </button>
                      </>
                    )}

                    <div className="select-with-icon">
                      <Filter size={13} className="text-cyan" />
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="input-field select-field input-xs"
                      >
                        <option value="all">Tất cả ({files.length})</option>
                        <option value="pending">Chưa dịch</option>
                        <option value="done">Đã dịch xong</option>
                      </select>
                    </div>

                    <div className="select-with-icon">
                      <ArrowUpDown size={13} className="text-cyan" />
                      <select
                        value={sortOption}
                        onChange={e => setSortOption(e.target.value)}
                        className="input-field select-field input-xs"
                      >
                        <option value="natural">Tự nhiên (1, 2, ... 10)</option>
                        <option value="name_asc">Tên A &rarr; Z</option>
                        <option value="name_desc">Tên Z &rarr; A</option>
                        <option value="lines_desc">Số dòng (Nhiều &rarr; Ít)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="file-checkboxes-grid expanded">
                {sortedFiles.map(f => {
                  const isChecked = selectedFileIds.includes(f.id);
                  const translatedCount = f.subtitles.filter(s => s.status === 'translated' || s.status === 'edited').length;
                  const isDone = translatedCount === f.subtitles.length && f.subtitles.length > 0;

                  return (
                    <label key={f.id} className={`file-checkbox-pill ${isChecked ? 'checked' : ''} ${isDone ? 'done-border' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectFile(f.id)}
                      />
                      <span className="file-pill-name" title={f.name}>{f.name}</span>
                      <span className="file-pill-lines">({f.subtitles.length} dòng)</span>
                      {isDone && <span className="text-emerald" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>✓</span>}
                    </label>
                  );
                })}

                {sortedFiles.length === 0 && files.length > 0 && (
                  <div className="empty-state-filter p-2 text-muted" style={{ fontSize: '0.85rem' }}>
                    Không tìm thấy tập nào khớp với từ khóa "<span className="highlight-cyan">{searchQuery}</span>".
                    <button
                      className="btn btn-secondary btn-xs ml-2"
                      onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                )}

                {files.length === 0 && <span className="text-muted">Chưa có file SRT nào trong danh sách. Hãy nạp file SRT ở tab Trình Dịch.</span>}
              </div>
            </div>
          )}
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

          <div className="control-action flex-center flex-wrap gap-2">
            <button
              className="btn btn-cyan btn-lg font-bold btn-glow"
              onClick={handleGenerate}
              disabled={isGenerating || isBatchGenerating || files.length === 0}
              title="Phân tích các tập đang chọn và tạo giao diện Studio trực tiếp"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={20} className="spinner" />
                  <span>Đang Phân Tích...</span>
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  <span>⚡ PHÂN TÍCH {selectedFileIds.length} TẬP ĐANG CHỌN</span>
                </>
              )}
            </button>

            {files.length > 1 && (
              <button
                className="btn btn-purple-glow btn-lg font-bold flex-center gap-2"
                onClick={handleBatchGenerateSeries}
                disabled={isGenerating || isBatchGenerating || files.length === 0}
                title="Phân tích đồng loạt tất cả các tập của bộ phim bằng AI và tự động xuất ra bảng tổng hợp Excel / CSV"
              >
                {isBatchGenerating ? (
                  <>
                    <RefreshCw size={20} className="spinner" />
                    <span>Đang Xử Lý {batchProgress.current}/{batchProgress.total} Tập...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>🚀 PHÂN TÍCH TẤT CẢ {files.length} TẬP (XUẤT EXCEL)</span>
                  </>
                )}
              </button>
            )}
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

              {/* 💡 Inline Prompt Input for Re-rendering Story Summary */}
              <div className="prompt-inline-action-bar emerald">
                <Sparkles size={15} className="text-emerald" />
                <input
                  type="text"
                  className="prompt-inline-input"
                  placeholder="💡 Nhập prompt viết lại Tóm Tắt (VD: Chi tiết hơn phân cảnh đại chiến, rút ngắn lại, phong cách gay cấn...)..."
                  value={summaryPrompt}
                  onChange={e => setSummaryPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegenerateSummary()}
                />
                <button
                  type="button"
                  className="btn btn-green-glow btn-sm font-bold flex-center gap-1"
                  style={{ whiteSpace: 'nowrap', padding: '5px 12px' }}
                  onClick={handleRegenerateSummary}
                  disabled={isRegeneratingSummary || !summaryPrompt.trim()}
                  title="Viết lại tóm tắt cốt truyện theo prompt riêng này"
                >
                  {isRegeneratingSummary ? <RefreshCw size={14} className="spinner" /> : <Wand2 size={14} />}
                  <span>{isRegeneratingSummary ? 'Đang viết...' : 'Render Lại'}</span>
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

            {/* 💡 Inline Prompt Input for Re-rendering Titles & 2-Line Text Thumbnails */}
            <div className="prompt-inline-action-bar cyan">
              <Sparkles size={15} className="text-cyan" />
              <input
                type="text"
                className="prompt-inline-input"
                placeholder="💡 Nhập prompt tạo lại 5 Title & Thumbnail (VD: Giật gân, tập trung vả mặt...)..."
                value={titlePrompt}
                onChange={e => setTitlePrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegenerateTitles()}
              />
              <button
                type="button"
                className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                style={{ whiteSpace: 'nowrap', padding: '5px 12px' }}
                onClick={handleRegenerateTitles}
                disabled={isRegeneratingTitles || !titlePrompt.trim()}
                title="Tạo lại 5 Tiêu Đề và 5 Mẫu Chữ Thumbnail theo prompt riêng này"
              >
                {isRegeneratingTitles ? <RefreshCw size={14} className="spinner" /> : <Wand2 size={14} />}
                <span>{isRegeneratingTitles ? 'Đang tạo...' : 'Render Lại'}</span>
              </button>
            </div>


            <div className="titles-list">
              {generatedData.titles.map((title, idx) => {
                const isSelected = selectedTitleIndex === idx;
                const charCount = title.length;
                let badgeClass = 'char-badge-optimal'; // <= 70 (Emerald)
                let badgeLabel = `${charCount}/70 kt`;
                let badgeTooltip = `${charCount} ký tự (Chuẩn SEO Mobile & Desktop < 70 ký tự)`;
                if (charCount > 70 && charCount <= 100) {
                  badgeClass = 'char-badge-warning'; // Gold
                  badgeLabel = `${charCount}/100 kt`;
                  badgeTooltip = `${charCount} ký tự (Khá tốt, có thể bị rút gọn trên Mobile)`;
                } else if (charCount > 100) {
                  badgeClass = 'char-badge-danger'; // Red
                  badgeLabel = `${charCount} kt ⚠️`;
                  badgeTooltip = `${charCount} ký tự (Quá dài > 100 ký tự, sẽ bị YouTube cắt bớt!)`;
                }

                return (
                  <div
                    key={idx}
                    className={`title-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTitleIndex(idx);
                      if (generatedData.thumbnailTexts && generatedData.thumbnailTexts[idx]) {
                        setSelectedTextIndex(idx);
                        setCustomLine1(generatedData.thumbnailTexts[idx].line1);
                        setCustomLine2(generatedData.thumbnailTexts[idx].line2);
                      }
                    }}
                    title={`Bấm để chọn Tiêu đề #${idx + 1} & Tự động nạp Chữ Thumbnail #${idx + 1} tương ứng lên Live Mockup`}
                  >
                    <div className="title-number">#{idx + 1}</div>
                    <div className="title-text" style={{ flex: 1 }}>{title}</div>
                    <span className={`char-count-badge ${badgeClass}`} title={badgeTooltip} style={{ fontSize: '0.75rem', padding: '2px 8px', fontWeight: 600 }}>
                      {badgeLabel}
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


            {/* 5 Paired 2-Line Thumbnail Text Overlay Suggestions */}
            <div className="column-header mt-4">
              <Type size={20} className="text-purple" />
              <h3>🖼️ 5 Mẫu Chữ Thumbnail 2 Dòng (Khớp 1-1 Theo 5 Tiêu Đề)</h3>
            </div>

            <div className="thumbnail-texts-list">
              {(generatedData.thumbnailTexts || []).map((item, idx) => {
                const isSelected = selectedTextIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`text-overlay-card-2line ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTextIndex(idx);
                      setCustomLine1(item.line1);
                      setCustomLine2(item.line2);
                      if (generatedData.titles && generatedData.titles[idx]) {
                        setSelectedTitleIndex(idx);
                      }
                    }}
                    title={`Bấm để đưa Chữ Thumbnail #${idx + 1} & Tiêu Đề #${idx + 1} lên Live Mockup`}
                  >
                    <span className="overlay-badge">Mẫu #{idx + 1} (Khớp Tiêu Đề #{idx + 1})</span>
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

              {/* 👥 Character Reference Images Panel for High-Accuracy AI Image Prompt */}
              <div className="char-ref-panel mb-3 p-3 rounded" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '10px' }}>
                <div className="flex-between mb-2" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <div className="flex-center gap-2">
                    <span className="text-sm font-bold text-purple flex-center gap-1">
                      <Users size={16} /> 👥 Ảnh Tham Chiếu Nhân Vật ({characterRefImages.length}):
                    </span>
                    <span className="text-xs text-muted">
                      (AI sẽ soi ảnh để tạo Prompt Midjourney/Flux khớp 100% nhân vật trong phim)
                    </span>
                  </div>

                  <div className="flex-center gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs font-bold flex-center gap-1"
                      onClick={() => charImageInputRef.current?.click()}
                      title="Tải ảnh nhân vật/thần binh từ máy tính lên làm ảnh tham chiếu"
                    >
                      <Upload size={13} /> 📷 Up Ảnh Nhân Vật
                    </button>
                    <input
                      type="file"
                      ref={charImageInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleUploadCharacterImage}
                      hidden
                    />

                    {characters && characters.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-purple btn-xs font-bold flex-center gap-1"
                        onClick={() => setIsCharPickerOpen(!isCharPickerOpen)}
                        title="Chọn từ danh sách nhân vật đã quét từ video"
                      >
                        <Sparkles size={13} /> 🎭 Chọn Từ DS Quét ({characters.length})
                      </button>
                    )}

                    {characterRefImages.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs text-red font-bold"
                        onClick={() => setCharacterRefImages([])}
                        title="Xóa toàn bộ ảnh tham chiếu"
                      >
                        <Trash2 size={13} /> Xóa Hết
                      </button>
                    )}
                  </div>
                </div>

                {/* Modal / Dropdown Picker for Scanned Characters */}
                {isCharPickerOpen && characters && characters.length > 0 && (
                  <div className="char-picker-dropdown mb-3 p-2 rounded" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #a855f7', maxHeight: '220px', overflowY: 'auto' }}>
                    <div className="flex-between mb-2">
                      <span className="text-xs font-bold text-cyan">Chọn nhân vật để nạp ảnh vào Prompt AI:</span>
                      <button className="btn-icon btn-xs text-muted" onClick={() => setIsCharPickerOpen(false)}>✕</button>
                    </div>
                    <div className="flex-center gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                      {characters.map(char => {
                        const isSelected = characterRefImages.some(c => c.id === char.id || (c.name && c.name === char.name));
                        return (
                          <div
                            key={char.id}
                            onClick={() => handleToggleLoreCharacterRef(char)}
                            className={`char-pick-chip flex-center gap-1 p-1 rounded cursor-pointer ${isSelected ? 'active' : ''}`}
                            style={{
                              background: isSelected ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255,255,255,0.05)',
                              border: isSelected ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                              padding: '4px 8px',
                              fontSize: '12px'
                            }}
                          >
                            {char.thumbnail && (
                              <img src={char.thumbnail} alt={char.name} style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                            )}
                            <span className="font-bold">{char.name}</span>
                            {isSelected && <Check size={12} className="text-emerald ml-1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Character Reference Thumbnails Ribbon */}
                {characterRefImages.length > 0 ? (
                  <div className="char-refs-grid flex-center gap-2 mt-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    {characterRefImages.map((ref) => (
                      <div
                        key={ref.id}
                        className="char-ref-card flex-center gap-2 p-1 rounded"
                        style={{
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid rgba(168, 85, 247, 0.4)',
                          borderRadius: '6px',
                          position: 'relative'
                        }}
                      >
                        {ref.thumbnail && (
                          <img src={ref.thumbnail} alt={ref.name} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} />
                        )}
                        <div className="char-ref-info" style={{ fontSize: '11px', minWidth: '90px', maxWidth: '160px' }}>
                          <div className="font-bold text-cyan text-truncate">{ref.name}</div>
                          <div className="text-muted text-truncate">{ref.role || 'Nhân vật phim'}</div>
                        </div>
                        <button
                          type="button"
                          className="btn-icon btn-xs text-red"
                          onClick={() => handleRemoveCharacterRef(ref.id)}
                          title="Bỏ ảnh này"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted text-center p-2">
                    💡 Chưa chọn ảnh tham chiếu nào. Hãy tải ảnh lên hoặc chọn từ danh sách nhân vật đã quét để AI mô tả chính xác thần thái & trang phục của phim!
                  </div>
                )}

                {/* Quick Character Prompt Action Presets */}
                <div className="prompt-presets-chips flex-center gap-1 mt-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  <span className="text-xs text-muted mr-1">Mẫu nhanh:</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs font-bold"
                    onClick={() => setImageIdeaPrompt(`Hai nhân vật chính đối đầu đại chiến kịch tính trên không trung, kiếm khí rực lửa hoàng kim, ánh mắt rực sáng linh lực`)}
                  >
                    ⚔️ Đại Chiến Đối Đầu
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs font-bold"
                    onClick={() => setImageIdeaPrompt(`Cận cảnh nhân vật chính thức tỉnh thần thông, mắt phát sáng linh lực, linh kiếm hộ thể bao quanh bởi lôi điện tím`)}
                  >
                    ⚡ Thức Tỉnh Thần Thông
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs font-bold"
                    onClick={() => setImageIdeaPrompt(`Nhân vật chính đứng trên đỉnh núi mây mù, triệu hồi rồng thần hoàng kim khổng lồ uy phong lẫm liệt`)}
                  >
                    🐉 Triệu Hồi Linh Thú
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs font-bold"
                    onClick={() => setImageIdeaPrompt(`Nhân vật chính bị thương nhưng ánh mắt kiên định bộc phát sức mạnh cấm kỵ lật ngược tình thế`)}
                  >
                    🔥 Lật Ngược Tình Thế
                  </button>
                </div>
              </div>

              {/* 💡 Inline Prompt Input for Re-rendering AI Image Prompts */}
              <div className="prompt-inline-action-bar purple mb-2">
                <Sparkles size={15} className="text-purple" />
                <input
                  type="text"
                  className="prompt-inline-input"
                  placeholder="💡 Nhập prompt tạo lại Ý Tưởng & Prompt Ảnh (VD: Rồng thần hoàng kim bốc cháy, ma tôn huyết kiếm...)..."
                  value={imageIdeaPrompt}
                  onChange={e => setImageIdeaPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegenerateImagePrompt()}
                />
                <button
                  type="button"
                  className="btn btn-purple-glow btn-sm font-bold flex-center gap-1"
                  style={{ whiteSpace: 'nowrap', padding: '5px 12px' }}
                  onClick={handleRegenerateImagePrompt}
                  disabled={isRegeneratingImagePrompt || (!imageIdeaPrompt.trim() && characterRefImages.length === 0)}
                  title="Tạo lại prompt vẽ ảnh tiếng Anh và mô tả tiếng Việt theo prompt riêng này cùng ảnh tham chiếu"
                >
                  {isRegeneratingImagePrompt ? <RefreshCw size={14} className="spinner" /> : <Wand2 size={14} />}
                  <span>{isRegeneratingImagePrompt ? 'Đang tạo...' : 'Render Lại'}</span>
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

            {/* 💡 Inline Prompt Input for Re-rendering Description & Tags */}
            <div className="prompt-inline-action-bar purple">
              <Sparkles size={15} className="text-purple" />
              <input
                type="text"
                className="prompt-inline-input"
                placeholder="💡 Nhập prompt viết lại Mô Tả (VD: Thêm lời cảm ơn, link donate, kêu gọi Subscribe...)..."
                value={descPrompt}
                onChange={e => setDescPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegenerateDesc()}
              />
              <button
                type="button"
                className="btn btn-purple-glow btn-sm font-bold flex-center gap-1"
                style={{ whiteSpace: 'nowrap', padding: '5px 12px' }}
                onClick={handleRegenerateDesc}
                disabled={isRegeneratingDesc || !descPrompt.trim()}
                title="Viết lại nội dung mô tả video và thẻ tags theo prompt riêng này"
              >
                {isRegeneratingDesc ? <RefreshCw size={14} className="spinner" /> : <Wand2 size={14} />}
                <span>{isRegeneratingDesc ? 'Đang viết...' : 'Render Lại'}</span>
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

            <div className="column-header mt-4 flex-between flex-wrap gap-2">
              <div className="flex-center gap-2">
                <Tag size={20} className="text-purple" />
                <h3 className="mb-0">🏷️ Thẻ Tags & Từ Khóa SEO YouTube</h3>
                {(() => {
                  const commaStr = formatCommaTags(generatedData.tags);
                  const isUnder500 = commaStr.length <= 500;
                  return (
                    <span
                      className={`char-count-badge ${isUnder500 ? 'char-badge-optimal' : 'char-badge-danger'}`}
                      title={`${commaStr.length}/500 ký tự (Giới hạn tối đa của YouTube Studio là 500 ký tự)`}
                      style={{ fontSize: '0.75rem', padding: '2px 8px', fontWeight: 600 }}
                    >
                      {commaStr.length}/500 kt {isUnder500 ? '✓' : '⚠️ Quá'}
                    </span>
                  );
                })()}
              </div>
              <div className="flex-center gap-1">
                <button
                  className="btn btn-green-glow btn-sm font-bold"
                  onClick={() => handleCopy(formatCommaTags(generatedData.tags), 'tags_comma')}
                  title="Sao chép toàn bộ tags dưới dạng phân tách bằng dấu phẩy để dán trực tiếp vào ô Thẻ Tags của YouTube Studio"
                >
                  {copiedField === 'tags_comma' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>📋 Copy Tags (Dạng Phẩy ,)</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy(formatHashTags(generatedData.tags), 'tags_hash')}
                  title="Sao chép dạng #Hashtag để dán vào cuối phần Mô Tả Video"
                >
                  {copiedField === 'tags_hash' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span># Hashtags</span>
                </button>
              </div>
            </div>

            <textarea
              className="input-field textarea-field tags-box font-mono"
              rows={4}
              value={formatCommaTags(generatedData.tags) || generatedData.tags}
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
            Hãy chọn các tập SRT ở phía trên và bấm nút <strong className="highlight-cyan">"⚡ PHÂN TÍCH TẬP ĐANG CHỌN"</strong> hoặc <strong className="highlight-cyan">"🚀 PHÂN TÍCH TẤT CẢ TẬP (XUẤT EXCEL)"</strong>!
          </p>
        </div>
      )}

      {/* 🚀 Batch Studio Results Modal (Feature 6) */}
      {showBatchModal && batchResults && (
        <div className="modal-backdrop modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div
            className="modal-content card-panel"
            style={{ maxWidth: '1050px', width: '95vw', maxHeight: '90vh', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >

            {/* Header */}
            <div className="modal-header flex-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex-center gap-2">
                <Sparkles size={22} className="text-purple pulse" />
                <h3 className="text-purple font-bold mb-0">
                  🚀 Bảng Tổng Hợp YouTube Studio Toàn Bộ {batchResults.length} Tập Phim
                </h3>
              </div>
              <div className="flex-center gap-2">
                <button
                  className="btn btn-green-glow btn-sm font-bold flex-center gap-1"
                  onClick={() => exportStudioResultsToCSV(batchResults, 'Bo_Phim_YouTube_Studio')}
                  title="Tải về file Excel / CSV đầy đủ cột để quản lý và đăng video hàng loạt"
                >
                  <Download size={15} /> Xuất Bảng Excel / CSV
                </button>
                <button
                  className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                  onClick={() => exportStudioResultsToTXT(batchResults, 'Bo_Phim_YouTube_Studio')}
                  title="Tải về file văn bản TXT tổng hợp"
                >
                  <Download size={15} /> Xuất File TXT
                </button>
                <button className="btn-icon text-muted ml-2" onClick={() => setShowBatchModal(false)}>
                  ✕
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
              <table className="glossary-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 2 }}>
                    <th style={{ width: '45px', textAlign: 'center', padding: '8px 4px' }}>#</th>
                    <th style={{ width: '140px', padding: '8px' }}>Tập Phim</th>
                    <th style={{ minWidth: '240px', padding: '8px' }}>Tiêu Đề Clickbait Tối Ưu</th>
                    <th style={{ width: '220px', padding: '8px' }}>Chữ Thumbnail 2 Dòng</th>
                    <th style={{ width: '90px', textAlign: 'center', padding: '8px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((item, idx) => {
                    const d = item.data || {};
                    const topTitle = d.titles?.[0] || '---';
                    const thumb = d.thumbnailTexts?.[0] || {};

                    return (
                      <tr key={item.fileId || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td className="font-bold text-cyan">{item.episodeName || item.fileName}</td>
                        <td>
                          <div className="font-bold text-amber mb-1">{topTitle}</div>
                          <span className="text-xs text-muted">({topTitle.length}/70 kt)</span>
                        </td>
                        <td>
                          <div className="text-xs text-amber font-bold">{thumb.line1}</div>
                          <div className="text-xs text-cyan font-bold">{thumb.line2}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => {
                              if (item.data) {
                                setGeneratedData(item.data);
                                setSelectedFileIds([item.fileId]);
                                setSelectedTitleIndex(0);
                                setSelectedTextIndex(0);
                                if (item.data.thumbnailTexts?.[0]) {
                                  setCustomLine1(item.data.thumbnailTexts[0].line1);
                                  setCustomLine2(item.data.thumbnailTexts[0].line2);
                                }
                                setShowBatchModal(false);
                              }
                            }}
                            title="Nạp dữ liệu tập này vào màn hình Studio chính để xem chi tiết & render ảnh"
                          >
                            Xem Studio
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="modal-footer flex-between mt-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span className="text-sm text-muted">
                Đã hoàn tất phân tích <strong className="highlight-cyan">{batchResults.length} tập</strong> bằng AI.
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBatchModal(false)}>
                Đóng Bảng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

