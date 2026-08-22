import React, { useState, useRef } from 'react';
import { 
  Users, Sparkles, Plus, Download, Copy, Check, Trash2, Edit3, Film, 
  Layers, Clock, Shield, Search, ChevronRight, Video, ArrowRight, BookOpen, AlertCircle, UploadCloud,
  Eye, Camera, Play, CheckCircle2
} from 'lucide-react';
import { 
  extractCharactersWithAI, 
  generateCharacterIntroSRT, 
  generateCharacterIntroASS, 
  stitchAllFilesToFullMovieSRT,
  msToSrtTime,
  srtTimeToMs,
  readMediaDuration,
  findFileOffset,
  computeFileOffsets,
  extractFramesFromVideo,
  scanVideoFramesWithVisionAI
} from '../utils/characterExtractor';



// Extract clean file name without path, extension, symbols for fuzzy video matching
function extractCleanName(filename) {
  if (!filename) return '';
  const base = filename.split(/[/\\]/).pop();
  return base.replace(/\.[^/.]+$/, '').trim().toLowerCase();
}

// Smart Video to Subtitle File Matcher
function matchVideoToFile(videoName, fileList) {
  const cleanVideo = extractCleanName(videoName);
  if (!cleanVideo) return null;

  // 1. Exact match with clean filename
  for (const file of fileList) {
    const cleanSrt = extractCleanName(file.name);
    if (cleanSrt === cleanVideo) return file;
  }

  // 2. Substring match
  for (const file of fileList) {
    const cleanSrt = extractCleanName(file.name);
    if (cleanSrt.includes(cleanVideo) || cleanVideo.includes(cleanSrt)) return file;
  }

  // 3. Number/Episode extraction match (e.g. 'd7_01' matches 'd7_01.mp4' or '01' matches '01.mp4')
  const videoNumbers = cleanVideo.match(/\d+/g);
  if (videoNumbers && videoNumbers.length > 0) {
    const videoKey = videoNumbers.join('_');
    for (const file of fileList) {
      const cleanSrt = extractCleanName(file.name);
      const srtNumbers = cleanSrt.match(/\d+/g);
      if (srtNumbers && srtNumbers.join('_') === videoKey) {
        return file;
      }
    }
  }

  return null;
}

