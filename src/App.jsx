import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import Header from './components/Header';
import FileListPanel from './components/FileListPanel';
import SubtitleEditor from './components/SubtitleEditor';
import GlossaryManager from './components/GlossaryManager';
import PronounPresetSelector from './components/PronounPresetSelector';
import YoutuberStudio from './components/YoutuberStudio';
import AISettingsModal from './components/AISettingsModal';

import { DEFAULT_GLOSSARY, PRONOUN_PRESETS, SAMPLE_SRT } from './data/defaultGlossary';
import { parseSRT, generateSRT } from './utils/srtParser';
import { localTranslateLine, translateBatchWithGemini, translateBatchWithOrimise, translateSubtitlesWithThreadPool } from './utils/translator';
import { getFilesFromDataTransfer, processZipFile, getSmartFileName } from './utils/fileScanner';
import { loadProjectStateFromDB, saveProjectStateToDB } from './utils/dbStorage';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('tutien_active_tab') || 'editor';
  });

  // Persist activeTab to localStorage
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('tutien_active_tab', activeTab);
    }
  }, [activeTab]);

  // Multi-file state: array of file objects
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  // Restore state from IndexedDB on page refresh
  useEffect(() => {
    async function restoreState() {
      const restored = await loadProjectStateFromDB();
      if (restored.files && restored.files.length > 0) {
        setFiles(restored.files);
        if (restored.activeFileId) {
          setActiveFileId(restored.activeFileId);
        } else {
          setActiveFileId(restored.files[0].id);
        }
      }
      if (restored.activeTab && !localStorage.getItem('tutien_active_tab')) {
        setActiveTab(restored.activeTab);
      }
      setIsStateLoaded(true);
    }
    restoreState();
  }, []);

  // Debounced Auto-Save to IndexedDB on file edits / additions
  useEffect(() => {
    if (!isStateLoaded) return;
    const timer = setTimeout(() => {
      saveProjectStateToDB(files, activeFileId, activeTab);
    }, 500);
    return () => clearTimeout(timer);
  }, [files, activeFileId, activeTab, isStateLoaded]);


  // Diff tracking state (Hiển thị Lịch sử Thay Đổi Đỏ/Xanh)
  const [showDiffLog, setShowDiffLog] = useState(true);

  // Glossary state with localStorage persistence
  const [glossary, setGlossary] = useState(() => {
    const saved = localStorage.getItem('tutien_glossary');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_GLOSSARY.length) {
          return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_GLOSSARY;
  });

  // Pronoun active preset
  const [activePresetId, setActivePresetId] = useState('ta_nguoi');

  // AI Provider & Keys state
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('tutien_ai_provider') || 'orimise');
  const [orimiseKey, setOrimiseKey] = useState(() => localStorage.getItem('tutien_orimise_key') || 'sk-544e5d8289b304b8198e534f18da07085ce0768a95d2ca1b76970a2d8a1d082f');
  const [orimiseBaseUrl, setOrimiseBaseUrl] = useState(() => localStorage.getItem('tutien_orimise_url') || 'https://api.orimise.com/v1');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('tutien_gemini_key') || '');
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('tutien_ai_model') || 'gemini-2.5-flash');
  const [concurrency, setConcurrency] = useState(() => Number(localStorage.getItem('tutien_concurrency')) || 4);

  const [customPrompt, setCustomPrompt] = useState(() => localStorage.getItem('tutien_custom_prompt') || '');
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);

  // Batch progress state
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState('');

  // LocalStorage sync
  useEffect(() => {
    localStorage.setItem('tutien_glossary', JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    localStorage.setItem('tutien_ai_provider', aiProvider);
    localStorage.setItem('tutien_orimise_key', orimiseKey);
    localStorage.setItem('tutien_orimise_url', orimiseBaseUrl);
    localStorage.setItem('tutien_gemini_key', geminiKey);
    localStorage.setItem('tutien_ai_model', aiModel);
    localStorage.setItem('tutien_concurrency', concurrency);
    localStorage.setItem('tutien_custom_prompt', customPrompt);
  }, [aiProvider, orimiseKey, orimiseBaseUrl, geminiKey, aiModel, concurrency, customPrompt]);


  // Native File System Access API: Pick SRT files with persistent fileHandle
  const handleOpenFilesNative = async () => {
    if (!window.showOpenFilePicker) {
      // Fallback to standard input click
      return false;
    }

    try {
      const fileHandles = await window.showOpenFilePicker({
        multiple: true,
        types: [{
          description: 'SubRip Subtitle Files (*.srt)',
          accept: { 'text/plain': ['.srt'] }
        }]
      });

      const newFileObjs = [];
      for (let i = 0; i < fileHandles.length; i++) {
        const handle = fileHandles[i];
        const file = await handle.getFile();
        const text = await file.text();
        const parsed = parseSRT(text);
        if (parsed.length > 0) {
          newFileObjs.push({
            id: `file_fs_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            fileHandle: handle, // <--- SAVES NATIVE FILE HANDLE FOR INSTANT DIRECT SAVE!
            subtitles: parsed.map(s => ({ ...s, previousText: s.originalText }))
          });
        }
      }

      if (newFileObjs.length > 0) {
        setFiles(prev => {
          const updated = [...prev, ...newFileObjs];
          if (!activeFileId || prev.length === 0) {
            setActiveFileId(newFileObjs[0].id);
          }
          return updated;
        });
      }
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Native File Picker Error:', err);
      }
      return false;
    }
  };

  // Native Directory Access API: Pick FOLDER with persistent file handles for all subfiles
  const handleOpenFolderNative = async () => {

    if (!window.showDirectoryPicker) {
      return false;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setBatchProgressText(`Đang quét đệ quy mọi file SRT từ thư mục "${dirHandle.name}"...`);

      const scannedFileObjs = [];

      async function scanDir(directoryHandle, pathPrefix = '') {
        for await (const entry of directoryHandle.values()) {
          const currentPath = pathPrefix ? `${pathPrefix} / ${entry.name}` : entry.name;

          if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.srt')) {
            const file = await entry.getFile();
            const text = await file.text();
            const parsed = parseSRT(text);
            if (parsed.length > 0) {
              scannedFileObjs.push({
                id: `file_dir_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: currentPath,
                fileHandle: entry, // <--- BOUND FILE HANDLE DIRECTLY ON DISK!
                subtitles: parsed.map(s => ({ ...s, previousText: s.originalText }))
              });
            }
          } else if (entry.kind === 'directory') {
            await scanDir(entry, currentPath);
          }
        }
      }

      await scanDir(dirHandle, dirHandle.name);

      if (scannedFileObjs.length > 0) {
        setFiles(prev => {
          const updated = [...prev, ...scannedFileObjs];
          if (!activeFileId || prev.length === 0) {
            setActiveFileId(scannedFileObjs[0].id);
          }
          return updated;
        });
        setBatchProgressText(`Đã nạp thành công ${scannedFileObjs.length} file SRT từ thư mục "${dirHandle.name}" kèm liên kết tự động lưu đè!`);
        setTimeout(() => setBatchProgressText(''), 4000);
      } else {
        alert(`Không tìm thấy file .srt nào trong thư mục "${dirHandle.name}".`);
        setBatchProgressText('');
      }

      return true;
    } catch (err) {
      setBatchProgressText('');
      if (err.name !== 'AbortError') {
        console.error('Native Directory Picker Error:', err);
      }
      return false;
    }
  };


  // Handle uploading multiple SRT files
  const handleAddFiles = (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    uploadedFiles.forEach((file, idx) => {
      // Check if it's a zip file
      if (file.name.toLowerCase().endsWith('.zip')) {
        handleAddZip(file);
        return;
      }

      if (!file.name.toLowerCase().endsWith('.srt')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsed = parseSRT(text);
        if (parsed.length > 0) {
          const displayName = getSmartFileName(file);

          const fileObj = {
            id: `file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            name: displayName,
            subtitles: parsed.map(s => ({
              ...s,
              previousText: s.originalText
            }))
          };

          setFiles(prev => {
            const updated = [...prev, fileObj];
            if (!activeFileId || prev.length === 0) {
              setActiveFileId(fileObj.id);
            }
            return updated;
          });
        }
      };
      reader.readAsText(file);
    });
  };

  // Handle Folder Upload (Recursive webkitdirectory selection)
  const handleAddFolder = (folderFiles) => {
    if (!folderFiles || folderFiles.length === 0) return;
    const srtFiles = folderFiles.filter(f => f.name.toLowerCase().endsWith('.srt'));

    if (srtFiles.length === 0) {
      alert('Không tìm thấy file .srt nào trong thư mục đã chọn.');
      return;
    }

    handleAddFiles(srtFiles);
  };


  // Handle Drag & Drop items (supports dropped folders with subdirectories)
  const handleDropDataTransfer = async (dataTransfer) => {
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      try {
        const scannedSrtFiles = await getFilesFromDataTransfer(dataTransfer.items);
        if (scannedSrtFiles.length > 0) {
          scannedSrtFiles.forEach(({ file, fullPath }, idx) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target.result;
              const parsed = parseSRT(text);
              if (parsed.length > 0) {
                const parts = fullPath.split('/');
                const fileName = parts.pop();
                const parentFolder = parts.length > 0 ? parts[parts.length - 1] : '';
                const displayName = parentFolder ? `${parentFolder} / ${fileName}` : fileName;

                const fileObj = {
                  id: `file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                  name: displayName,
                  subtitles: parsed.map(s => ({ ...s, previousText: s.originalText }))
                };

                setFiles(prev => {
                  const updated = [...prev, fileObj];
                  if (!activeFileId || prev.length === 0) {
                    setActiveFileId(fileObj.id);
                  }
                  return updated;
                });
              }
            };
            reader.readAsText(file);
          });
          return;
        }
      } catch (err) {
        console.error("Folder scan error:", err);
      }
    }

    // Fallback standard files array
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      handleAddFiles(Array.from(dataTransfer.files));
    }
  };

  // Handle ZIP file upload
  const handleAddZip = async (zipFile) => {
    if (!zipFile) return;
    setBatchProgressText(`Đang giải nén và quét file SRT từ "${zipFile.name}"...`);

    try {
      const extractedSrtItems = await processZipFile(zipFile);
      if (extractedSrtItems.length === 0) {
        alert('Không tìm thấy file .srt nào trong file ZIP.');
        setBatchProgressText('');
        return;
      }

      const newFileObjs = extractedSrtItems.map((item, idx) => ({
        id: `file_zip_${Date.now()}_${idx}`,
        name: item.name,
        subtitles: item.parsed.map(s => ({ ...s, previousText: s.originalText }))
      }));

      setFiles(prev => {
        const updated = [...prev, ...newFileObjs];
        if (!activeFileId || prev.length === 0) {
          setActiveFileId(newFileObjs[0].id);
        }
        return updated;
      });

      setBatchProgressText(`Đã giải nén thành công ${extractedSrtItems.length} file SRT từ file ZIP!`);
      setTimeout(() => setBatchProgressText(''), 3000);
    } catch (err) {
      alert(`Lỗi khi đọc file ZIP: ${err.message}`);
      setBatchProgressText('');
    }
  };

  // Load demo series (3 SRT files)
  const handleLoadSampleSeries = () => {
    const parsed1 = parseSRT(SAMPLE_SRT);
    const parsed2 = parseSRT(SAMPLE_SRT.replace('Châu Báo', 'Lý Đan').replace('Trúc Cơ Đan', 'Hóa Anh Đan'));
    const parsed3 = parseSRT(SAMPLE_SRT.replace('Vân Nham Tông', 'Thiên Diệu Tông').replace('Lâm Phong', 'Hàn Lập'));

    const demoFiles = [
      { id: 'demo_1', name: 'c9_01 / c9_01.srt', subtitles: parsed1.map(s => ({ ...s, previousText: s.originalText })) },
      { id: 'demo_2', name: 'c9_02_SubGoc_c9_02.srt', subtitles: parsed2.map(s => ({ ...s, previousText: s.originalText })) },
      { id: 'demo_3', name: 'c8_01_SubGoc_c8_01.srt', subtitles: parsed3.map(s => ({ ...s, previousText: s.originalText })) }
    ];

    setFiles(demoFiles);
    setActiveFileId('demo_1');
  };

  const handleRemoveFile = (fileId) => {
    const updated = files.filter(f => f.id !== fileId);
    setFiles(updated);
    if (activeFileId === fileId) {
      setActiveFileId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Batch Delete Filtered Files
  const handleRemoveFilteredFiles = (fileIdsToRemove) => {
    if (!fileIdsToRemove || fileIdsToRemove.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn XÓA HÀNG LOẠT ${fileIdsToRemove.length} file đang lọc khỏi danh sách?`)) {
      const updated = files.filter(f => !fileIdsToRemove.includes(f.id));
      setFiles(updated);
      if (fileIdsToRemove.includes(activeFileId)) {
        setActiveFileId(updated.length > 0 ? updated[0].id : null);
      }
    }
  };

  // Keep ONLY Filtered Files (Delete all non-matching files)
  const handleKeepOnlyFilteredFiles = (fileIdsToKeep) => {
    if (!fileIdsToKeep || fileIdsToKeep.length === 0) return;
    const countToDelete = files.length - fileIdsToKeep.length;
    if (countToDelete === 0) {
      alert('Tất cả các file hiện tại đều đang khớp với bộ lọc.');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn CHỈ GIỮ LẠI ${fileIdsToKeep.length} file đang lọc và XÓA SẠCH ${countToDelete} file không liên quan khác?`)) {
      const updated = files.filter(f => fileIdsToKeep.includes(f.id));
      setFiles(updated);
      if (!fileIdsToKeep.includes(activeFileId)) {
        setActiveFileId(updated.length > 0 ? updated[0].id : null);
      }
      alert(`Đã giữ lại ${fileIdsToKeep.length} file và xóa sạch ${countToDelete} file khác!`);
    }
  };

  // Auto Quick Cleaner: Remove all "SubGoc" files
  const handleRemoveSubGocFiles = () => {
    const subGocFiles = files.filter(f => f.name.toLowerCase().includes('subgoc'));
    if (subGocFiles.length === 0) {
      alert('Không tìm thấy file nào có chứa từ khóa "SubGoc" trong tên.');
      return;
    }
    const subGocIds = subGocFiles.map(f => f.id);
    if (window.confirm(`Tự động XÓA HÀNG LOẠT ${subGocFiles.length} file có chứa "SubGoc"?`)) {
      const updated = files.filter(f => !subGocIds.includes(f.id));
      setFiles(updated);
      if (subGocIds.includes(activeFileId)) {
        setActiveFileId(updated.length > 0 ? updated[0].id : null);
      }
      alert(`Đã xóa sạch thành công ${subGocFiles.length} file 'SubGoc'!`);
    }
  };

  const handleRemoveAllFiles = () => {
    if (window.confirm('Xóa tất cả các file SRT hiện tại khỏi bộ phim?')) {
      setFiles([]);
      setActiveFileId(null);
    }
  };

  // Active File Subtitles Update Helper
  const handleUpdateActiveSubtitles = (newSubtitles) => {
    setFiles(files.map(f =>
      f.id === activeFileId ? { ...f, subtitles: newSubtitles } : f
    ));
  };

  // Batch AI Translate All Files in the series using Turbo Multi-Threading Pool
  const handleBatchTranslateAI = async () => {
    if (files.length === 0) return;
    const isOrimise = aiProvider === 'orimise';
    const activeKey = isOrimise ? orimiseKey : geminiKey;

    if (!activeKey) {
      alert(`Vui lòng nhập ${isOrimise ? 'Orimise' : 'Google Gemini'} API Key trong menu Cấu Hình AI!`);
      setIsAISettingsOpen(true);
      return;
    }

    setIsBatchProcessing(true);

    try {
      const updatedFiles = [...files];

      for (let fIdx = 0; fIdx < updatedFiles.length; fIdx++) {
        const fileObj = updatedFiles[fIdx];
        const totalLines = fileObj.subtitles.length;
        setBatchProgressText(`⚡ [File ${fIdx + 1}/${updatedFiles.length}] Đang khởi chạy ${concurrency} luồng Turbo: "${fileObj.name}" (${totalLines} dòng)...`);

        const resultMap = await translateSubtitlesWithThreadPool({
          subtitles: fileObj.subtitles,
          isOrimise,
          apiKey: activeKey,
          baseUrl: orimiseBaseUrl,
          systemPrompt: customPrompt,
          glossary,
          model: aiModel,
          batchSize: 25,
          concurrency: concurrency,
          onProgress: (doneChunks, totalChunks, doneLines, total) => {
            setBatchProgressText(
              `⚡ [File ${fIdx + 1}/${updatedFiles.length}] Turbo ${concurrency} Luồng: "${fileObj.name}" — Xong ${doneChunks}/${totalChunks} khối (${Math.round((doneChunks / totalChunks) * 100)}%)`
            );
          }
        });

        // Apply translated map to file
        fileObj.subtitles = fileObj.subtitles.map(sub => {
          if (resultMap.has(sub.index)) {
            return {
              ...sub,
              previousText: sub.translatedText,
              translatedText: resultMap.get(sub.index),
              status: 'translated'
            };
          }
          return sub;
        });

        // Update state in real-time after each file finishes
        setFiles([...updatedFiles]);
      }

      setBatchProgressText(`🎉 ĐÃ DỊCH HOÀN TẤT SIÊU TỐC TẤT CẢ ${files.length} FILE SRT TRONG BỘ PHIM!`);
      setTimeout(() => setBatchProgressText(''), 4000);
    } catch (err) {
      alert(`Lỗi khi dịch hàng loạt: ${err.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Apply Glossary across all files
  const handleBatchApplyGlossary = () => {
    if (files.length === 0) return;
    const activeRules = PRONOUN_PRESETS.find(p => p.id === activePresetId)?.rules || [];

    const updatedFiles = files.map(fileObj => {
      const newSubs = fileObj.subtitles.map(sub => {
        const newTranslated = localTranslateLine(sub.originalText, glossary, activeRules);
        return {
          ...sub,
          previousText: sub.translatedText,
          translatedText: newTranslated,
          status: 'translated'
        };
      });
      return { ...fileObj, subtitles: newSubs };
    });

    setFiles(updatedFiles);
    alert(`Đã áp dụng Từ Điển Tu Tiên cho toàn bộ ${files.length} file SRT!`);
  };

  // Batch Apply Pronouns across all files
  const handleBatchApplyPronouns = () => {
    if (files.length === 0) return;
    const preset = PRONOUN_PRESETS.find(p => p.id === activePresetId) || PRONOUN_PRESETS[0];

    const updatedFiles = files.map(fileObj => {
      const newSubs = fileObj.subtitles.map(sub => {
        let text = sub.translatedText || sub.originalText;
        preset.rules.forEach(rule => {
          text = text.replace(rule.from, rule.to);
        });
        return {
          ...sub,
          previousText: sub.translatedText,
          translatedText: text,
          status: 'edited'
        };
      });
      return { ...fileObj, subtitles: newSubs };
    });

    setFiles(updatedFiles);
    alert(`Đã áp dụng quy tắc xưng hô "${preset.name}" cho toàn bộ ${files.length} file SRT!`);
  };

  // Export ALL files as a single ZIP archive
  const handleExportZip = async () => {
    if (files.length === 0) return;

    const zip = new JSZip();

    files.forEach(fileObj => {
      const srtContent = generateSRT(fileObj.subtitles, true);
      // Clean filename for Zip structure
      const cleanName = fileObj.name.replace(/ \/ /g, '_').replace(/[/\\?%*:|"<>]/g, '_');
      const fileName = cleanName.endsWith('.srt') ? cleanName : `${cleanName}.srt`;
      zip.file(fileName, srtContent);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bo_phim_srt_tu_tien_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Update file object with fileHandle once chosen
  const handleSetFileHandle = (fileId, fileHandle) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, fileHandle } : f));
  };

  // Batch Save All Files Directly back to Disk
  const handleBatchSaveDirectAll = async () => {

    if (files.length === 0) return;

    let savedCount = 0;
    for (let fileObj of files) {
      const srtContent = generateSRT(fileObj.subtitles, true);

      if (fileObj.fileHandle && fileObj.fileHandle.createWritable) {
        try {
          const writable = await fileObj.fileHandle.createWritable();
          await writable.write(srtContent);
          await writable.close();
          savedCount++;
          continue;
        } catch (err) {
          console.warn(`Error writing to ${fileObj.name}:`, err);
        }
      }

      // If no file handle, fallback prompt once per file
      if (window.showSaveFilePicker) {
        try {
          const cleanName = fileObj.name.replace(/^.*[\\/]/, '').replace(/ \/ /g, '_');
          const targetName = cleanName.endsWith('.srt') ? cleanName : `${cleanName}.srt`;
          const opts = {
            suggestedName: targetName,
            types: [{ description: 'SubRip Subtitle File (*.srt)', accept: { 'text/plain': ['.srt'] } }]
          };
          const handle = await window.showSaveFilePicker(opts);
          const writable = await handle.createWritable();
          await writable.write(srtContent);
          await writable.close();

          fileObj.fileHandle = handle;
          savedCount++;
        } catch (err) {
          if (err.name === 'AbortError') break;
        }
      }
    }

    if (savedCount > 0) {
      alert(`✅ ĐÃ LƯU TRỰC TIẾP THÀNH CÔNG HÀNG LOẠT ${savedCount} / ${files.length} FILE SRT VỀ ĐÚNG ĐƯỜNG DẪN GỐC TRÊN Ổ ĐĨA MÁY TÍNH!`);
    }
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const totalSubtitlesCount = files.reduce((sum, f) => sum + f.subtitles.length, 0);

  return (
    <div className="app-layout">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subtitleCount={totalSubtitlesCount}
        onOpenAISettings={() => setIsAISettingsOpen(true)}
      />

      <main className="main-content">
        {activeTab === 'editor' && (
          <>
            {/* Multi-file Project Manager Panel */}
            <FileListPanel
              files={files}
              activeFileId={activeFileId}
              setActiveFileId={setActiveFileId}
              onOpenFilesNative={handleOpenFilesNative}
              onOpenFolderNative={handleOpenFolderNative}
              onAddFiles={handleAddFiles}
              onAddFolder={handleAddFolder}
              onAddZip={handleAddZip}
              onRemoveFile={handleRemoveFile}
              onRemoveFilteredFiles={handleRemoveFilteredFiles}
              onKeepOnlyFilteredFiles={handleKeepOnlyFilteredFiles}
              onRemoveSubGocFiles={handleRemoveSubGocFiles}
              onRemoveAllFiles={handleRemoveAllFiles}
              onBatchTranslateAI={handleBatchTranslateAI}
              onBatchApplyGlossary={handleBatchApplyGlossary}
              onBatchApplyPronouns={handleBatchApplyPronouns}
              onBatchSaveDirectAll={handleBatchSaveDirectAll}
              onExportZip={handleExportZip}
              isBatchProcessing={isBatchProcessing}
              batchProgressText={batchProgressText}
              concurrency={concurrency}
              setConcurrency={setConcurrency}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
            />

            {/* Subtitle Line Editor for Active File */}
            <SubtitleEditor
              files={files}
              activeFile={activeFile}
              subtitles={activeFile?.subtitles || []}
              setSubtitles={handleUpdateActiveSubtitles}
              onOpenFilesNative={handleOpenFilesNative}
              onOpenFolderNative={handleOpenFolderNative}
              onSetFileHandle={handleSetFileHandle}
              onAddFiles={handleAddFiles}
              onAddFolder={handleAddFolder}
              onAddZip={handleAddZip}
              onDropDataTransfer={handleDropDataTransfer}
              onLoadSampleSeries={handleLoadSampleSeries}
              glossary={glossary}
              aiProvider={aiProvider}
              orimiseKey={orimiseKey}
              orimiseBaseUrl={orimiseBaseUrl}
              geminiKey={geminiKey}
              aiModel={aiModel}
              concurrency={concurrency}
              setConcurrency={setConcurrency}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              activePresetId={activePresetId}
              showDiffLog={showDiffLog}
              setShowDiffLog={setShowDiffLog}
            />

          </>
        )}



        {activeTab === 'glossary' && (
          <GlossaryManager
            glossary={glossary}
            setGlossary={setGlossary}
          />
        )}

        {activeTab === 'pronoun' && (
          <PronounPresetSelector
            activePresetId={activePresetId}
            setActivePresetId={setActivePresetId}
            onApplyPresetToSubtitles={(preset) => {
              setActivePresetId(preset.id);
              handleBatchApplyPronouns();
            }}
          />
        )}

        {activeTab === 'youtuber' && (
          <YoutuberStudio
            files={files}
            activeFile={activeFile}
            aiProvider={aiProvider}
            orimiseKey={orimiseKey}
            orimiseBaseUrl={orimiseBaseUrl}
            geminiKey={geminiKey}
            aiModel={aiModel}
          />
        )}
      </main>


      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        aiProvider={aiProvider}
        setAiProvider={setAiProvider}
        orimiseKey={orimiseKey}
        setOrimiseKey={setOrimiseKey}
        orimiseBaseUrl={orimiseBaseUrl}
        setOrimiseBaseUrl={setOrimiseBaseUrl}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        aiModel={aiModel}
        setAiModel={setAiModel}
        concurrency={concurrency}
        setConcurrency={setConcurrency}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
      />

      <footer className="app-footer">
        <p>Tu Tiên SRT Subtitle Pro &bull; Quản Lý & Dịch Hàng Loạt Bộ Phim SRT &bull; Orimise API ({aiModel})</p>
      </footer>
    </div>
  );
}
