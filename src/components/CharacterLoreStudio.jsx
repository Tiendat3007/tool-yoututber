import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Sparkles, Plus, Download, Copy, Check, Trash2, Edit3, Film, 
  Layers, Clock, Shield, Search, ChevronRight, Video, ArrowRight, BookOpen, AlertCircle, UploadCloud,
  Eye, Camera, Play, CheckCircle2, Zap, History, RotateCcw, FileText, Calendar, Palette, Type, Database
} from 'lucide-react';

import { 
  extractCharactersWithAI, 
  generateCharacterIntroSRT, 
  generateCharacterIntroASS, 
  stitchAllFilesToFullMovieSRT,
  cleanAndFormatIntroTag,
  isInvalidLoreValue,
  isValidLoreEntity,
  msToSrtTime,

  srtTimeToMs,

  readMediaDuration,
  findFileOffset,
  computeFileOffsets,
  extractFramesFromVideo,
  scanVideoFramesWithVisionAI
} from '../utils/characterExtractor';

import {
  fetchCharactersFromMySQL,
  saveCharactersToMySQL,
  fetchScanHistoryFromMySQL,
  saveScanSessionToMySQL,
  deleteScanSessionFromMySQL,
  checkMySQLHealth
} from '../utils/dbSync';






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
  glossary = [],
  aiProvider = 'orimise',
  orimiseKey = '',
  orimiseBaseUrl = 'https://api.orimise.com/v1',
  geminiKey = '',
  aiModel = 'gemini-2.5-flash',
  characters = [], 
  setCharacters,
  onScanningStateChange
}) {
  // 1. General & Navigation States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [copiedText, setCopiedText] = useState(false);
  const [activeTabSub, setActiveTabSub] = useState('characters'); // 'characters' | 'vision_scan' | 'stitching' | 'history'

  // 2. Vision Scanner States
  const [visionVideoFile, setVisionVideoFile] = useState(null);
  const [visionIntervalSec, setVisionIntervalSec] = useState(3);
  const [visionConcurrency, setVisionConcurrency] = useState(6); // 6 parallel threads by default
  const [visionBatchSize, setVisionBatchSize] = useState(4); // Selectable: 2, 4, 6, 8, 10, 12, 15, 20
  const [visionModel, setVisionModel] = useState(() => localStorage.getItem('tutien_vision_model') || 'gemini-2.5-flash-lite');

  const [visionFlipHorizontal, setVisionFlipHorizontal] = useState(true);
  const [visionFilterStatic, setVisionFilterStatic] = useState(true); // Smart frame differencing to eliminate redundant static frames
  const [visionUseSRTContext, setVisionUseSRTContext] = useState(true); // 🧠 Feed selected SRT subtitles context into Vision AI
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [visionProgress, setVisionProgress] = useState(null);
  const [liveCurrentFrame, setLiveCurrentFrame] = useState(null);
  const [visionDetectedChars, setVisionDetectedChars] = useState([]);
  const visionInputRef = useRef(null);




  // 3. Scan History State
  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('tutien_scan_history_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 4. File filtering and timeline stitching states
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [fileDurations, setFileDurations] = useState({});
  const [gapSeconds, setGapSeconds] = useState(0);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [manualTotalDurationSec, setManualTotalDurationSec] = useState('');
  const videoInputRef = useRef(null);

  // 5. Tag Format & Template states
  const [tagDurationSec, setTagDurationSec] = useState(2);
  const [tagFormatTemplate, setTagFormatTemplate] = useState('clean_compact');
  const [customTagPattern, setCustomTagPattern] = useState('【 {TYPE}: {NAME} | {SECT} | {REALM} 】');
  const [activeMovieFilter, setActiveMovieFilter] = useState('all');

  // 6. Modal state
  const [editingChar, setEditingChar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Notify parent of active background scanning so user can switch tabs freely
  useEffect(() => {
    onScanningStateChange?.(isScanning || isVisionScanning);
  }, [isScanning, isVisionScanning, onScanningStateChange]);

  // Sync scanHistory to localStorage with safety quota handling
  useEffect(() => {
    try {
      localStorage.setItem('tutien_scan_history_sessions', JSON.stringify(scanHistory));
    } catch (e) {
      console.warn('Storage quota limit: saving compact history');
      const compact = scanHistory.slice(0, 10).map(s => ({
        ...s,
        characters: s.characters.map(c => ({ ...c, thumbnail: '' }))
      }));
      try {
        localStorage.setItem('tutien_scan_history_sessions', JSON.stringify(compact));
      } catch (err) {}
    }
  }, [scanHistory]);

  // MySQL Persistence & Auto-Sync
  const [isMySQLSyncing, setIsMySQLSyncing] = useState(false);

  // Sync to MySQL
  const handleSaveToMySQL = async () => {
    setIsMySQLSyncing(true);
    const ok = await saveCharactersToMySQL(characters);
    setIsMySQLSyncing(false);
    if (ok) {
      setScanProgress(`✅ Đã lưu thành công ${characters.length} nhân vật vào Database MySQL (tutien_srt_tool)!`);
    } else {
      setScanProgress('⚠️ Không thể kết nối tới MySQL Server (Vui lòng chạy "npm run server")');
    }
    setTimeout(() => setScanProgress(''), 4000);
  };

  // Load from MySQL
  const handleLoadFromMySQL = async () => {
    setIsMySQLSyncing(true);
    const dbChars = await fetchCharactersFromMySQL();
    const dbHistory = await fetchScanHistoryFromMySQL();
    setIsMySQLSyncing(false);

    if (Array.isArray(dbChars) && dbChars.length > 0) {
      setCharacters(dbChars);
      if (Array.isArray(dbHistory) && dbHistory.length > 0) {
        setScanHistory(dbHistory);
      }
      setScanProgress(`✅ Đã tải thành công ${dbChars.length} nhân vật từ Database MySQL!`);
    } else {
      setScanProgress('⚠️ Không tìm thấy dữ liệu trên MySQL hoặc Server chưa khởi động.');
    }
    setTimeout(() => setScanProgress(''), 4000);
  };

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
      ? orimiseKey
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
        const movieLabel = effectiveTargetFiles.length === 1 
          ? effectiveTargetFiles[0].name 
          : `${effectiveTargetFiles.length}_Tap_SRT`;
        const extractedWithMovie = extracted.map(c => ({
          ...c,
          movieName: c.movieName || c.firstFileName || movieLabel
        }));
        setCharacters(prev => {
          const existingNames = new Set(prev.filter(c => (c.movieName || c.firstFileName) === movieLabel).map(c => c.name.toLowerCase().trim()));
          const newUnique = extractedWithMovie.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
          return [...prev, ...newUnique];
        });
        setActiveMovieFilter(movieLabel);

        // 💾 Save Scan Session to History
        const session = {
          id: `scan_srt_${Date.now()}`,
          timeFormatted: new Date().toLocaleString('vi-VN'),
          videoName: `${effectiveTargetFiles.length} Tập Phụ Đề SRT (${effectiveTargetFiles.map(f => f.name).slice(0, 2).join(', ')}${effectiveTargetFiles.length > 2 ? '...' : ''})`,
          type: 'srt',
          count: extracted.length,
          characters: extractedWithMovie,
          tagDurationSec: tagDurationSec || 2
        };
        setScanHistory(prev => [session, ...prev.slice(0, 29)]);

        setScanProgress(`✅ Đã tìm thấy ${extracted.length} nhân vật cho phim [${movieLabel}] và tự động lưu vào lịch sử quét!`);
        setTimeout(() => setScanProgress(''), 4000);
      }

    } catch (err) {
      alert(`Lỗi khi quét nhân vật: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

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

  // Handle Start Vision Scan on Video Frames
  const handleStartVisionScan = async () => {

    if (!visionVideoFile) {
      alert('Vui lòng chọn hoặc kéo thả file video MP4 cần quét thị giác!');
      return;
    }

    const effectiveKey = aiProvider === 'orimise'
      ? orimiseKey
      : geminiKey;


    if (!effectiveKey) {
      alert(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
      return;
    }

    setIsVisionScanning(true);
    setVisionDetectedChars([]);
    setVisionProgress({ phase: 'extracting', percent: 0, message: 'Đang trích xuất toàn bộ khung hình từ video...' });

    try {
      // 1. Extract frames locally in browser canvas with Frame Differencing (0 MB video upload, scans 100% of video)
      const frames = await extractFramesFromVideo(visionVideoFile, {
        intervalSec: Number(visionIntervalSec),
        flipHorizontal: Boolean(visionFlipHorizontal),
        filterStaticFrames: Boolean(visionFilterStatic),
        onProgress: (p) => {
          const filterNote = p.filteredCount ? ` • ⚡ Đã lọc ${p.filteredCount} cảnh tĩnh trùng` : '';
          setVisionProgress({
            phase: 'extracting',
            percent: p.percent,
            message: `Đang chụp & lọc khung hình ${p.current}/${p.total} (Mốc ${p.timeFormatted})${filterNote}...`
          });
        }
      });

      if (frames.length === 0) {
        throw new Error('Không trích xuất được khung hình nào từ video.');
      }

      // 2. Scan with Multi-threaded Vision AI (Gom nhiều ảnh/request để giảm tối đa chi phí sàn $0.01)
      const effectiveBatchSize = Number(visionBatchSize) || 12;
      const totalEstimatedReqs = Math.ceil(frames.length / effectiveBatchSize);

      const srtSubtitlesToPass = visionUseSRTContext
        ? (effectiveTargetFiles.length > 0 ? effectiveTargetFiles : files).flatMap(f => f.subtitles)
        : [];

      const srtNote = srtSubtitlesToPass.length > 0 ? ` + 🧠 Nạp ${srtSubtitlesToPass.length} dòng SRT` : '';

      setVisionProgress({ 
        phase: 'ai_scanning', 
        percent: 0, 
        message: `Bắt đầu phân tích ${frames.length} khung hình tối ưu (${totalEstimatedReqs} requests, gom ${effectiveBatchSize} ảnh/request, ${visionConcurrency} luồng song song${srtNote})...` 
      });

      const detected = await scanVideoFramesWithVisionAI({
        frames,
        videoFileName: visionVideoFile.name,
        apiKey: effectiveKey,
        aiProvider,
        baseUrl: orimiseBaseUrl,
        model: visionModel || 'gemini-2.5-flash-lite',
        batchSize: effectiveBatchSize, // User configurable: 12, 15, 20, 30, 40, 50, 60
        concurrency: Number(visionConcurrency) || 6,
        srtSubtitles: srtSubtitlesToPass,
        glossary: glossary || [],
        onProgress: (p) => {
          setVisionProgress({
            phase: 'ai_scanning',
            percent: p.percent,
            message: p.message
          });
          if (p.currentFrame) {
            setLiveCurrentFrame(p.currentFrame);
          }
        }
      });






      if (detected.length === 0) {
        alert('AI đã quét các khung hình nhưng không phát hiện bảng tên nhân vật nào. Bạn có thể chọn khoảng cách quét dày hơn (VD: 5 giây) để quét chi tiết hơn.');
      } else {
        const detectedWithMovie = detected.map(c => ({
          ...c,
          movieName: visionVideoFile.name,
          firstFileName: visionVideoFile.name
        }));
        setVisionDetectedChars(detectedWithMovie);
        setCharacters(prev => {
          const existingNames = new Set(prev.filter(c => (c.movieName || c.firstFileName) === visionVideoFile.name).map(c => c.name.toLowerCase().trim()));
          const newChars = detectedWithMovie.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
          return [...newChars, ...prev];
        });
        setActiveMovieFilter(visionVideoFile.name);

        // 💾 Save Vision Scan Session to History
        const session = {
          id: `scan_vision_${Date.now()}`,
          timeFormatted: new Date().toLocaleString('vi-VN'),
          videoName: visionVideoFile.name,
          videoSize: `${(visionVideoFile.size / (1024 * 1024)).toFixed(1)} MB`,
          type: 'vision',
          count: detected.length,
          characters: detectedWithMovie,
          tagDurationSec: tagDurationSec || 2,
          settings: {
            intervalSec: visionIntervalSec,
            concurrency: visionConcurrency,
            flipHorizontal: visionFlipHorizontal
          }
        };
        setScanHistory(prev => [session, ...prev.slice(0, 29)]);

        setScanProgress(`🎉 AI Vision đã tìm thấy ${detected.length} bảng tên nhân vật cho phim [${visionVideoFile.name}] và tự động lưu vào lịch sử!`);
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

  // Restore characters from a history session
  const handleRestoreSession = (session) => {
    if (!session || !session.characters || session.characters.length === 0) return;
    setCharacters(prev => {
      const existingNames = new Set(prev.map(c => c.name.toLowerCase().trim()));
      const newChars = session.characters.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
      return [...newChars, ...prev];
    });
    setActiveTabSub('characters');
    setScanProgress(`🔄 Đã nạp lại ${session.characters.length} thẻ từ lần quét [${session.videoName}] vào danh sách chính!`);
    setTimeout(() => setScanProgress(''), 4000);
  };

  // Export SRT directly from a history session
  const handleExportSessionSRT = (session) => {
    if (!session || !session.characters || session.characters.length === 0) return;
    const durSec = session.tagDurationSec || tagDurationSec || 2;
    const srtContent = generateCharacterIntroSRT(session.characters, effectiveTargetFiles, true, fileDurations, gapSeconds, durSec);
    if (!srtContent) {
      alert('Không thể tạo file SRT từ lịch sử này.');
      return;
    }
    const safeName = (session.videoName || 'Session').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(srtContent, `LichSu_${safeName}_Tags.srt`);
  };

  // Export ASS directly from a history session
  const handleExportSessionASS = (session) => {
    if (!session || !session.characters || session.characters.length === 0) return;
    const durSec = session.tagDurationSec || tagDurationSec || 2;
    const assContent = generateCharacterIntroASS(session.characters, effectiveTargetFiles, true, fileDurations, gapSeconds, durSec);
    if (!assContent) {
      alert('Không thể tạo file ASS từ lịch sử này.');
      return;
    }
    const safeName = (session.videoName || 'Session').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(assContent, `LichSu_${safeName}_Tags.ass`);
  };

  // Delete a history session
  const handleDeleteSession = (sessionId) => {
    setScanHistory(prev => prev.filter(s => s.id !== sessionId));
  };

  // Clear all scan history
  const handleClearAllHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử quét không?')) {
      setScanHistory([]);
      try {
        localStorage.removeItem('tutien_scan_history_sessions');
      } catch (e) {}
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

  const { fileOffsets } = computeFileOffsets(effectiveTargetFiles, fileDurations, gapSeconds);

  // Helper to compute cumulative full movie MP4 timestamp for each character
  const getFullMovieTimestamp = (char) => {
    const offset = findFileOffset(char, effectiveTargetFiles, fileOffsets);
    const localMs = srtTimeToMs(char.firstTimestamp);
    return msToSrtTime(offset + localMs);
  };

  const getFullMovieStartMs = (char) => {
    const offset = findFileOffset(char, effectiveTargetFiles, fileOffsets);
    const localMs = srtTimeToMs(char.firstTimestamp);
    return offset + localMs;
  };


  // Apply chosen format template to all existing characters
  const handleApplyFormatToAll = () => {
    if (characters.length === 0) {
      alert('Chưa có nhân vật nào trong danh sách!');
      return;
    }
    setCharacters(prev => prev.map(c => ({
      ...c,
      introTag: cleanAndFormatIntroTag(c, tagFormatTemplate, customTagPattern)
    })));
    setScanProgress(`✨ Đã chuẩn hóa định dạng mẫu cho toàn bộ ${characters.length} thẻ nhân vật / thần binh!`);
    setTimeout(() => setScanProgress(''), 4000);
  };

  // 🧹 Smart Clean & Discard Meaningless / Dialogue / Long Garbage Cards
  const handleCleanJunkCards = () => {
    if (characters.length === 0) {
      alert('Chưa có thẻ nhân vật nào trong danh sách!');
      return;
    }
    const cleanList = characters.filter(c => isValidLoreEntity(c));
    const removedCount = characters.length - cleanList.length;
    if (removedCount === 0) {
      alert('✅ Danh sách thẻ hiện tại rất sạch! Không có text rác hay câu thoại dài nào.');
      return;
    }
    if (window.confirm(`Hệ thống tìm thấy ${removedCount} thẻ text rác / câu thoại dài / logo rác. Bạn có muốn xóa tự động không?`)) {
      setCharacters(cleanList);
      setScanProgress(`🧹 Đã quét và loại bỏ thành công ${removedCount} thẻ text rác / câu thoại dài!`);
      setTimeout(() => setScanProgress(''), 4000);
    }
  };


  // List of all unique movies in characters
  const availableMovies = Array.from(

    new Set(characters.map(c => c.movieName || c.firstFileName || 'Mặc định').filter(Boolean))
  );

  // Characters belonging to active movie
  const activeMovieCharacters = activeMovieFilter === 'all'
    ? characters
    : characters.filter(c => (c.movieName || c.firstFileName || 'Mặc định') === activeMovieFilter);

  // Delete characters of active movie only
  const handleDeleteCurrentMovieCharacters = () => {
    if (activeMovieFilter === 'all') {
      if (window.confirm(`Bạn có chắc chắn muốn xóa TOÀN BỘ ${characters.length} nhân vật của tất cả các phim không?`)) {
        setCharacters([]);
        setScanProgress('🗑️ Đã xóa toàn bộ nhân vật của tất cả các phim!');
        setTimeout(() => setScanProgress(''), 3000);
      }
    } else {
      const count = characters.filter(c => (c.movieName || c.firstFileName || 'Mặc định') === activeMovieFilter).length;
      if (window.confirm(`Bạn có chắc muốn xóa ${count} nhân vật của phim [${activeMovieFilter}] không? Các phim khác vẫn sẽ được giữ nguyên 100%.`)) {
        setCharacters(prev => prev.filter(c => (c.movieName || c.firstFileName || 'Mặc định') !== activeMovieFilter));
        setActiveMovieFilter('all');
        setScanProgress(`🗑️ Đã xóa ${count} nhân vật của phim [${activeMovieFilter}]!`);
        setTimeout(() => setScanProgress(''), 3000);
      }
    }
  };

  // Export SRT Intro Tags (defaults to Full Movie MP4 continuous timeline)
  const handleExportIntroSRT = (isFullMovie = true) => {
    const targetChars = activeMovieCharacters;
    const srtContent = generateCharacterIntroSRT(targetChars, effectiveTargetFiles, isFullMovie, fileDurations, gapSeconds, tagDurationSec, tagFormatTemplate, customTagPattern);
    if (!srtContent) {
      alert('Chưa có nhân vật nào được bật trong phim này để xuất file chú thích!');
      return;
    }
    const safeMovie = activeMovieFilter === 'all' ? `Full_${effectiveTargetFiles.length}Tap` : activeMovieFilter.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(srtContent, `${safeMovie}_Character_Tags.srt`);
  };

  // Export ASS Intro Tags (defaults to Full Movie MP4 continuous timeline)
  const handleExportIntroASS = (isFullMovie = true) => {
    const targetChars = activeMovieCharacters;
    const assContent = generateCharacterIntroASS(targetChars, effectiveTargetFiles, isFullMovie, fileDurations, gapSeconds, tagDurationSec, tagFormatTemplate, customTagPattern);
    if (!assContent) {
      alert('Chưa có nhân vật nào được bật trong phim này để xuất file chú thích!');
      return;
    }
    const safeMovie = activeMovieFilter === 'all' ? `Full_${effectiveTargetFiles.length}Tap` : activeMovieFilter.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(assContent, `${safeMovie}_Character_Tags.ass`);
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
    const targetChars = activeMovieCharacters;
    if (targetChars.length === 0) return;
    const sortedActive = [...targetChars].filter(c => c.enabled !== false).sort((a, b) => getFullMovieStartMs(a) - getFullMovieStartMs(b));
    let text = `📜 BẢNG HỒ SƠ NHÂN VẬT & CẢNH GIỚI ${activeMovieFilter !== 'all' ? `[PHIM: ${activeMovieFilter}] ` : ''}(THEO THỨ TỰ XUẤT HIỆN TRONG VIDEO):\n\n`;
    sortedActive.forEach((c, idx) => {
      text += `${idx + 1}. 👤 ${c.name} ${c.originalName ? `(${c.originalName})` : ''}\n`;
      text += `   • Thân phận: ${c.role} | Môn phái: ${c.sect}\n`;
      text += `   • Cảnh giới: ${c.realm}\n`;
      if (c.quote) text += `   • Lời thoại: "${c.quote}"\n`;
      text += `   • Xuất hiện tại: ${c.firstFileName || 'Tập 1'} (Mốc MP4: ${getFullMovieTimestamp(c)})\n\n`;
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
      const charMovie = c.movieName || c.firstFileName || 'Mặc định';
      if (activeMovieFilter !== 'all' && charMovie !== activeMovieFilter) {
        return false;
      }
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.sect && c.sect.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.realm && c.realm.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.role && c.role.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filterRole === 'all') return matchesSearch;
      if (filterRole === 'character') return matchesSearch && (c.type === 'character' || !c.type);
      if (filterRole === 'weapon') return matchesSearch && (c.type === 'weapon');
      if (filterRole === 'skill') return matchesSearch && (c.type === 'skill' || c.type === 'cong_phap');
      if (filterRole === 'location') return matchesSearch && (c.type === 'location');
      if (filterRole === 'realm') return matchesSearch && (c.type === 'realm');
      if (filterRole === 'system') return matchesSearch && (c.type === 'system');
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

          <button
            className={`tab-pill-btn ${activeTabSub === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTabSub('history')}
            style={{ borderColor: activeTabSub === 'history' ? '#06b6d4' : undefined }}
          >
            <History size={16} className="text-cyan" /> 📜 Lịch Sử Quét ({scanHistory.length})
          </button>
        </div>


        {/* Global Export Buttons */}
        <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
          <div className="flex-center gap-1 text-sm" style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} title="Thời lượng mỗi thẻ chú thích nhân vật / thần binh xuất hiện trên màn hình">
            <Clock size={14} className="text-cyan" />
            <span className="text-xs font-bold">Hiện thẻ:</span>
            <select
              value={tagDurationSec}
              onChange={(e) => setTagDurationSec(Number(e.target.value))}
              className="input-field select-field input-xs font-bold"
              style={{ color: '#06b6d4', background: 'rgba(0,0,0,0.5)', width: 'auto', padding: '2px 6px' }}
            >
              <option value={1.5}>1.5 Giây</option>
              <option value={2}>2.0 Giây (Chuẩn 2s)</option>
              <option value={2.5}>2.5 Giây</option>
              <option value={3}>3.0 Giây</option>
              <option value={4}>4.0 Giây</option>
              <option value={5}>5.0 Giây</option>
            </select>
          </div>

          <button
            className="btn btn-secondary btn-sm flex-center gap-1"
            onClick={handleCopyLoreForYouTube}
            title="Copy toàn bộ danh sách nhân vật để đăng YouTube Community hoặc Mô Tả Video"
          >
            {copiedText ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            <span>{copiedText ? 'Đã Copy!' : 'Copy Cho YouTube'}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm flex-center gap-1 text-green font-bold"
            onClick={handleSaveToMySQL}
            disabled={isMySQLSyncing}
            title="Lưu toàn bộ hồ sơ nhân vật vào Cơ Sở Dữ Liệu MySQL (tutien_srt_tool)"
          >
            <Database size={14} className={isMySQLSyncing ? 'spinner' : 'text-green'} />
            <span>{isMySQLSyncing ? 'Đang Lưu...' : '💾 Lưu Vào MySQL'}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm flex-center gap-1 text-cyan font-bold"
            onClick={handleLoadFromMySQL}
            disabled={isMySQLSyncing}
            title="Tải lại toàn bộ danh sách nhân vật đã lưu từ MySQL"
          >
            <Database size={14} className={isMySQLSyncing ? 'spinner' : 'text-cyan'} />
            <span>📥 Tải Từ MySQL</span>
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
      <div className="subtab-pane-characters" style={{ display: activeTabSub === 'characters' ? 'block' : 'none' }}>
        <div className="character-tab-content">
          {/* Format Template Selector Bar */}
          <div className="format-template-bar card-panel p-3 mb-3 flex-between" style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.25)', flexWrap: 'wrap', gap: '12px' }}>
            <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
              <div className="flex-center gap-1 text-sm font-bold text-cyan">
                <Palette size={16} />
                <span>Mẫu Định Dạng Thẻ:</span>
              </div>

              <select
                value={tagFormatTemplate}
                onChange={(e) => setTagFormatTemplate(e.target.value)}
                className="input-field select-field input-sm font-bold"
                style={{ minWidth: '280px' }}
              >
                <option value="clean_compact">【 THẦN BINH: TÊN | CẤP BẬC 】 (Gọn Đẹp - Khuyên Dùng ⭐ Không Rớt Dòng)</option>
                <option value="full_3part">【 THẦN BINH: TÊN | MÔN PHÁI | CẢNH GIỚI 】 (Đầy Đủ 3 Phần)</option>
                <option value="modern_badge">⚔️ [ TÊN ] • Môn Phái • Cấp Bậc (Hiện Đại)</option>
                <option value="name_only_bracket">【 TÊN • MÔN PHÁI 】 (Tối Giản)</option>
                <option value="custom">⚙️ Tùy Chỉnh Mẫu Của Bạn...</option>
              </select>

              {tagFormatTemplate === 'custom' && (
                <input
                  type="text"
                  value={customTagPattern}
                  onChange={(e) => setCustomTagPattern(e.target.value)}
                  className="input-field input-sm font-mono text-cyan"
                  style={{ width: '260px' }}
                  placeholder="【 {TYPE}: {NAME} | {SECT} 】"
                />
              )}

              {/* Sample Live Preview Chip */}
              <div className="sample-preview-badge text-xs font-bold px-2 py-1 rounded flex-center gap-1" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #06b6d4', color: '#67e8f9' }}>
                <span className="text-muted">Xem trước:</span>
                <span>{cleanAndFormatIntroTag({ name: 'Huyền Thiện Linh Bảo', type: 'weapon', realm: 'Cực Phẩm Linh Bảo', sect: 'Bát Hoang Kiếm Các' }, tagFormatTemplate, customTagPattern)}</span>
              </div>
            </div>

            <div className="flex-center gap-2">
              <button
                className="btn btn-cyan btn-sm font-bold flex-center gap-1"
                onClick={handleApplyFormatToAll}
                title="Chuẩn hóa lại định dạng thẻ chú thích cho toàn bộ danh sách nhân vật và loại bỏ lặp từ"
              >
                <Sparkles size={14} /> ✨ Áp Dụng Mẫu Này Cho Tất Cả ({characters.length} Thẻ)
              </button>

              <button
                className="btn btn-secondary btn-sm font-bold flex-center gap-1"
                onClick={handleCleanJunkCards}
                style={{ borderColor: '#f59e0b', color: '#fbbf24' }}
                title="Tự động phát hiện và xóa bỏ các thẻ chứa câu thoại dài, phụ đề rác, logo watermark"
              >
                <Trash2 size={14} className="text-amber" /> 🧹 Lọc & Bỏ Text Rác / Câu Dài
              </button>
            </div>
          </div>


          {/* Movie Profiles Bar (Each movie has its own isolated character list) */}
          <div className="movie-profiles-bar card-panel p-2 mb-3 flex-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: '8px' }}>
            <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
              <span className="text-xs font-bold text-muted flex-center gap-1">
                <Film size={14} className="text-cyan" /> PHIM:
              </span>
              <button
                className={`btn btn-xs font-bold ${activeMovieFilter === 'all' ? 'btn-cyan' : 'btn-secondary'}`}
                onClick={() => setActiveMovieFilter('all')}
              >
                🎬 Tất Cả Phim ({characters.length})
              </button>
              {availableMovies.map((movieName) => {
                const count = characters.filter(c => (c.movieName || c.firstFileName || 'Mặc định') === movieName).length;
                return (
                  <button
                    key={movieName}
                    className={`btn btn-xs font-bold ${activeMovieFilter === movieName ? 'btn-cyan' : 'btn-secondary'}`}
                    onClick={() => setActiveMovieFilter(movieName)}
                    style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={movieName}
                  >
                    🎬 {movieName} ({count})
                  </button>
                );
              })}
            </div>

            {activeMovieFilter !== 'all' && (
              <div className="flex-center gap-2">
                <span className="text-xs text-cyan font-bold">
                  Đang chọn: <strong>{activeMovieFilter}</strong> ({activeMovieCharacters.length} thẻ)
                </span>
                <button
                  className="btn btn-danger btn-xs font-bold flex-center gap-1"
                  onClick={handleDeleteCurrentMovieCharacters}
                  title="Xóa toàn bộ nhân vật thuộc bộ phim này mà không ảnh hưởng tới phim khác"
                >
                  <Trash2 size={13} /> Xóa Nhân Vật Của Phim Này
                </button>
              </div>
            )}
          </div>

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
                <option value="all">Tất cả thực thể & vai trò ({activeMovieCharacters.length})</option>
                <option value="character">👤 Nhân Vật</option>
                <option value="weapon">⚔️ Thần Binh / Pháp Bảo</option>
                <option value="skill">📜 Công Pháp / Tuyệt Kỹ</option>
                <option value="location">🏛️ Địa Danh / Tông Môn</option>
                <option value="realm">⚡ Cảnh Giới Tu Vi</option>
                <option value="system">🤖 Hệ Thống</option>
                <option value="main">Nhân vật chính / Nữ chính</option>
                <option value="antagonist">Phản diện / Ma đạo</option>
              </select>

              <span className="text-muted text-sm">
                Đang hiển thị: <strong className="highlight-cyan">{filteredCharacters.length}</strong> thực thể
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
                        title="Xóa thẻ này"
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

                  <div className="char-badges-row flex-center gap-2 mt-2 mb-2" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    {char.type === 'weapon' && (
                      <span className="badge badge-purple font-bold">⚔️ Thần Binh</span>
                    )}
                    {(char.type === 'skill' || char.type === 'cong_phap') && (
                      <span className="badge font-bold" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid #eab308' }}>📜 Công Pháp / Kỹ Năng</span>
                    )}
                    {char.type === 'location' && (
                      <span className="badge badge-cyan font-bold">🏛️ Địa Danh</span>
                    )}
                    {char.type === 'realm' && (
                      <span className="badge font-bold" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid #3b82f6' }}>⚡ Cảnh Giới</span>
                    )}
                    {char.type === 'system' && (
                      <span className="badge font-bold" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: '1px solid #ec4899' }}>🤖 Hệ Thống</span>
                    )}
                    {!isInvalidLoreValue(char.role) && (
                      <span className="badge badge-role">👤 {char.role}</span>
                    )}
                    {!isInvalidLoreValue(char.sect) && (
                      <span className="badge badge-sect">🏛️ {char.sect}</span>
                    )}
                    {!isInvalidLoreValue(char.realm) && (
                      <span className="badge badge-realm">⚡ {char.realm}</span>
                    )}
                    {char.source === 'vision_ocr' && (
                      <span className="badge badge-done" style={{ fontSize: '10px' }}>👁️ Thị Giác Video</span>
                    )}
                    {char.firstFileName && (

                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '10px' }}>
                        🎬 {char.firstFileName}
                      </span>
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

                  {/* Intro Tag Preview Banner (Always dynamically cleaned & formatted) */}
                  <div className="char-tag-preview mt-2">
                    <span className="tag-preview-label">Thẻ chú thích trên video:</span>
                    <div className="tag-preview-box font-bold text-cyan">
                      {cleanAndFormatIntroTag(char, tagFormatTemplate, customTagPattern) || char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} 】`}
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
      </div>

      {/* TAB 2: AI VIDEO VISION SCANNER (BẢNG TÊN & CHỮ HÁN TRÊN KHUNG HÌNH VIDEO) */}
      <div className="subtab-pane-vision" style={{ display: activeTabSub === 'vision_scan' ? 'block' : 'none' }}>
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

                  <div className="flex-center gap-1 text-sm text-green font-bold" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <Layers size={15} />
                    <span>Quét Toàn Bộ 100% Video</span>
                  </div>

                  <div className="flex-center gap-1 text-sm font-bold" style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                    <Sparkles size={15} className="text-cyan" />
                    <span>Mô Hình AI Vision:</span>
                    <select
                      value={visionModel}
                      onChange={(e) => {
                        setVisionModel(e.target.value);
                        localStorage.setItem('tutien_vision_model', e.target.value);
                      }}
                      className="input-field select-field input-xs font-bold text-cyan"
                      style={{ background: 'rgba(0,0,0,0.5)', width: 'auto' }}
                      title="Chọn mô hình AI quét thị giác khung hình video MP4"
                    >
                      <option value="gemini-2.5-flash-lite">⚡ Gemini 2.5 Flash Lite (Mặc định ⭐ Siêu Tiết Kiệm Token & Cực Nhanh)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Tiêu Chuẩn Cân Bằng)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Độ Chính Xác Cao)</option>
                      <option value="claude-fable-5">Claude Fable 5</option>
                      <option value="claude-sonnet-5">Claude Sonnet 5</option>
                    </select>
                  </div>

                  <div className="flex-center gap-1 text-sm font-bold" style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    <Zap size={15} className="text-yellow" />
                    <span>Đa Luồng AI:</span>
                    <select
                      value={visionConcurrency}
                      onChange={(e) => setVisionConcurrency(Number(e.target.value))}
                      className="input-field select-field input-xs font-bold"
                      style={{ color: '#eab308', background: 'rgba(0,0,0,0.5)', width: 'auto' }}
                    >
                      <option value={3}>3 Luồng (Tiêu chuẩn)</option>
                      <option value={6}>6 Luồng (Khuyên Dùng - Siêu Nhanh ⚡)</option>
                      <option value={10}>10 Luồng (Cực Nhanh 🚀)</option>
                      <option value={15}>15 Luồng (Tối Đa)</option>
                    </select>
                  </div>




                  <label 
                    className="flex-center gap-2 text-sm font-bold cursor-pointer"
                    style={{ 
                      background: visionFlipHorizontal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      border: visionFlipHorizontal ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      color: visionFlipHorizontal ? '#10b981' : 'inherit'
                    }}
                    title="Tự động lật ngược lại chiều thuận đối với video re-up bị lật gương (Flip Horizontal) để AI đọc chữ Hán và thư pháp chính xác 100%"
                  >
                    <input
                      type="checkbox"
                      checked={visionFlipHorizontal}
                      onChange={(e) => setVisionFlipHorizontal(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span>🔄 Tự Động Lật Gương (Video Re-up)</span>
                  </label>

                  <label 
                    className="flex-center gap-2 text-sm font-bold cursor-pointer"
                    style={{ 
                      background: visionFilterStatic ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      border: visionFilterStatic ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                      color: visionFilterStatic ? '#c084fc' : 'inherit'
                    }}
                    title="Canvas tự động so sánh pixel và bỏ qua các khung hình tĩnh trùng lặp (tiết kiệm ~35-45% tokens & request)"
                  >
                    <input
                      type="checkbox"
                      checked={visionFilterStatic}
                      onChange={(e) => setVisionFilterStatic(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span>⚡ Lọc Cảnh Tĩnh (Tiết Kiệm 40% Token)</span>
                  </label>

                  <label 
                    className="flex-center gap-2 text-sm font-bold cursor-pointer"
                    style={{ 
                      background: visionUseSRTContext ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.05)', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      border: visionUseSRTContext ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                      color: visionUseSRTContext ? '#67e8f9' : 'inherit'
                    }}
                    title="AI tự động đọc toàn bộ file phụ đề SRT đã chọn để hiểu nhân vật, công pháp, thần binh, môn phái trước khi quét ảnh"
                  >
                    <input
                      type="checkbox"
                      checked={visionUseSRTContext}
                      onChange={(e) => setVisionUseSRTContext(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span>🧠 Nạp Ngữ Cảnh SRT ({effectiveTargetFiles.length > 0 ? effectiveTargetFiles.length : files.length} Tập)</span>
                  </label>

                  <div className="flex-center gap-1 text-sm font-bold" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <span>📦 Gom Ảnh:</span>
                    <select
                      value={visionBatchSize}
                      onChange={(e) => setVisionBatchSize(Number(e.target.value))}
                      className="input-field select-field input-xs font-bold text-green"
                      style={{ background: 'rgba(0,0,0,0.5)', width: 'auto' }}
                      title="Số lượng ảnh gửi cùng lúc trong 1 request AI để tối ưu chi phí và độ chính xác"
                    >
                      <option value={2}>2 Ảnh / Request (Độ Chính Xác Tuyệt Đối 🎯)</option>
                      <option value={4}>4 Ảnh / Request (Khuyên Dùng ⭐ Chuẩn Từng Giây)</option>
                      <option value={6}>6 Ảnh / Request (Cân Bằng Tốc Độ & Độ Chuẩn)</option>
                      <option value={8}>8 Ảnh / Request</option>
                      <option value={10}>10 Ảnh / Request (Tiết Kiệm Request)</option>
                      <option value={12}>12 Ảnh / Request</option>
                      <option value={15}>15 Ảnh / Request</option>
                      <option value={20}>20 Ảnh / Request</option>
                      <option value={30}>30 Ảnh / Request</option>
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
      </div>

      {/* TAB 3: TIMELINE STITCHING & CONTINUOUS FULL MOVIE */}
      <div className="subtab-pane-stitching" style={{ display: activeTabSub === 'stitching' ? 'block' : 'none' }}>
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

              {Object.keys(fileDurations).length > 0 && (
                <button
                  className="btn btn-secondary btn-sm flex-center gap-1"
                  onClick={handleResetDurationsToSubtitles}
                  title="Khôi phục thời lượng các tập về mốc dòng sub cuối cùng"
                >
                  🔄 Đặt Lại Theo Sub
                </button>
              )}
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
                        <td>
                          <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                            <input
                              type="number"
                              min="1"
                              value={actualDurationSec}
                              onClick={e => e.stopPropagation()}
                              onChange={e => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 0);
                                handleUpdateFileDuration(file.id, val);
                              }}
                              className="input-field input-xs font-mono font-bold"
                              style={{ width: '80px', color: isFromMp4 ? '#10b981' : '#f59e0b' }}
                            />
                            <span className="text-xs text-muted">s ({msToSrtTime(actualDurationSec * 1000).substring(3, 8)})</span>
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
      </div>

      {/* TAB 4: SCAN HISTORY */}
      <div className="subtab-pane-history" style={{ display: activeTabSub === 'history' ? 'block' : 'none' }}>
        <div className="history-tab-content fade-in">
          <div className="card-panel p-4 mb-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="font-bold flex-center gap-2 text-cyan" style={{ justifyContent: 'flex-start' }}>
                  <History size={20} /> Lịch Sử Các Lần Quét AI ({scanHistory.length} Phiên Đã Lưu)
                </h3>
                <p className="text-xs text-muted mt-1">
                  Mỗi lần AI soi video MP4 hoặc phân tích SRT đều được tự động lưu trữ vĩnh viễn trên trình duyệt. Bạn có thể xuất lại file hoặc nạp lại danh sách bất kỳ lúc nào.
                </p>
              </div>

              {scanHistory.length > 0 && (
                <button
                  className="btn btn-danger btn-sm flex-center gap-1 font-bold"
                  onClick={handleClearAllHistory}
                >
                  <Trash2 size={14} /> Xóa Sạch Toàn Bộ Lịch Sử
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div className="text-center p-5 text-muted flex-center flex-column gap-3" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <History size={48} style={{ opacity: 0.3 }} />
                <p className="font-bold text-base">Chưa có lịch sử quét nào được ghi nhận</p>
                <p className="text-xs text-muted">Hãy thực hiện một lượt quét thị giác video hoặc quét phụ đề SRT để lưu phiên làm việc tại đây.</p>
                <button
                  className="btn btn-green-glow btn-sm font-bold mt-2 flex-center gap-1"
                  onClick={() => setActiveTabSub('vision_scan')}
                >
                  <Eye size={15} /> Đi Tới Tab Quét Thị Giác Video MP4
                </button>
              </div>
            ) : (
              <div className="history-sessions-list flex-column gap-3">
                {scanHistory.map((session, sIdx) => (
                  <div 
                    key={session.id || sIdx}
                    className="history-session-card p-3 rounded-lg border mb-3"
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      borderColor: session.type === 'vision' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(168, 85, 247, 0.4)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div className="flex-between mb-2" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <div className="flex-center gap-2">
                        {session.type === 'vision' ? (
                          <span className="badge badge-green flex-center gap-1" style={{ fontSize: '11px', padding: '3px 8px' }}>
                            <Eye size={13} /> Quét Thị Giác Video
                          </span>
                        ) : (
                          <span className="badge badge-purple flex-center gap-1" style={{ fontSize: '11px', padding: '3px 8px' }}>
                            <Sparkles size={13} /> Quét Phụ Đề SRT
                          </span>
                        )}
                        <strong className="text-sm font-bold text-white">{session.videoName}</strong>
                        {session.videoSize && <span className="text-xs text-muted">({session.videoSize})</span>}
                      </div>

                      <div className="flex-center gap-3 text-xs text-muted">
                        <span className="flex-center gap-1">
                          <Calendar size={13} className="text-cyan" /> {session.timeFormatted}
                        </span>
                        <span className="badge badge-cyan font-bold" style={{ fontSize: '11px' }}>
                          🎯 {session.count || session.characters?.length || 0} Thẻ Đã Tìm Thấy
                        </span>
                      </div>
                    </div>

                    {/* Preview Cards/Badges Row */}
                    {session.characters && session.characters.length > 0 && (
                      <div className="session-preview-row flex-center gap-2 my-2 overflow-x-auto p-2 rounded" style={{ justifyContent: 'flex-start', background: 'rgba(255,255,255,0.03)', maxWidth: '100%', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {session.characters.slice(0, 6).map((c, cIdx) => (
                          <div 
                            key={cIdx} 
                            className="preview-item-chip flex-center gap-2 p-1 px-2 rounded text-xs"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}
                          >
                            {c.thumbnail && (
                              <img src={c.thumbnail} alt={c.name} style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
                            )}
                            <div>
                              <strong className="text-cyan">{c.name}</strong>
                              <span className="text-muted ml-1">({c.firstTimestamp})</span>
                            </div>
                          </div>
                        ))}
                        {session.characters.length > 6 && (
                          <span className="text-xs text-muted font-bold px-2">
                            +{session.characters.length - 6} thẻ khác...
                          </span>
                        )}
                      </div>
                    )}

                    {/* Session Action Buttons */}
                    <div className="session-actions-row flex-between mt-3 pt-2 border-top" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-cyan btn-xs font-bold flex-center gap-1"
                          onClick={() => handleExportSessionSRT(session)}
                          title="Tải trực tiếp file SRT chú thích từ phiên quét này"
                        >
                          <Download size={13} /> Tải Lại .SRT ({session.tagDurationSec || 2}s)
                        </button>
                        <button
                          className="btn btn-green-glow btn-xs font-bold flex-center gap-1"
                          onClick={() => handleExportSessionASS(session)}
                          title="Tải trực tiếp file ASS chú thích từ phiên quét này"
                        >
                          <Download size={13} /> Tải Lại .ASS
                        </button>
                        <button
                          className="btn btn-secondary btn-xs font-bold flex-center gap-1"
                          onClick={() => handleRestoreSession(session)}
                          title="Nạp lại toàn bộ nhân vật của phiên này vào danh sách làm việc chính"
                        >
                          <RotateCcw size={13} className="text-cyan" /> Nạp Lại Danh Sách Này
                        </button>
                      </div>

                      <button
                        className="btn btn-icon btn-danger btn-xs"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Xóa phiên quét này khỏi lịch sử"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                <label className="form-label">Thuộc Bộ Phim / Video:</label>
                <input
                  type="text"
                  value={editingChar.movieName || editingChar.firstFileName || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, movieName: e.target.value, firstFileName: e.target.value }))}
                  className="input-field text-cyan font-bold"
                  placeholder="VD: JOINED_VOICE_d2_01.mp4, Hoàn Mỹ Thế Giới..."
                />
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