export default function CharacterLoreStudio({ 
  files = [], 
  aiProvider = 'orimise',
  orimiseKey = 'sk-544e5d8289b304b8198e534f18da07085ce0768a95d2ca1b76970a2d8a1d082f',
  orimiseBaseUrl = 'https://api.orimise.com/v1',
  geminiKey = '',
  aiModel = 'gemini-2.5-flash',
  characters = [], 
  setCharacters 
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [copiedText, setCopiedText] = useState(false);
  const [activeTabSub, setActiveTabSub] = useState('characters'); // 'characters' | 'stitching'

  // File filtering and selection for timeline stitching & selective AI scan
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Video Duration Table for Timeline Stitching: { [fileId]: durationInSeconds }
  const [fileDurations, setFileDurations] = useState({});
  const [gapSeconds, setGapSeconds] = useState(0);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

  // Edit / Add Character Modal State
  const [editingChar, setEditingChar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const videoInputRef = useRef(null);

  // Filtered files for timeline stitching
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase()));

  // Effective target files for scanning and stitching
  const effectiveTargetFiles = selectedFileIds.length > 0 
    ? files.filter(f => selectedFileIds.includes(f.id)) 
    : (fileSearchQuery ? filteredFiles : files);

  const isAllFilteredSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedFileIds.includes(f.id));
  const someFilteredSelected = filteredFiles.some(f => selectedFileIds.includes(f.id));

  const handleSelectAllFilteredFiles = () => {
    const filteredIdSet = new Set(filteredFiles.map(f => f.id));
    setSelectedFileIds(prev => Array.from(new Set([...prev, ...filteredIdSet])));
  };

  const handleDeselectFilteredFiles = () => {
    const filteredIdSet = new Set(filteredFiles.map(f => f.id));
    setSelectedFileIds(prev => prev.filter(id => !filteredIdSet.has(id)));
  };

  const toggleSelectFile = (fileId, e) => {
    e?.stopPropagation();
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  // Handle AI Scan
  const handleScanCharacters = async () => {
    const effectiveKey = aiProvider === 'orimise'
      ? (orimiseKey || 'sk-544e5d8289b304b8198e534f18da07085ce0768a95d2ca1b76970a2d8a1d082f')
      : geminiKey;

    if (!effectiveKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong mục "Cấu Hình AI Gemini" trước khi quét!`);
      return;
    }
    if (!effectiveTargetFiles || effectiveTargetFiles.length === 0) {
      alert('Vui lòng chọn ít nhất 1 file phụ đề SRT để quét!');
      return;
    }

    setIsScanning(true);
    setScanProgress(`AI đang đọc và phân tích cốt truyện từ ${effectiveTargetFiles.length} tập phim...`);

    try {
      const extracted = await extractCharactersWithAI({
        files: effectiveTargetFiles,
        apiKey: effectiveKey,
        aiProvider,
        baseUrl: orimiseBaseUrl,
        model: aiModel
      });

      if (extracted.length === 0) {
        alert('Không tìm thấy nhân vật nào nổi bật trong các file phụ đề.');
      } else {
        setCharacters(prev => {
          // Merge with existing avoiding duplicate names
          const existingNames = new Set(prev.map(c => c.name.toLowerCase().trim()));
          const newUnique = extracted.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
          return [...prev, ...newUnique];
        });
        setScanProgress(`✅ Đã tìm thấy ${extracted.length} nhân vật và mốc thời gian xuất hiện đầu tiên!`);
        setTimeout(() => setScanProgress(''), 4000);
      }
    } catch (err) {
      alert(`Lỗi khi quét nhân vật: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Total Movie Duration manual input state
  const [manualTotalDurationSec, setManualTotalDurationSec] = useState('');

  // Handle Video Upload or Drop to auto-detect clip durations
  const handleVideoUpload = async (e) => {
    const rawFiles = Array.from(e.target?.files || e.dataTransfer?.files || []);
    const uploadedVideos = rawFiles.filter(
      f => f.type.startsWith('video/') || /\.(mp4|mkv|avi|mov|webm|flv|ts|m4v)$/i.test(f.name)
    );

    if (uploadedVideos.length === 0) {
      alert('Vui lòng chọn hoặc kéo thả các file video (định dạng .mp4, .mkv, .avi, .mov...)!');
      return;
    }

    setIsScanning(true);
    setScanProgress(`🎬 Đang phân tích thời lượng từ ${uploadedVideos.length} video...`);

    const targetPool = effectiveTargetFiles.length > 0 ? effectiveTargetFiles : files;

    // CASE 1: Single Joined Video uploaded for multiple episode files (e.g. 1 video of 3h35m for 34 episodes)
    if (uploadedVideos.length === 1 && targetPool.length > 1) {
      const singleVideo = uploadedVideos[0];
      const totalVideoDuration = await readMediaDuration(singleVideo);

      if (totalVideoDuration !== null && totalVideoDuration > 0) {
        // Calculate total subtitle duration sum of all episodes
        let totalSubSec = 0;
        const episodeSubDurations = targetPool.map(f => {
          const subs = f.subtitles || [];
          const lastSub = subs[subs.length - 1];
          const durSec = lastSub ? srtTimeToMs(lastSub.endTime) / 1000 : 900;
          totalSubSec += durSec;
          return { id: f.id, durSec };
        });

        // Scale factor so sum matches exactly totalVideoDuration
        const scale = totalSubSec > 0 ? (totalVideoDuration / totalSubSec) : 1;

        const newDurations = {};
        episodeSubDurations.forEach(ep => {
          newDurations[ep.id] = Math.round(ep.durSec * scale * 100) / 100;
        });

        setFileDurations(prev => ({ ...prev, ...newDurations }));
        setManualTotalDurationSec(Math.round(totalVideoDuration));
        setIsScanning(false);
        setScanProgress(`✅ Đã nhận diện Video Gộp Toàn Bộ (${Math.round(totalVideoDuration)}s = ${msToSrtTime(totalVideoDuration * 1000)}) và tự động phân bổ chính xác cho ${targetPool.length} tập!`);
        setTimeout(() => setScanProgress(''), 5000);

        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }
    }

    // CASE 2: Multiple Video Clips (e.g. each clip matches 1 episode)
    const newDurations = {};
    let matchedCount = 0;

    uploadedVideos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (let i = 0; i < uploadedVideos.length; i++) {
      const videoFile = uploadedVideos[i];
      const duration = await readMediaDuration(videoFile);

      if (duration !== null && duration > 0) {
        let matchedFile = matchVideoToFile(videoFile.name, targetPool);

        if (!matchedFile && targetPool !== files) {
          matchedFile = matchVideoToFile(videoFile.name, files);
        }

        if (!matchedFile && i < targetPool.length) {
          matchedFile = targetPool[i];
        }

        if (matchedFile) {
          newDurations[matchedFile.id] = duration;
          matchedCount++;
        }
      }
    }

    setFileDurations(prev => ({ ...prev, ...newDurations }));
    setIsScanning(false);

    if (matchedCount > 0) {
      setScanProgress(`✅ Đã đọc và khớp thời lượng thành công cho ${matchedCount} / ${uploadedVideos.length} video clip!`);
      setTimeout(() => setScanProgress(''), 5000);
    } else {
      alert(`Đã nhận ${uploadedVideos.length} video nhưng không thể tự động trích xuất thời lượng. Bạn có thể nhập trực tiếp số giây vào bảng.`);
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  // Handle Manual Total Duration Distribution
  const handleDistributeTotalDuration = () => {
    const totalSec = parseFloat(manualTotalDurationSec);
    if (!totalSec || isNaN(totalSec) || totalSec <= 0) {
      alert('Vui lòng nhập tổng thời lượng hợp lệ (tính bằng số giây, ví dụ: 12918)!');
      return;
    }

    const targetPool = effectiveTargetFiles.length > 0 ? effectiveTargetFiles : files;
    let totalSubSec = 0;
    const episodeSubDurations = targetPool.map(f => {
      const subs = f.subtitles || [];
      const lastSub = subs[subs.length - 1];
      const durSec = lastSub ? srtTimeToMs(lastSub.endTime) / 1000 : 900;
      totalSubSec += durSec;
      return { id: f.id, durSec };
    });

    const scale = totalSubSec > 0 ? (totalSec / totalSubSec) : 1;
    const newDurations = {};
    episodeSubDurations.forEach(ep => {
      newDurations[ep.id] = Math.round(ep.durSec * scale * 100) / 100;
    });

    setFileDurations(prev => ({ ...prev, ...newDurations }));
    setScanProgress(`✅ Đã phân bổ tổng thời lượng ${totalSec}s (${msToSrtTime(totalSec * 1000)}) cho ${targetPool.length} tập!`);
    setTimeout(() => setScanProgress(''), 4000);
  };

  // Reset file durations to default from subtitles
  const handleResetDurationsToSubtitles = () => {
    setFileDurations({});
    setManualTotalDurationSec('');
    setScanProgress('🔄 Đã đặt lại thời lượng các tập phim theo mốc dòng sub cuối cùng!');
    setTimeout(() => setScanProgress(''), 3000);
  };



  // Vision Scanner States
  const [visionVideoFile, setVisionVideoFile] = useState(null);
  const [visionIntervalSec, setVisionIntervalSec] = useState(10);
  const [visionMaxFrames, setVisionMaxFrames] = useState(150);
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [visionProgress, setVisionProgress] = useState(null);
  const [liveCurrentFrame, setLiveCurrentFrame] = useState(null);
  const [visionDetectedChars, setVisionDetectedChars] = useState([]);
  const visionInputRef = useRef(null);

  // Handle Start Vision Scan on Video Frames
  const handleStartVisionScan = async () => {
    if (!visionVideoFile) {
      alert('Vui lòng chọn hoặc kéo thả file video MP4 cần quét thị giác!');
      return;
    }

    const effectiveKey = aiProvider === 'orimise'
      ? (orimiseKey || 'sk-544e5d8289b304b8198e534f18da07085ce0768a95d2ca1b76970a2d8a1d082f')
      : geminiKey;

    if (!effectiveKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    setIsVisionScanning(true);
    setVisionDetectedChars([]);
    setVisionProgress({ phase: 'extracting', percent: 0, message: 'Đang trích xuất các khung hình từ video...' });

    try {
      // 1. Extract frames locally in browser canvas (0 MB video upload, ultra fast)
      const frames = await extractFramesFromVideo(visionVideoFile, {
        intervalSec: Number(visionIntervalSec),
        maxFrames: Number(visionMaxFrames),
        onProgress: (p) => {
          setVisionProgress({
            phase: 'extracting',
            percent: p.percent,
            message: `Đang chụp khung hình ${p.current}/${p.total} (Mốc ${p.timeFormatted})...`
          });
        }
      });

      if (frames.length === 0) {
        throw new Error('Không trích xuất được khung hình nào từ video.');
      }

      // 2. Scan with Vision AI (Gemini Vision / Orimise Vision)
      setVisionProgress({ phase: 'ai_scanning', percent: 0, message: `Bắt đầu gửi ${frames.length} khung hình sang AI Vision soi bảng tên chữ Hán...` });

      const detected = await scanVideoFramesWithVisionAI({
        frames,
        videoFileName: visionVideoFile.name,
        apiKey: effectiveKey,
        aiProvider,
        baseUrl: orimiseBaseUrl,
        model: aiModel || 'gemini-2.5-flash',
        batchSize: 4,
        onProgress: (p) => {
          setVisionProgress({
            phase: 'ai_scanning',
            percent: p.percent,
            message: p.message
          });
          if (frames[p.current - 1]) {
            setLiveCurrentFrame(frames[p.current - 1].base64Full);
          }
        }
      });

      if (detected.length === 0) {
        alert('AI đã quét các khung hình nhưng không phát hiện bảng tên nhân vật nào. Bạn có thể chọn khoảng cách quét dày hơn (VD: 5 giây) để quét chi tiết hơn.');
      } else {
        setVisionDetectedChars(detected);
        setCharacters(prev => {
          const existingNames = new Set(prev.map(c => c.name.toLowerCase().trim()));
          const newChars = detected.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
          return [...newChars, ...prev];
        });
        setScanProgress(`🎉 AI Vision đã tìm thấy ${detected.length} bảng tên nhân vật chính xác từng khung hình trên video!`);
        setTimeout(() => setScanProgress(''), 5000);
      }
    } catch (err) {
      alert(`Lỗi khi quét thị giác video: ${err.message}`);
    } finally {
      setIsVisionScanning(false);
      setVisionProgress(null);
      setLiveCurrentFrame(null);
    }
  };

  // Toggle Character Enabled
  const toggleCharacter = (id) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  // Delete Character
  const deleteCharacter = (id) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  // Save Character (Add/Edit)
  const saveCharacter = (charData) => {
    if (charData.id) {
      // Update
      setCharacters(prev => prev.map(c => c.id === charData.id ? charData : c));
    } else {
      // Add
      const newChar = {
        ...charData,
        id: `char_${Date.now()}`,
        enabled: true
      };
      setCharacters(prev => [newChar, ...prev]);
    }
    setIsModalOpen(false);
    setEditingChar(null);
  };

  const fileOffsets = computeFileOffsets(effectiveTargetFiles, fileDurations, gapSeconds);

  // Helper to compute cumulative full movie MP4 timestamp for each character
  const getFullMovieTimestamp = (char) => {
    if (char.source === 'vision_ocr') {
      return char.firstTimestamp; // Vision OCR has exact MP4 timestamp directly!
    }
    const offset = findFileOffset(char, effectiveTargetFiles, fileOffsets);
    const localMs = srtTimeToMs(char.firstTimestamp);
    return msToSrtTime(offset + localMs);
  };

  const getFullMovieStartMs = (char) => {
    if (char.source === 'vision_ocr') {
      return srtTimeToMs(char.firstTimestamp);
    }
    const offset = findFileOffset(char, effectiveTargetFiles, fileOffsets);
    const localMs = srtTimeToMs(char.firstTimestamp);
    return offset + localMs;
  };

  // Export SRT Intro Tags (defaults to Full Movie MP4 continuous timeline)
  const handleExportIntroSRT = (isFullMovie = true) => {
    const srtContent = generateCharacterIntroSRT(characters, effectiveTargetFiles, isFullMovie, fileDurations, gapSeconds);
    if (!srtContent) {
      alert('Chưa có nhân vật nào được bật để xuất file chú thích!');
      return;
    }
    downloadTextFile(srtContent, isFullMovie ? `Full_Movie_${effectiveTargetFiles.length}Tap_Character_Tags.srt` : 'Character_Intro_Tags.srt');
  };

  // Export ASS Intro Tags (defaults to Full Movie MP4 continuous timeline)
  const handleExportIntroASS = (isFullMovie = true) => {
    const assContent = generateCharacterIntroASS(characters, effectiveTargetFiles, isFullMovie, fileDurations, gapSeconds);
    if (!assContent) {
      alert('Chưa có nhân vật nào được bật để xuất file chú thích!');
      return;
    }
    downloadTextFile(assContent, isFullMovie ? `Full_Movie_${effectiveTargetFiles.length}Tap_Character_Tags.ass` : 'Character_Intro_Tags.ass');
  };

  // Export Full Stitched Movie SRT (Continuous Timeline)
  const handleExportFullStitchedSRT = () => {
    if (!effectiveTargetFiles || effectiveTargetFiles.length === 0) {
      alert('Chưa có tập phim nào được chọn để ghép nối!');
      return;
    }
    const fullSRT = stitchAllFilesToFullMovieSRT(effectiveTargetFiles, fileDurations, gapSeconds);
    downloadTextFile(fullSRT, `Full_Movie_${effectiveTargetFiles.length}Tap_TronBo_Continuous.srt`);
  };

  // Copy Lore to Clipboard for YouTube Community/Description (Sorted chronologically)
  const handleCopyLoreForYouTube = () => {
    if (characters.length === 0) return;
    const sortedActive = [...characters].filter(c => c.enabled !== false).sort((a, b) => getFullMovieStartMs(a) - getFullMovieStartMs(b));
    let text = `📜 BẢNG HỒ SƠ NHÂN VẬT & CẢNH GIỚI TU TIÊN (THEO THỨ TỰ XUẤT HIỆN TRONG VIDEO):\n\n`;
    sortedActive.forEach((c, idx) => {
      text += `${idx + 1}. 👤 ${c.name} ${c.originalName ? `(${c.originalName})` : ''}\n`;
      text += `   • Thân phận: ${c.role} | Môn phái: ${c.sect}\n`;
      text += `   • Cảnh giới: ${c.realm}\n`;
      if (c.quote) text += `   • Lời thoại: "${c.quote}"\n`;
      text += `   • Xuất hiện tại: Tập ${c.firstFileName || '1'} (Mốc MP4: ${getFullMovieTimestamp(c)})\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const downloadTextFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered and Chronologically Sorted Characters
  const filteredCharacters = characters
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.sect && c.sect.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.realm && c.realm.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filterRole === 'all') return matchesSearch;
      if (filterRole === 'main') return matchesSearch && (c.role.toLowerCase().includes('chính') || c.role.toLowerCase().includes('nữ chính'));
      if (filterRole === 'antagonist') return matchesSearch && (c.role.toLowerCase().includes('phản') || c.role.toLowerCase().includes('ma'));
      return matchesSearch;
    })
    .sort((a, b) => getFullMovieStartMs(a) - getFullMovieStartMs(b));


  const targetLabel = selectedFileIds.length > 0
    ? `${selectedFileIds.length} Tập Đang Chọn`
    : (fileSearchQuery ? `${filteredFiles.length} Tập Đang Lọc ("${fileSearchQuery}")` : `Tất Cả ${files.length} Tập`);

  return (
    <div className="character-lore-studio card-panel fade-in">
      {/* Header Banner */}
      <div className="section-header flex-between">
        <div className="flex-center gap-2">
          <Users className="text-cyan" size={24} />
          <div>
            <h2 className="section-title">HỒ SƠ NHÂN VẬT & CHÚ THÍCH PHỤ ĐỀ SRT</h2>
            <p className="section-desc">AI Thị Giác quét trực tiếp bảng tên đồ họa chữ Hán trên video MP4 & tạo file thẻ chú thích khớp 100% từng khung hình</p>
          </div>
        </div>

        <div className="header-actions flex-center gap-2" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-green-glow btn-glow font-bold flex-center gap-1"
            onClick={() => setActiveTabSub('vision_scan')}
            title="Sử dụng AI Thị Giác để quét trực tiếp bảng tên nhân vật đồ họa trên từng khung hình video MP4"
          >
            <Eye size={16} />
            <span>👁️ AI Quét Thị Giác Video MP4</span>
          </button>

          <button
            className="btn btn-purple btn-sm font-bold flex-center gap-1"
            onClick={handleScanCharacters}
            disabled={isScanning}
            title={`AI tự động phân tích phụ đề SRT từ ${effectiveTargetFiles.length} tập phim đang chọn`}
          >
            <Sparkles size={15} className={isScanning ? 'spinner' : ''} />
            <span>{isScanning ? 'Đang Quét SRT...' : `Quét Từ Phụ Đề SRT (${effectiveTargetFiles.length} Tập)`}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm flex-center gap-1"
            onClick={() => {
              setEditingChar({
                name: '',
                originalName: '',
                role: 'Nhân vật phụ',
                sect: 'Vô Môn Phái',
                realm: 'Luyện Khí',
                firstFileName: files[0]?.name || '',
                firstFileId: files[0]?.id || '',
                firstTimestamp: '00:01:00,000',
                quote: '',
                introTag: ''
              });
              setIsModalOpen(true);
            }}
          >
            <Plus size={15} /> Thêm Thủ Công
          </button>
        </div>
      </div>

      {scanProgress && (
        <div className="progress-banner mt-2 mb-2">
          <Sparkles size={16} className="text-cyan" />
          <span>{scanProgress}</span>
        </div>
      )}

      {/* Sub Navigation Bar */}
      <div className="sub-nav-bar mt-3 mb-3 flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="flex-center gap-2">
          <button
            className={`tab-pill-btn ${activeTabSub === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTabSub('characters')}
          >
            <Users size={16} /> Danh Sách Nhân Vật ({characters.length})
          </button>

          <button
            className={`tab-pill-btn ${activeTabSub === 'vision_scan' ? 'active' : ''}`}
            onClick={() => setActiveTabSub('vision_scan')}
            style={{ borderColor: 'var(--green-glow, #10b981)' }}
          >
            <Eye size={16} className="text-green" /> 👁️ AI Quét Khung Hình Video MP4
          </button>

          <button
            className={`tab-pill-btn ${activeTabSub === 'stitching' ? 'active' : ''}`}
            onClick={() => setActiveTabSub('stitching')}
          >
            <Clock size={16} /> ⚡ Ghép Nối Dòng Thời Gian Video Dài ({effectiveTargetFiles.length}/{files.length} Tập)
          </button>
        </div>

        {/* Global Export Buttons */}
        <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm flex-center gap-1"
            onClick={handleCopyLoreForYouTube}
            title="Copy toàn bộ danh sách nhân vật để đăng YouTube Community hoặc Mô Tả Video"
          >
            {copiedText ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            <span>{copiedText ? 'Đã Copy!' : 'Copy Cho YouTube'}</span>
          </button>

          <button
            className="btn btn-cyan btn-sm font-bold flex-center gap-1"
            onClick={() => handleExportIntroSRT(true)}
            title="Xuất file SRT chứa các thẻ giới thiệu nhân vật khớp dòng thời gian video MP4 dài"
          >
            <Download size={14} /> Xuất Chú Thích (.SRT - Theo Video MP4)
          </button>

          <button
            className="btn btn-green-glow btn-sm font-bold flex-center gap-1"
            onClick={() => handleExportIntroASS(true)}
            title="Xuất file .ASS có sẵn hiệu ứng font chữ cổ trang phát sáng viền đen khớp dòng thời gian video MP4"
          >
            <Download size={14} /> Xuất Chú Thích (.ASS - Theo Video MP4)
          </button>
        </div>
      </div>


      {/* TAB 1: CHARACTER CARDS GRID */}
      {activeTabSub === 'characters' && (
        <div className="character-tab-content">
          {/* Filter Bar */}
          <div className="filter-controls-group mb-3 flex-between">
            <div className="search-box" style={{ maxWidth: '350px' }}>
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="🔍 Tìm tên nhân vật, môn phái, cảnh giới..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="flex-center gap-2">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="input-field select-field input-sm"
              >
                <option value="all">Tất cả vai trò ({characters.length})</option>
                <option value="main">Nhân vật chính / Nữ chính</option>
                <option value="antagonist">Phản diện / Ma đạo</option>
              </select>

              <span className="text-muted text-sm">
                Đang hiển thị: <strong className="highlight-cyan">{filteredCharacters.length}</strong> nhân vật
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="character-grid">
            {filteredCharacters.map(char => {
              const fullMovieTime = getFullMovieTimestamp(char);

              return (
                <div key={char.id} className={`character-card card-panel ${char.enabled ? 'enabled' : 'disabled'}`}>
                  <div className="char-card-header flex-between">
                    <div className="char-title-group">
                      <h3 className="char-name">{char.name}</h3>
                      {char.originalName && <span className="char-original text-muted">({char.originalName})</span>}
                    </div>

                    <div className="char-actions flex-center gap-1">
                      <input
                        type="checkbox"
                        checked={char.enabled !== false}
                        onChange={() => toggleCharacter(char.id)}
                        className="custom-checkbox"
                        title="Bật/Tắt xuất thẻ chú thích cho nhân vật này"
                      />
                      <button
                        className="btn-icon text-muted"
                        onClick={() => {
                          setEditingChar(char);
                          setIsModalOpen(true);
                        }}
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn-icon text-red"
                        onClick={() => deleteCharacter(char.id)}
                        title="Xóa nhân vật này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Character Video Frame Snapshot Thumbnail */}
                  {char.thumbnail && (
                    <div className="char-thumbnail-preview mt-2 mb-2" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(6, 182, 212, 0.4)', position: 'relative' }}>
                      <img src={char.thumbnail} alt={char.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.75)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#38bdf8' }}>
                        👁️ Khung hình video ({char.firstTimestamp})
                      </div>
                    </div>
                  )}

                  <div className="char-badges-row flex-center gap-1 mt-2 mb-2" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    <span className="badge badge-role">{char.role}</span>
                    <span className="badge badge-sect">{char.sect}</span>
                    <span className="badge badge-realm">{char.realm}</span>
                    {char.source === 'vision_ocr' && (
                      <span className="badge badge-done" style={{ fontSize: '10px' }}>👁️ Thị Giác Video</span>
                    )}
                  </div>

                  {char.quote && (
                    <div className="char-quote text-muted mt-1">
                      💬 <em>"{char.quote}"</em>
                    </div>
                  )}

                  {/* Dual Timestamps: Local Episode & Full MP4 Video Timeline */}
                  <div className="char-timestamp-row mt-2 pt-2 border-top flex-between text-xs text-muted">
                    <span>📍 Tập: <strong>{char.firstFileName || 'Tập 1'}</strong></span>
                    <span className="font-mono text-muted">⏱️ Trong tập: {char.firstTimestamp}</span>
                  </div>
                  <div className="char-timestamp-row mt-1 flex-between text-xs">
                    <span className="text-cyan font-bold">🎬 Mốc trong Video MP4 Dài:</span>
                    <span className="highlight-cyan font-mono font-bold text-sm">⏱️ {fullMovieTime}</span>
                  </div>

                  {/* Intro Tag Preview Banner */}
                  <div className="char-tag-preview mt-2">
                    <span className="tag-preview-label">Thẻ chú thích trên video:</span>
                    <div className="tag-preview-box">
                      {char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


          {filteredCharacters.length === 0 && (
            <div className="empty-state card-panel text-center p-5">
              <Users size={48} className="text-muted mb-2" />
              <h3>Chưa có nhân vật nào trong hồ sơ</h3>
              <p className="text-muted">Nhấn <strong>"👁️ AI Quét Thị Giác Video MP4"</strong> để AI soi trực tiếp bảng tên đồ họa trên từng khung hình video!</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI VIDEO VISION SCANNER (BẢNG TÊN & CHỮ HÁN TRÊN KHUNG HÌNH VIDEO) */}
      {activeTabSub === 'vision_scan' && (
        <div className="vision-scan-tab-content fade-in">
          {/* Banner Introduction */}
          <div className="alert-box green mb-3">
            <Eye size={24} className="text-green flex-shrink-0" />
            <div>
              <strong className="text-lg">AI Quét Thị Giác Khung Hình Video MP4 (Bảng Tên Đồ Họa & Chữ Hán Cổ Trang)</strong>
              <p className="text-sm mt-1">
                AI sẽ trực tiếp soi các khung hình video để phát hiện bảng tên nhân vật đồ họa (ví dụ: bảng đỏ <strong>[主角]</strong>, chữ thư pháp <strong>[赵昀]</strong>, môn phái, cảnh giới...) xuất hiện trên màn hình. Mốc thời gian được lấy <strong>chính xác 100% từng khung hình</strong> và tự động chụp lại ảnh đại diện nhân vật!
              </p>
            </div>
          </div>

          {/* Video Drop / File Selection Zone */}
          <div 
            className={`video-detection-bar card-panel p-4 mb-3 ${isDraggingVideo ? 'drag-over' : ''}`}
            style={{ 
              border: '2px dashed rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.05)',
              borderRadius: '12px'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingVideo(true); }}
            onDragLeave={() => setIsDraggingVideo(false)}
            onDrop={(e) => { 
              e.preventDefault(); 
              setIsDraggingVideo(false); 
              const rawFiles = Array.from(e.dataTransfer?.files || []);
              const video = rawFiles.find(f => f.type.startsWith('video/') || /\.(mp4|mkv|avi|mov|webm|flv|ts|m4v)$/i.test(f.name));
              if (video) setVisionVideoFile(video);
            }}
          >
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
              <div className="flex-center gap-3">
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '10px' }}>
                  <Video className="text-green" size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">
                    {visionVideoFile ? `🎬 Đã nạp: ${visionVideoFile.name}` : 'Kéo Thả Video MP4 Cần Quét Hoặc Chọn Từ Máy Tính'}
                  </h4>
                  <p className="text-xs text-muted mt-1">
                    {visionVideoFile 
                      ? `Dung lượng: ${(visionVideoFile.size / (1024 * 1024)).toFixed(1)} MB (Đọc trực tiếp trong trình duyệt, không tốn băng thông upload)` 
                      : 'Hỗ trợ các định dạng .MP4, .MKV, .AVI, .MOV...'}
                  </p>
                </div>
              </div>

              <div className="flex-center gap-2">
                <input
                  type="file"
                  ref={visionInputRef}
                  accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.flv,.ts,.m4v"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setVisionVideoFile(e.target.files[0]);
                  }}
                />
                <button
                  className="btn btn-secondary flex-center gap-1 font-bold"
                  onClick={() => visionInputRef.current?.click()}
                >
                  <UploadCloud size={16} /> {visionVideoFile ? 'Đổi Video Khác' : 'Chọn File Video MP4'}
                </button>
              </div>
            </div>

            {/* Vision Scan Controls */}
            {visionVideoFile && (
              <div className="vision-controls-row mt-4 pt-3 border-top flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div className="flex-center gap-3" style={{ flexWrap: 'wrap' }}>
                  <div className="flex-center gap-1 text-sm">
                    <Clock size={15} className="text-muted" />
                    <span>Tần suất chụp frame:</span>
                    <select
                      value={visionIntervalSec}
                      onChange={(e) => setVisionIntervalSec(Number(e.target.value))}
                      className="input-field select-field input-sm font-bold"
                    >
                      <option value={2}>Mỗi 2 giây (Chắc chắn 100% không bỏ sót - Khuyên dùng)</option>
                      <option value={3}>Mỗi 3 giây (Độ chính xác 99% - Rất chuẩn & Nhanh)</option>
                      <option value={5}>Mỗi 5 giây (Độ chính xác ~95%)</option>
                      <option value={10}>Mỗi 10 giây (Quét nhanh)</option>
                      <option value={15}>Mỗi 15 giây (Siêu tốc)</option>
                    </select>
                  </div>

                  <div className="flex-center gap-1 text-sm">
                    <Layers size={15} className="text-muted" />
                    <span>Số frame tối đa:</span>
                    <select
                      value={visionMaxFrames}
                      onChange={(e) => setVisionMaxFrames(Number(e.target.value))}
                      className="input-field select-field input-sm font-bold"
                    >
                      <option value={150}>150 Khung hình (~5-10 phút video)</option>
                      <option value={300}>300 Khung hình (~15-20 phút video)</option>
                      <option value={600}>600 Khung hình (~30-40 phút video)</option>
                      <option value={1200}>1200 Khung hình (~1-2 tiếng video)</option>
                      <option value={3000}>3000 Khung hình (Video gộp cả bộ 3-4 tiếng)</option>
                    </select>
                  </div>

                </div>

                <button
                  className="btn btn-green-glow font-bold flex-center gap-2"
                  style={{ padding: '10px 24px', fontSize: '15px' }}
                  onClick={handleStartVisionScan}
                  disabled={isVisionScanning}
                >
                  <Eye size={18} className={isVisionScanning ? 'spinner' : ''} />
                  <span>{isVisionScanning ? 'Đang Quét Thị Giác...' : '🚀 BẮT ĐẦU QUÉT THỊ GIÁC VIDEO'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Live Scanning Status & Preview Box */}
          {isVisionScanning && visionProgress && (
            <div className="live-vision-box card-panel p-4 mb-4" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <div className="flex-between mb-2">
                <div className="flex-center gap-2">
                  <Sparkles size={18} className="text-green spinner" />
                  <strong className="text-green">{visionProgress.message}</strong>
                </div>
                <span className="font-bold highlight-cyan">{visionProgress.percent}%</span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }} className="mb-3">
                <div 
                  style={{ 
                    width: `${visionProgress.percent}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #10b981, #06b6d4)', 
                    transition: 'width 0.3s ease' 
                  }} 
                />
              </div>

              {/* Live Frame Preview */}
              {liveCurrentFrame && (
                <div className="flex-center flex-column gap-2 mt-2">
                  <div style={{ position: 'relative', maxWidth: '420px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #10b981' }}>
                    <img src={liveCurrentFrame} alt="Live frame" style={{ width: '100%', display: 'block' }} />
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      🔴 LIVE AI VISION SCANNING
                    </div>
                  </div>
                  <span className="text-xs text-muted">AI đang phóng to soi chữ thư pháp và bảng đỏ trên khung hình này</span>
                </div>
              )}
            </div>
          )}

          {/* Detected Characters Live List from Vision */}
          {visionDetectedChars.length > 0 && (
            <div className="vision-results-card card-panel p-4 mb-3">
              <div className="flex-between mb-3">
                <div className="flex-center gap-2">
                  <CheckCircle2 size={20} className="text-green" />
                  <h3 className="font-bold">Đã Nhận Diện {visionDetectedChars.length} Bảng Tên Nhân Vật Từ Video MP4:</h3>
                </div>
                <button
                  className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                  onClick={() => handleExportIntroSRT(true)}
                >
                  <Download size={14} /> Xuất Thẻ Chú Thích (.SRT Khớp 100% Video)
                </button>
              </div>

              <div className="character-grid">
                {visionDetectedChars.map((char) => (
                  <div key={char.id} className="character-card card-panel enabled" style={{ border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                    {char.thumbnail && (
                      <div style={{ borderRadius: '6px', overflow: 'hidden', marginBottom: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <img src={char.thumbnail} alt={char.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div className="flex-between">
                      <h4 className="font-bold text-base text-green">{char.name} {char.originalName ? `(${char.originalName})` : ''}</h4>
                      <span className="badge badge-done" style={{ fontSize: '10px' }}>👁️ Bảng Tên Video</span>
                    </div>
                    <div className="flex-center gap-1 mt-1 mb-1" style={{ justifyContent: 'flex-start' }}>
                      <span className="badge badge-role">{char.role}</span>
                      <span className="badge badge-sect">{char.sect}</span>
                    </div>
                    <div className="text-xs mt-2 pt-2 border-top flex-between">
                      <span className="text-muted">Mốc xuất hiện trên video:</span>
                      <strong className="text-cyan font-mono text-sm">⏱️ {char.firstTimestamp}</strong>
                    </div>
                    <div className="tag-preview-box mt-2 text-xs">
                      {char.introTag}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* TAB 2: TIMELINE STITCHING & CONTINUOUS FULL MOVIE */}
      {activeTabSub === 'stitching' && (
        <div className="stitching-tab-content">
          <div className="alert-box cyan mb-3">
            <Clock size={20} className="text-cyan flex-shrink-0" />
            <div>
              <strong>Ghép Nối Dòng Thời Gian Nối Tiếp Cho Video Dài (Full Movie Seamless Timeline)</strong>
              <p className="text-sm mt-1">
                Tự động tính toán mốc thời gian nối tiếp giữa các tập phim ngắn thành 1 dòng thời gian duy nhất khớp 100% video dài từ 00:00:00 đến 04:00:00!
              </p>
            </div>
          </div>

          {/* 🔍 FILE SEARCH & FILTER TOOLBAR FOR STITCHING */}
          {files.length > 0 && (
            <div className="file-filter-toolbar mb-3">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="🔍 Gõ mã tập muốn lọc / ghép nối (VD: d7, d1, burned...)..."
                  value={fileSearchQuery}
                  onChange={e => setFileSearchQuery(e.target.value)}
                  className="input-field"
                />
                {fileSearchQuery && (
                  <button
                    className="btn-clear-search text-muted"
                    onClick={() => setFileSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="filter-controls-group">
                {filteredFiles.length > 0 && (
                  <button
                    className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                    onClick={handleSelectAllFilteredFiles}
                    title={`Chọn toàn bộ ${filteredFiles.length} tập đang hiển thị`}
                  >
                    <Check size={14} />
                    <span>CHỌN TẤT CẢ {filteredFiles.length} TẬP{fileSearchQuery ? ` ("${fileSearchQuery}")` : ''}</span>
                  </button>
                )}

                {someFilteredSelected && (
                  <button
                    className="btn btn-secondary btn-sm text-muted"
                    onClick={handleDeselectFilteredFiles}
                    title="Bỏ chọn các tập đang lọc"
                  >
                    Bỏ Chọn
                  </button>
                )}

                <div className="filter-counter text-muted flex-center gap-2">
                  <span>Đang hiện: <strong className="highlight-cyan">{filteredFiles.length}</strong> / {files.length} tập</span>
                  {selectedFileIds.length > 0 && (
                    <span className="badge badge-done" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>
                      Đã chọn: <strong className="highlight-cyan font-bold">{selectedFileIds.length}</strong> tập
                    </span>
                  )}
                  {selectedFileIds.length > 0 && (
                    <button
                      className="btn btn-secondary btn-xs text-muted"
                      onClick={() => setSelectedFileIds([])}
                    >
                      Bỏ chọn hết
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Video Clip Duration Detector Controls */}
          <div 
            className={`video-detection-bar card-panel flex-between mb-3 ${isDraggingVideo ? 'drag-over' : ''}`}
            style={{ 
              flexWrap: 'wrap', 
              gap: '12px',
              border: isDraggingVideo ? '2px dashed var(--cyan-primary)' : '1px solid rgba(6, 182, 212, 0.3)',
              background: isDraggingVideo ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)',
              transition: 'all 0.2s ease'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingVideo(true); }}
            onDragLeave={() => setIsDraggingVideo(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingVideo(false); handleVideoUpload(e); }}
          >
            <div className="flex-center gap-2">
              <Film className="text-cyan" size={24} />
              <div>
                <strong>Tự Động Đọc Thời Lượng Thực Tế Từ File Video MP4 (Kéo Thả Trực Tiếp):</strong>
                <p className="text-xs text-muted">
                  Kéo thả hoặc chọn các file video clip (.MP4, .MKV, .AVI...) để tự động đọc chính xác từng mili-giây thời lượng thực tế
                </p>
              </div>
            </div>

            <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={videoInputRef}
                multiple
                accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.flv,.ts,.m4v"
                style={{ display: 'none' }}
                onChange={handleVideoUpload}
              />
              <button
                className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                onClick={() => videoInputRef.current?.click()}
                title="Bấm để chọn file video clip từ máy tính"
              >
                <UploadCloud size={16} /> Chọn File Video Clip (.MP4)
              </button>

              <div className="flex-center gap-1 text-sm ml-2">
                <span>Khoảng nghỉ đệm (Gap):</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={gapSeconds}
                  onChange={e => setGapSeconds(Number(e.target.value))}
                  className="input-field input-xs font-bold text-center"
                  style={{ width: '55px' }}
                />
                <span>giây</span>
              </div>
            </div>

            {/* Quick Manual Total Duration Toolbar */}
            <div className="video-duration-quick-toolbar flex-between p-2 mt-1" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
              <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
                <Clock size={16} className="text-yellow" />
                <span className="text-sm font-bold">Hoặc Nhập Tổng Thời Lượng Video Gộp:</span>
                <input
                  type="number"
                  placeholder="VD: 12918"
                  value={manualTotalDurationSec}
                  onChange={e => setManualTotalDurationSec(e.target.value)}
                  className="input-field input-xs font-mono font-bold text-center"
                  style={{ width: '95px' }}
                />
                <span className="text-xs text-muted">giây {manualTotalDurationSec ? `(${msToSrtTime(Number(manualTotalDurationSec) * 1000)})` : ''}</span>
                <button
                  className="btn btn-purple btn-xs font-bold flex-center gap-1"
                  onClick={handleDistributeTotalDuration}
                  title="Phân bổ tổng thời lượng này chuẩn xác theo tỷ lệ các tập phụ đề"
                >
                  <Sparkles size={13} /> Phân Bổ Cho {effectiveTargetFiles.length} Tập
                </button>
              </div>

              <button
                className="btn btn-secondary btn-xs text-muted"
                onClick={handleResetDurationsToSubtitles}
                title="Khôi phục thời lượng các tập về mốc dòng sub cuối cùng"
              >
                🔄 Đặt Lại Theo Sub
              </button>
            </div>
          </div>


          {/* Episode Sequence Timeline Table */}
          <div className="stitching-table-wrapper card-panel mb-3">
            <table className="stitching-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={isAllFilteredSelected ? handleDeselectFilteredFiles : handleSelectAllFilteredFiles}
                      className="custom-checkbox"
                      title="Chọn/Bỏ chọn tất cả các tập đang lọc"
                    />
                  </th>
                  <th style={{ width: '50px' }}>STT</th>
                  <th>Tên Tập Phim (File SRT)</th>
                  <th style={{ width: '150px' }}>Mốc Bắt Đầu (Video Dài)</th>
                  <th style={{ width: '180px' }}>Thời Lượng Thực Tế</th>
                  <th style={{ width: '150px' }}>Mốc Kết Thúc (Video Dài)</th>
                  <th style={{ width: '110px' }}>Số Dòng Thoại</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let cumulativeOffsetMs = 0;
                  return filteredFiles.map((file, idx) => {
                    const isSelected = selectedFileIds.includes(file.id);
                    const fileSubs = file.subtitles || [];
                    const lastSub = fileSubs[fileSubs.length - 1];
                    const defaultSubDurationSec = lastSub ? Math.round(srtTimeToMs(lastSub.endTime) / 1000) : 0;
                    
                    const isFromMp4 = !!fileDurations[file.id];
                    const actualDurationSec = fileDurations[file.id] || defaultSubDurationSec;
                    const startMs = cumulativeOffsetMs;
                    const endMs = startMs + (actualDurationSec * 1000);
                    
                    // If selected or no filter, advance cumulative timeline
                    cumulativeOffsetMs = endMs + (gapSeconds * 1000);

                    return (
                      <tr 
                        key={file.id} 
                        className={isSelected ? 'selected-row' : ''}
                        onClick={() => toggleSelectFile(file.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectFile(file.id, e)}
                            className="custom-checkbox"
                          />
                        </td>
                        <td className="text-center font-bold">{idx + 1}</td>
                        <td>
                          <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                            <Film size={15} className={isSelected ? 'text-purple' : 'text-cyan'} />
                            <span className="font-bold">{file.name}</span>
                            {isFromMp4 && (
                              <span className="badge" style={{ background: '#059669', color: '#fff', fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px' }}>
                                🎬 MP4
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-cyan font-bold">{msToSrtTime(startMs)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                            <input
                              type="number"
                              step="0.1"
                              value={fileDurations[file.id] || actualDurationSec}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setFileDurations(prev => ({ ...prev, [file.id]: val }));
                              }}
                              className="input-field input-xs font-mono font-bold"
                              style={{ width: '85px' }}
                            />
                            <span className="text-xs text-muted">s</span>
                            {!isFromMp4 && (
                              <span className="text-xs text-muted" title="Thời lượng ước tính từ dòng sub cuối cùng">
                                (từ sub)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-green font-bold">{msToSrtTime(endMs)}</td>
                        <td className="text-center">{fileSubs.length} dòng</td>
                      </tr>
                    );
                  });
                })()}

                {filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-muted">
                      Không tìm thấy tập phim nào khớp với từ khóa "{fileSearchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


          {/* Full Movie Actions */}
          <div className="full-movie-actions-card card-panel flex-between p-3" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 className="font-bold text-cyan flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                <Sparkles size={16} /> Thao Tác Ghép Nối Cho: <strong className="highlight-cyan">{targetLabel}</strong>
              </h4>
              <p className="text-xs text-muted mt-1">Dòng thời gian được nối tiếp chuẩn xác 100% từng giây khớp hoàn hảo với video dài trên CapCut / Premiere</p>
            </div>

            <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn-purple btn-glow font-bold flex-center gap-1"
                onClick={handleExportFullStitchedSRT}
                title={`Ghép nối và xuất file SRT thoại dài cho ${effectiveTargetFiles.length} tập`}
              >
                <Download size={16} /> 📥 Xuất Thoại Liền Mạch ({effectiveTargetFiles.length} Tập)
              </button>

              <button
                className="btn btn-cyan btn-glow font-bold flex-center gap-1"
                onClick={() => handleExportIntroSRT(true)}
                title={`Xuất thẻ chú thích nhân vật khớp dòng thời gian video dài của ${effectiveTargetFiles.length} tập`}
              >
                <Download size={16} /> 📥 Xuất Thẻ Chú Thích Video Dài (.SRT)
              </button>

              <button
                className="btn btn-green-glow font-bold flex-center gap-1"
                onClick={() => handleExportIntroASS(true)}
                title={`Xuất thẻ chú thích định dạng .ASS đồ họa cổ trang cho video dài của ${effectiveTargetFiles.length} tập`}
              >
                <Download size={16} /> 📥 Xuất Thẻ Chú Thích Video Dài (.ASS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ADD CHARACTER MODAL */}
      {isModalOpen && editingChar && (
        <div className="modal-backdrop modal-overlay flex-center">
          <div className="modal-content card-panel" style={{ maxWidth: '550px', width: '95%' }}>
            <div className="modal-header flex-between mb-3">
              <h3 className="modal-title flex-center gap-2">
                <Users className="text-cyan" size={20} />
                <span>{editingChar.id ? 'Chỉnh Sửa Nhân Vật' : 'Thêm Nhân Vật Mới'}</span>
              </h3>
              <button className="btn-close text-muted" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="form-group mb-2">
              <label className="form-label">Tên nhân vật (Hán-Việt):</label>
              <input
                type="text"
                value={editingChar.name || ''}
                onChange={e => setEditingChar(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="VD: Tiêu Viêm, Lý Mộ Uyển..."
              />
            </div>

            <div className="grid-2-col gap-2 mb-2">
              <div className="form-group">
                <label className="form-label">Tên gốc chữ Hán:</label>
                <input
                  type="text"
                  value={editingChar.originalName || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, originalName: e.target.value }))}
                  className="input-field"
                  placeholder="VD: 萧炎, 李慕婉..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vai trò / Thân phận:</label>
                <input
                  type="text"
                  value={editingChar.role || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, role: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Nhân vật chính, Nữ chính, Phản diện..."
                />
              </div>
            </div>

            <div className="grid-2-col gap-2 mb-2">
              <div className="form-group">
                <label className="form-label">Tông môn / Gia tộc:</label>
                <input
                  type="text"
                  value={editingChar.sect || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, sect: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Bách Hoa Cốc, Tiêu Gia..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cảnh giới tu luyện:</label>
                <input
                  type="text"
                  value={editingChar.realm || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, realm: e.target.value }))}
                  className="input-field"
                  placeholder="VD: Trúc Cơ sơ kỳ, Kim Đan..."
                />
              </div>
            </div>

            <div className="grid-2-col gap-2 mb-2">
              <div className="form-group">
                <label className="form-label">Xuất hiện tại tập:</label>
                <select
                  value={editingChar.firstFileId || ''}
                  onChange={e => {
                    const selFile = files.find(f => f.id === e.target.value);
                    setEditingChar(prev => ({
                      ...prev,
                      firstFileId: e.target.value,
                      firstFileName: selFile ? selFile.name : ''
                    }));
                  }}
                  className="input-field select-field"
                >
                  {files.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mốc thời gian (00:00:00,000):</label>
                <input
                  type="text"
                  value={editingChar.firstTimestamp || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, firstTimestamp: e.target.value }))}
                  className="input-field font-mono"
                  placeholder="00:03:15,000"
                />
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Mẫu thẻ chú thích hiện trên video:</label>
              <input
                type="text"
                value={editingChar.introTag || ''}
                onChange={e => setEditingChar(prev => ({ ...prev, introTag: e.target.value }))}
                className="input-field font-bold text-cyan"
                placeholder="【 NHÂN VẬT: TIÊU VIÊM | TIÊU GIA | ĐẤU CHI KHÍ TAM ĐOẠN 】"
              />
            </div>

            <div className="modal-footer flex-end gap-2 pt-2 border-top">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
              <button className="btn btn-cyan font-bold" onClick={() => saveCharacter(editingChar)}>Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
