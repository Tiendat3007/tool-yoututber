import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import Header from './components/Header';
import FileListPanel from './components/FileListPanel';
import SubtitleEditor from './components/SubtitleEditor';
import GlossaryManager from './components/GlossaryManager';
import PronounPresetSelector from './components/PronounPresetSelector';
import YoutuberStudio from './components/YoutuberStudio';
import CharacterLoreStudio from './components/CharacterLoreStudio';
import AISettingsModal from './components/AISettingsModal';
import AutoGlossaryModal from './components/AutoGlossaryModal';

import { DEFAULT_GLOSSARY, PRONOUN_PRESETS, SAMPLE_SRT } from './data/defaultGlossary';
import { parseSRT, generateSRT } from './utils/srtParser';
import { localTranslateLine, translateBatchWithGemini, translateBatchWithOrimise, translateSubtitlesWithThreadPool } from './utils/translator';
import { extractNewGlossaryTermsWithAI } from './utils/glossaryExtractor';
import { getFilesFromDataTransfer, processZipFile, getSmartFileName, isSubGocFile } from './utils/fileScanner';

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

  // Auto-Glossary Extraction State (Feature 1)
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);
  const [extractedGlossaryTerms, setExtractedGlossaryTerms] = useState(() => {
    try {
      const saved = localStorage.getItem('tutien_extracted_glossary');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Character Lore & Intro Tags state
  const [characters, setCharacters] = useState(() => {
    try {
      const saved = localStorage.getItem('tutien_character_lore');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Batch progress state
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState('');
  const [isLoreScanning, setIsLoreScanning] = useState(false);


  // LocalStorage sync
  useEffect(() => {
    localStorage.setItem('tutien_glossary', JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    localStorage.setItem('tutien_extracted_glossary', JSON.stringify(extractedGlossaryTerms));
  }, [extractedGlossaryTerms]);

  useEffect(() => {
    localStorage.setItem('tutien_character_lore', JSON.stringify(characters));
  }, [characters]);


  useEffect(() => {
    localStorage.setItem('tutien_ai_provider', aiProvider);
    localStorage.setItem('tutien_orimise_key', orimiseKey);
    localStorage.setItem('tutien_orimise_url', orimiseBaseUrl);
    localStorage.setItem('tutien_gemini_key', geminiKey);
    localStorage.setItem('tutien_ai_model', aiModel);
    localStorage.setItem('tutien_concurrency', concurrency);
    localStorage.setItem('tutien_custom_prompt', customPrompt);
  }, [aiProvider, orimiseKey, orimiseBaseUrl, geminiKey, aiModel, concurrency, customPrompt]);

  const handleClearScannedTerms = () => {
    setExtractedGlossaryTerms([]);
    localStorage.removeItem('tutien_extracted_glossary');
  };


  // 🧠 Auto-Glossary Extraction Handler
  const handleExtractGlossary = async (targetParam = null) => {
    const isOrimise = aiProvider === 'orimise';
    const activeKey = isOrimise ? orimiseKey : geminiKey;

    if (!activeKey) {
      alert(`Vui lòng nhập ${isOrimise ? 'Orimise' : 'Google Gemini'} API Key trong menu Cấu hình AI!`);
      setIsAISettingsOpen(true);
      return;
    }

    let targetSubs = [];
    if (Array.isArray(targetParam) && targetParam.length > 0) {
      if (typeof targetParam[0] === 'string') {
        // Array of file IDs
        const matchedFiles = files.filter(f => targetParam.includes(f.id));
        targetSubs = matchedFiles.flatMap(f => f.subtitles);
      } else {
        // Array of subtitle objects
        targetSubs = targetParam;
      }
    } else {
      const activeF = files.find(f => f.id === activeFileId);
      if (activeF && activeF.subtitles.length > 0) {
        targetSubs = activeF.subtitles;
      } else if (files.length > 0) {
        targetSubs = files.flatMap(f => f.subtitles);
      }
    }


    if (targetSubs.length === 0) {
      alert('Chưa có dữ liệu phụ đề để quét thuật ngữ. Vui lòng nạp file SRT trước!');
      return;
    }

    setIsExtractingGlossary(true);
    setBatchProgressText(`🧠 Đang quét thuật ngữ, tên nhân vật, môn phái mới bằng AI ${aiModel}...`);

    try {
      const terms = await extractNewGlossaryTermsWithAI({
        subtitles: targetSubs,
        existingGlossary: glossary,
        aiProvider,
        apiKey: activeKey,
        baseUrl: orimiseBaseUrl,
        model: aiModel
      });

      setExtractedGlossaryTerms(terms);
      setIsGlossaryModalOpen(true);
      setBatchProgressText('');
    } catch (err) {
      alert(`Lỗi khi quét thuật ngữ: ${err.message}`);
      setBatchProgressText('');
    } finally {
      setIsExtractingGlossary(false);
    }
  };


  const handleAddTermsToGlossary = (newTerms) => {
    if (!newTerms || newTerms.length === 0) return;
    setGlossary(prev => [...newTerms, ...prev]);
  };



  // Native File System Access API: Pick SRT files with persistent fileHandle & De-duplication
  const handleOpenFilesNative = async () => {
    if (!window.showOpenFilePicker) {
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
      const existingNameSet = new Set(files.map(f => f.name.toLowerCase().trim()));
      let duplicateCount = 0;
      let subGocCount = 0;

      for (let i = 0; i < fileHandles.length; i++) {
        const handle = fileHandles[i];
        if (!handle.name.toLowerCase().endsWith('.srt')) continue;

        if (isSubGocFile(handle.name)) {
          subGocCount++;
          continue;
        }

        const normName = handle.name.toLowerCase().trim();
        if (existingNameSet.has(normName)) {
          duplicateCount++;
          continue;
        }
        existingNameSet.add(normName);

        const file = await handle.getFile();
        const text = await file.text();
        const parsed = parseSRT(text);
        if (parsed.length > 0) {
          newFileObjs.push({
            id: `file_fs_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            fileHandle: handle,
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
        const msg = `✅ Đã nạp ${newFileObjs.length} file SRT mới!` +
          (duplicateCount > 0 ? ` (Bỏ qua ${duplicateCount} file trùng)` : '') +
          (subGocCount > 0 ? ` (Đã lọc bỏ ${subGocCount} file SubGoc)` : '');
        setBatchProgressText(msg);
        setTimeout(() => setBatchProgressText(''), 4000);
      } else if (subGocCount > 0 || duplicateCount > 0) {
        alert(`Đã lọc: ${duplicateCount > 0 ? `${duplicateCount} file trùng lặp, ` : ''}${subGocCount > 0 ? `${subGocCount} file SubGoc đã được bỏ qua.` : ''}`);
      }
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Native File Picker Error:', err);
      }
      return false;
    }
  };

  // Native Directory Access API: Pick FOLDER with automatic .SRT filtering, SubGoc exclusion & De-duplication
  const handleOpenFolderNative = async () => {
    if (!window.showDirectoryPicker) {
      return false;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setBatchProgressText(`Đang quét đệ quy, lọc file .SRT và loại bỏ file 'SubGoc' từ thư mục "${dirHandle.name}"...`);

      const scannedFileObjs = [];
      const existingNameSet = new Set(files.map(f => f.name.toLowerCase().trim()));
      let duplicateCount = 0;
      let nonSrtCount = 0;
      let subGocCount = 0;

      async function scanDir(directoryHandle, pathPrefix = '') {
        for await (const entry of directoryHandle.values()) {
          const currentPath = pathPrefix ? `${pathPrefix} / ${entry.name}` : entry.name;

          if (entry.kind === 'file') {
            if (entry.name.toLowerCase().endsWith('.srt')) {
              // Exclude raw SubGoc files directly
              if (isSubGocFile(entry.name) || isSubGocFile(currentPath)) {
                subGocCount++;
                continue;
              }

              const normPath = currentPath.toLowerCase().trim();
              if (existingNameSet.has(normPath)) {
                duplicateCount++;
                continue;
              }
              existingNameSet.add(normPath);

              const file = await entry.getFile();
              const text = await file.text();
              const parsed = parseSRT(text);
              if (parsed.length > 0) {
                scannedFileObjs.push({
                  id: `file_dir_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  name: currentPath,
                  fileHandle: entry,
                  subtitles: parsed.map(s => ({ ...s, previousText: s.originalText }))
                });
              }
            } else {
              nonSrtCount++;
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
        const msg = `✅ Đã lọc và nạp ${scannedFileObjs.length} file .SRT mới từ thư mục "${dirHandle.name}"!` +
          (subGocCount > 0 ? ` (Đã tự động loại bỏ ${subGocCount} file 'SubGoc')` : '') +
          (duplicateCount > 0 ? ` (Bỏ qua ${duplicateCount} file trùng)` : '') +
          (nonSrtCount > 0 ? ` [Lọc bỏ ${nonSrtCount} file khác]` : '');
        setBatchProgressText(msg);
        setTimeout(() => setBatchProgressText(''), 4500);
      } else if (subGocCount > 0 || duplicateCount > 0) {
        alert(`Đã hoàn tất quét: ${subGocCount > 0 ? `Đã tự động loại bỏ ${subGocCount} file 'SubGoc'. ` : ''}${duplicateCount > 0 ? `${duplicateCount} file SRT đã tồn tại trước đó.` : ''}`);
        setBatchProgressText('');
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

  // Handle uploading multiple SRT files with De-duplication & SubGoc Exclusion
  const handleAddFiles = (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const existingNameSet = new Set(files.map(f => f.name.toLowerCase().trim()));
    let duplicateCount = 0;
    let subGocCount = 0;
    let validCount = 0;

    uploadedFiles.forEach((file, idx) => {
      // Check if it's a zip file
      if (file.name.toLowerCase().endsWith('.zip')) {
        handleAddZip(file);
        return;
      }

      if (!file.name.toLowerCase().endsWith('.srt')) return;

      if (isSubGocFile(file.name) || isSubGocFile(file.webkitRelativePath)) {
        subGocCount++;
        return;
      }

      const displayName = getSmartFileName(file);
      const normName = displayName.toLowerCase().trim();

      if (existingNameSet.has(normName)) {
        duplicateCount++;
        return;
      }
      existingNameSet.add(normName);
      validCount++;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsed = parseSRT(text);
        if (parsed.length > 0) {
          const fileObj = {
            id: `file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            name: displayName,
            subtitles: parsed.map(s => ({
              ...s,
              previousText: s.originalText
            }))
          };

          setFiles(prev => {
            if (prev.some(f => f.name.toLowerCase().trim() === normName)) {
              return prev;
            }
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

    if (subGocCount > 0 || duplicateCount > 0) {
      setTimeout(() => {
        setBatchProgressText(
          `⚡ Đã tự động lọc: ${subGocCount > 0 ? `Bỏ qua ${subGocCount} file 'SubGoc'. ` : ''}${duplicateCount > 0 ? `Bỏ qua ${duplicateCount} file trùng lặp.` : ''}`
        );
        setTimeout(() => setBatchProgressText(''), 4000);
      }, 500);
    }
  };

  // Handle Folder Upload (Recursive webkitdirectory selection)
  const handleAddFolder = (folderFiles) => {
    if (!folderFiles || folderFiles.length === 0) return;
    const srtFiles = folderFiles.filter(f =>
      f.name.toLowerCase().endsWith('.srt') &&
      !isSubGocFile(f.name) &&
      !isSubGocFile(f.webkitRelativePath)
    );

    if (srtFiles.length === 0) {
      alert(`Đã lọc thư mục: Không tìm thấy file .srt hợp lệ (đã lọc bỏ file không phải .srt và file SubGoc).`);
      return;
    }

    handleAddFiles(srtFiles);
  };

  // Handle Drag & Drop items (supports dropped folders with subdirectories & de-duplication)
  const handleDropDataTransfer = async (dataTransfer) => {
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      try {
        const scannedSrtFiles = await getFilesFromDataTransfer(dataTransfer.items);
        if (scannedSrtFiles.length > 0) {
          const existingNameSet = new Set(files.map(f => f.name.toLowerCase().trim()));
          let duplicateCount = 0;
          let subGocCount = 0;

          scannedSrtFiles.forEach(({ file, fullPath }, idx) => {
            if (isSubGocFile(fullPath) || isSubGocFile(file.name)) {
              subGocCount++;
              return;
            }

            const parts = fullPath.split('/');
            const fileName = parts.pop();
            const parentFolder = parts.length > 0 ? parts[parts.length - 1] : '';
            const displayName = parentFolder ? `${parentFolder} / ${fileName}` : fileName;
            const normName = displayName.toLowerCase().trim();

            if (existingNameSet.has(normName)) {
              duplicateCount++;
              return;
            }
            existingNameSet.add(normName);

            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target.result;
              const parsed = parseSRT(text);
              if (parsed.length > 0) {
                const fileObj = {
                  id: `file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                  name: displayName,
                  subtitles: parsed.map(s => ({ ...s, previousText: s.originalText }))
                };

                setFiles(prev => {
                  if (prev.some(f => f.name.toLowerCase().trim() === normName)) {
                    return prev;
                  }
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

          if (subGocCount > 0 || duplicateCount > 0) {
            setTimeout(() => {
              setBatchProgressText(`⚡ Đã tự động lọc: ${subGocCount > 0 ? `Bỏ qua ${subGocCount} file 'SubGoc'. ` : ''}${duplicateCount > 0 ? `Bỏ qua ${duplicateCount} file trùng lặp.` : ''}`);
              setTimeout(() => setBatchProgressText(''), 4000);
            }, 500);
          }
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


  // Handle ZIP file upload with de-duplication
  const handleAddZip = async (zipFile) => {
    if (!zipFile) return;
    setBatchProgressText(`Đang giải nén và lọc file .SRT từ "${zipFile.name}"...`);

    try {
      const extractedSrtItems = await processZipFile(zipFile);
      if (extractedSrtItems.length === 0) {
        alert('Không tìm thấy file .srt nào trong file ZIP.');
        setBatchProgressText('');
        return;
      }

      const existingNameSet = new Set(files.map(f => f.name.toLowerCase().trim()));
      const newFileObjs = [];
      let duplicateCount = 0;

      extractedSrtItems.forEach((item, idx) => {
        const normName = item.name.toLowerCase().trim();
        if (existingNameSet.has(normName)) {
          duplicateCount++;
          return;
        }
        existingNameSet.add(normName);

        newFileObjs.push({
          id: `file_zip_${Date.now()}_${idx}`,
          name: item.name,
          subtitles: item.parsed.map(s => ({ ...s, previousText: s.originalText }))
        });
      });

      if (newFileObjs.length > 0) {
        setFiles(prev => {
          const updated = [...prev, ...newFileObjs];
          if (!activeFileId || prev.length === 0) {
            setActiveFileId(newFileObjs[0].id);
          }
          return updated;
        });

        const msg = `✅ Đã giải nén và nạp ${newFileObjs.length} file SRT mới từ file ZIP!` +
          (duplicateCount > 0 ? ` (Bỏ qua ${duplicateCount} file đã có sẵn)` : '');
        setBatchProgressText(msg);
        setTimeout(() => setBatchProgressText(''), 4000);
      } else if (duplicateCount > 0) {
        alert(`Tất cả ${duplicateCount} file .srt trong file ZIP đều ĐÃ TỒN TẠI trong danh sách rồi, không thêm trùng lặp!`);
        setBatchProgressText('');
      }
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

  // Batch AI Translate Files in the series (supports selective file IDs or all)
  const handleBatchTranslateAI = async (targetFileIds = null) => {
    if (files.length === 0) return;
    const isOrimise = aiProvider === 'orimise';
    const activeKey = isOrimise ? orimiseKey : geminiKey;

    if (!activeKey) {
      alert(`Vui lòng nhập ${isOrimise ? 'Orimise' : 'Google Gemini'} API Key trong menu Cấu Hình AI!`);
      setIsAISettingsOpen(true);
      return;
    }

    const filesToProcess = targetFileIds && targetFileIds.length > 0
      ? files.filter(f => targetFileIds.includes(f.id))
      : files;

    if (filesToProcess.length === 0) return;

    setIsBatchProcessing(true);

    try {
      const updatedFiles = [...files];

      for (let fIdx = 0; fIdx < filesToProcess.length; fIdx++) {
        const fileObj = filesToProcess[fIdx];
        const totalLines = fileObj.subtitles.length;
        setBatchProgressText(`⚡ [File ${fIdx + 1}/${filesToProcess.length}] Đang khởi chạy ${concurrency} luồng Turbo: "${fileObj.name}" (${totalLines} dòng)...`);

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
              `⚡ [File ${fIdx + 1}/${filesToProcess.length}] Turbo ${concurrency} Luồng: "${fileObj.name}" — Xong ${doneChunks}/${totalChunks} khối (${Math.round((doneChunks / totalChunks) * 100)}%)`
            );
          }
        });

        // Apply translated map to file in main list
        const targetIndex = updatedFiles.findIndex(f => f.id === fileObj.id);
        if (targetIndex !== -1) {
          updatedFiles[targetIndex] = {
            ...updatedFiles[targetIndex],
            subtitles: updatedFiles[targetIndex].subtitles.map(sub => {
              if (resultMap.has(sub.index)) {
                return {
                  ...sub,
                  previousText: sub.translatedText,
                  translatedText: resultMap.get(sub.index),
                  status: 'translated'
                };
              }
              return sub;
            })
          };
          setFiles([...updatedFiles]);
        }
      }

      setBatchProgressText(`🎉 ĐÃ DỊCH HOÀN TẤT SIÊU TỐC ${filesToProcess.length} FILE SRT!`);
      setTimeout(() => setBatchProgressText(''), 4000);
    } catch (err) {
      alert(`Lỗi khi dịch hàng loạt: ${err.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Apply Glossary across all or selected files
  const handleBatchApplyGlossary = (targetFileIds = null) => {
    if (files.length === 0) return;
    const activeRules = PRONOUN_PRESETS.find(p => p.id === activePresetId)?.rules || [];
    const targetSet = targetFileIds && targetFileIds.length > 0 ? new Set(targetFileIds) : null;

    const updatedFiles = files.map(fileObj => {
      if (targetSet && !targetSet.has(fileObj.id)) return fileObj;
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
    const affectedCount = targetSet ? targetSet.size : files.length;
    alert(`Đã áp dụng Từ Điển Tu Tiên cho ${affectedCount} file SRT!`);
  };

  // Batch Apply Pronouns across all or selected files
  const handleBatchApplyPronouns = (targetFileIds = null) => {
    if (files.length === 0) return;
    const preset = PRONOUN_PRESETS.find(p => p.id === activePresetId) || PRONOUN_PRESETS[0];
    const targetSet = targetFileIds && targetFileIds.length > 0 ? new Set(targetFileIds) : null;

    const updatedFiles = files.map(fileObj => {
      if (targetSet && !targetSet.has(fileObj.id)) return fileObj;
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
    const affectedCount = targetSet ? targetSet.size : files.length;
    alert(`Đã áp dụng quy tắc xưng hô "${preset.name}" cho ${affectedCount} file SRT!`);
  };

  // Export files as a single ZIP archive (supports selective file IDs or all)
  const handleExportZip = async (targetFileIds = null) => {
    const filesToExport = targetFileIds && targetFileIds.length > 0
      ? files.filter(f => targetFileIds.includes(f.id))
      : files;

    if (filesToExport.length === 0) return;

    const zip = new JSZip();

    filesToExport.forEach(fileObj => {
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
    a.download = `bo_phim_srt_${filesToExport.length}tap_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Update file object with fileHandle once chosen
  const handleSetFileHandle = (fileId, fileHandle) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, fileHandle } : f));
  };

  // Batch Save Files Directly back to Disk (supports selective file IDs or all)
  const handleBatchSaveDirectAll = async (targetFileIds = null) => {
    const filesToSave = targetFileIds && targetFileIds.length > 0
      ? files.filter(f => targetFileIds.includes(f.id))
      : files;

    if (filesToSave.length === 0) return;

    let savedCount = 0;
    for (let fileObj of filesToSave) {
      const srtContent = generateSRT(fileObj.subtitles, true);

      if (fileObj.fileHandle && fileObj.fileHandle.createWritable) {
        try {
          if (fileObj.fileHandle.queryPermission) {
            const hasPerm = (await fileObj.fileHandle.queryPermission({ mode: 'readwrite' })) === 'granted' ||
                            (fileObj.fileHandle.requestPermission && (await fileObj.fileHandle.requestPermission({ mode: 'readwrite' })) === 'granted');
            if (!hasPerm) continue;
          }
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
      alert(`✅ ĐÃ LƯU TRỰC TIẾP THÀNH CÔNG HÀNG LOẠT ${savedCount} / ${filesToSave.length} FILE SRT VỀ ĐÚNG ĐƯỜNG DẪN GỐC TRÊN Ổ ĐĨA MÁY TÍNH!`);
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
        isBatchProcessing={isBatchProcessing}
        isLoreScanning={isLoreScanning}
      />

      <main className="main-content">
        {/* TAB 1: SUBTITLE EDITOR & PROJECT MANAGER */}
        <div className="tab-pane-container" style={{ display: activeTab === 'editor' ? 'block' : 'none' }}>
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
            onExtractGlossary={() => handleExtractGlossary()}
            isExtractingGlossary={isExtractingGlossary}
            extractedGlossaryTerms={extractedGlossaryTerms}
            onOpenScannedGlossary={() => setIsGlossaryModalOpen(true)}
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
            onExtractGlossary={() => handleExtractGlossary(activeFile?.subtitles)}
            isExtractingGlossary={isExtractingGlossary}
            extractedGlossaryTerms={extractedGlossaryTerms}
            onOpenScannedGlossary={() => setIsGlossaryModalOpen(true)}
          />
        </div>

        {/* TAB 2: GLOSSARY MANAGER */}
        <div className="tab-pane-container" style={{ display: activeTab === 'glossary' ? 'block' : 'none' }}>
          <GlossaryManager
            glossary={glossary}
            setGlossary={setGlossary}
            onExtractGlossary={() => handleExtractGlossary()}
            isExtractingGlossary={isExtractingGlossary}
            extractedGlossaryTerms={extractedGlossaryTerms}
            onOpenScannedGlossary={() => setIsGlossaryModalOpen(true)}
          />
        </div>

        {/* TAB 3: PRONOUN PRESETS */}
        <div className="tab-pane-container" style={{ display: activeTab === 'pronoun' ? 'block' : 'none' }}>
          <PronounPresetSelector
            activePresetId={activePresetId}
            setActivePresetId={setActivePresetId}
            onApplyPresetToSubtitles={(preset) => {
              setActivePresetId(preset.id);
              handleBatchApplyPronouns();
            }}
          />
        </div>

        {/* TAB 4: YOUTUBER STUDIO */}
        <div className="tab-pane-container" style={{ display: activeTab === 'youtuber' ? 'block' : 'none' }}>
          <YoutuberStudio
            files={files}
            activeFile={activeFile}
            aiProvider={aiProvider}
            orimiseKey={orimiseKey}
            orimiseBaseUrl={orimiseBaseUrl}
            geminiKey={geminiKey}
            aiModel={aiModel}
          />
        </div>

        {/* TAB 5: CHARACTER LORE & INTRO TAG STUDIO */}
        <div className="tab-pane-container" style={{ display: activeTab === 'lore' ? 'block' : 'none' }}>
          <CharacterLoreStudio
            files={files}
            aiProvider={aiProvider}
            orimiseKey={orimiseKey}
            orimiseBaseUrl={orimiseBaseUrl}
            geminiKey={geminiKey}
            aiModel={aiModel}
            characters={characters}
            setCharacters={setCharacters}
            onScanningStateChange={setIsLoreScanning}
          />
        </div>
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

      {/* 🧠 Auto-Glossary Modal (Feature 1) */}
      <AutoGlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
        extractedTerms={extractedGlossaryTerms}
        existingGlossary={glossary}
        onAddTermsToGlossary={handleAddTermsToGlossary}
        onClearScannedTerms={handleClearScannedTerms}
        onTriggerExtractGlossary={() => handleExtractGlossary()}
        isExtractingGlossary={isExtractingGlossary}
      />



      <footer className="app-footer">
        <p>Tu Tiên SRT Subtitle Pro &bull; Quản Lý & Dịch Hàng Loạt Bộ Phim SRT &bull; Orimise API ({aiModel})</p>
      </footer>
    </div>
  );
}

