import { parseSRT, generateSRT } from './srtParser';

// Vision Character & Weapon/Lore Detection Prompt for Chinese 3D Donghua / Xianxia Videos
export const VISION_CHARACTER_PROMPT = `
Bạn là Chuyên gia Thị giác AI & OCR Phim Hoạt Hình 3D Trung Quốc / Tu Tiên / Kiếm Hiệp (Tencent, Bilibili, Youku, iQiyi).
Nhiệm vụ của bạn là soi kỹ các khung hình video (đã được lật thuận chiều xuôi chuẩn) để tìm và đọc TẤT CẢ CÁC BẢNG TÊN / THẺ CHÚ THÍCH ĐỒ HỌA xuất hiện trên màn hình.

CÁC LOẠI THẺ ĐỒ HỌA TRÊN PHIM HOẠT HÌNH 3D TRUNG QUỐC:
1. 👤 BẢNG TÊN NHÂN VẬT (Character Card):
   - Chữ Hán thư pháp tên nhân vật (VD: 欧阳青 [Âu Dương Thanh], 赵昀 [Triệu Quân], 萧炎 [Tiêu Viêm], 陆阳 [Lục Dương], 慕容复...).
   - Nhãn đỏ / Khung đỏ chứa thân phận: 主角 (Chủ Giác = Nhân vật chính), 反派 (Phản Diện), 宗主 (Tông Chủ), 大师兄 (Đại Sư Huynh), 圣女 (Thánh Nữ), 长老 (Trưởng Lão), 门主 (Môn Chủ)...
   - Tông môn / Cảnh giới (VD: 玄天宗, 青云门, 洞虚境, 七境, 金丹, 斗王...).
   - Tag mẫu: 【 NHÂN VẬT: ÂU DƯƠNG THANH | HUYỀN THIÊN TÔNG | ĐẠI SƯ HUYNH 】

2. ⚔️ THẦN BINH / BẢO VẬT / VŨ KHÍ (Weapon / Artifact):
   - Chữ thư pháp lớn giới thiệu kiếm, bảo kiếm, thần binh, pháp bảo (VD: 镇宅神剑 [Trấn Trạch Thần Kiếm], 八荒剑阁 [Bát Hoang Kiếm Các], 诛仙剑 [Tru Tiên Kiếm], 焚寂剑...).
   - Tag mẫu: 【 THẦN BINH: TRẤN TRẠCH THẦN KIẾM | BÁT HOANG KIẾM CÁC 】

3. 🏛️ ĐỊA DANH / TÔNG MÔN / CHIÊU THỨC (Location / Martial Art):
   - Tên môn phái, thắng cảnh, tuyệt kỹ, trận pháp.
   - Tag mẫu: 【 ĐỊA DANH: BÁT HOANG KIẾM CÁC 】 hoặc 【 TUYỆT KỸ: BÁT HOANG KIẾM QUYẾT 】

YÊU CẦU ĐẦU RA JSON ARRAY CHÍNH XÁC (Dịch sang âm Hán-Việt chuẩn xác, KHÔNG thêm markdown ngoài JSON):
[
  {
    "hasTag": true,
    "type": "character",
    "frameIndex": 1,
    "timestamp": "00:00:18,200",
    "name": "Tên Hán-Việt chuẩn xác (VD: Âu Dương Thanh, Trấn Trạch Thần Kiếm, Triệu Quân)",
    "originalName": "Chữ Hán gốc trên màn hình (VD: 欧阳青, 镇宅神剑, 赵昀)",
    "role": "Thân phận / Loại thẻ (VD: Nhân vật chính / 主角, Đại sư huynh, Thần binh bảo kiếm, Tông chủ)",
    "sect": "Tông môn / Nơi xuất xứ nếu có (VD: Huyền Thiên Tông, Bát Hoang Kiếm Các)",
    "realm": "Cảnh giới / Cấp bậc nếu có (VD: Thất Cảnh, Động Hư Cảnh, Cực phẩm Linh bảo)",
    "introTag": "【 NHÂN VẬT: ÂU DƯƠNG THANH | HUYỀN THIÊN TÔNG | ĐẠI SƯ HUYNH 】",
    "description": "Mô tả ngắn hình ảnh xuất hiện trên video"
  }
]
Nếu trong các khung hình không có thẻ đồ họa nào, trả về [].
`;

// Extract video frames in browser memory via HTML5 Canvas with Flip Horizontal Mirror Support
export async function extractFramesFromVideo(videoFile, {
  intervalSec = 3,
  flipHorizontal = false,
  onProgress = () => {},
  videoDuration = 0
}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    const canvas = document.createElement('canvas');
    // Resolution for optimal vision token usage and high OCR accuracy (640x360)
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = async () => {
      const duration = videoDuration || video.duration;
      const timestamps = [];
      for (let t = 2; t < duration; t += intervalSec) {
        timestamps.push(Math.round(t * 10) / 10);
      }

      const frames = [];


      for (let i = 0; i < timestamps.length; i++) {
        const time = timestamps[i];
        if (onProgress) {
          onProgress({
            phase: 'extracting',
            current: i + 1,
            total: timestamps.length,
            time,
            timeFormatted: msToSrtTime(time * 1000),
            percent: Math.round(((i + 1) / timestamps.length) * 100)
          });
        }

        await new Promise((res) => {
          let timeoutTimer;
          const onSeeked = () => {
            clearTimeout(timeoutTimer);
            video.removeEventListener('seeked', onSeeked);

            // Handle Horizontal Flip (Mirror correction for re-up videos)
            ctx.save();
            if (flipHorizontal) {
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            const base64Full = canvas.toDataURL('image/jpeg', 0.70);
            const base64Data = base64Full.split(',')[1];
            frames.push({
              frameIndex: i + 1,
              timestampSec: time,
              timestampFormatted: msToSrtTime(time * 1000),
              base64Data,
              base64Full
            });
            res();
          };
          timeoutTimer = setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            res();
          }, 3500);
          video.addEventListener('seeked', onSeeked);
          video.currentTime = time;
        });
      }

      URL.revokeObjectURL(url);
      video.src = '';
      resolve(frames);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể tải video để trích xuất khung hình.'));
    };
  });
}


// Scan video frames using Gemini Vision or Orimise Vision with Multi-threaded Concurrency
export async function scanVideoFramesWithVisionAI({
  frames = [],
  videoFileName = 'video.mp4',
  apiKey,
  aiProvider = 'orimise',
  baseUrl = 'https://api.orimise.com/v1',
  model = 'gemini-2.5-flash',
  batchSize = 4,
  concurrency = 5,
  onProgress = () => {}
}) {
  if (!frames || frames.length === 0) return [];
  if (!apiKey) {
    throw new Error(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
  }

  // Split frames into batches of 4
  const batches = [];
  for (let i = 0; i < frames.length; i += batchSize) {
    batches.push({
      index: batches.length + 1,
      frames: frames.slice(i, i + batchSize)
    });
  }

  const allDetectedCharacters = [];
  const seenNames = new Set();
  let completedBatches = 0;

  // Worker task to process 1 batch
  const processBatch = async (batchItem) => {
    const batch = batchItem.frames;
    const batchInfo = batch.map((f, idx) => `[Ảnh ${idx + 1} lúc ${f.timestampFormatted}]`).join(', ');
    const userPromptText = `${VISION_CHARACTER_PROMPT}\n\nDưới đây là ${batch.length} khung hình chụp từ video: ${batchInfo}. Hãy kiểm tra xem có bảng tên nhân vật nào xuất hiện không!`;

    let rawResult = '';

    try {
      if (aiProvider === 'orimise') {
        const content = [
          { type: 'text', text: userPromptText }
        ];
        batch.forEach((f) => {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${f.base64Data}`
            }
          });
        });

        const endpoint = baseUrl.endsWith('/chat/completions')
          ? baseUrl
          : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'gemini-2.5-flash',
            messages: [{ role: 'user', content }],
            temperature: 0.2
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawResult = data.choices?.[0]?.message?.content || '';
        }
      } else {
        // Google Gemini Vision API
        const parts = [{ text: userPromptText }];
        batch.forEach((f) => {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: f.base64Data
            }
          });
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }

      if (rawResult) {
        let jsonStr = rawResult.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const detectedList = JSON.parse(jsonStr);
        if (Array.isArray(detectedList)) {
          detectedList.forEach((char) => {
            const cleanName = (char.name || '').trim().toLowerCase();
            if (cleanName && !seenNames.has(cleanName)) {
              seenNames.add(cleanName);

              // Find closest frame to attach thumbnail
              const matchedFrame = (char.frameIndex && batch[char.frameIndex - 1]) ? batch[char.frameIndex - 1] : batch[0];
              const actualTimestamp = char.timestamp || matchedFrame.timestampFormatted;

              allDetectedCharacters.push({
                id: `char_vision_${Date.now()}_${allDetectedCharacters.length}_${Math.random().toString(36).substring(2, 6)}`,
                name: char.name || 'Nhân vật',
                originalName: char.originalName || '',
                type: char.type || 'character',
                role: char.role || 'Chưa rõ',
                sect: char.sect || 'Vô Môn Phái',
                realm: char.realm || 'Chưa rõ',
                firstFileName: videoFileName,
                firstTimestamp: actualTimestamp,
                firstEndTimestamp: msToSrtTime(srtTimeToMs(actualTimestamp) + 5000),
                thumbnail: matchedFrame.base64Full,
                introTag: char.introTag || `【 ${char.type === 'weapon' ? 'THẦN BINH' : 'NHÂN VẬT'}: ${char.name.toUpperCase()} | ${char.sect || 'VÔ MÔN PHÁI'} | ${char.role || ''} 】`,
                source: 'vision_ocr',
                enabled: true
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn(`Lỗi khi phân tích batch ${batchItem.index}:`, err);
    } finally {
      completedBatches++;
      if (onProgress) {
        const processedFrames = Math.min(completedBatches * batchSize, frames.length);
        const percent = Math.round((completedBatches / batches.length) * 100);
        onProgress({
          phase: 'ai_scanning',
          current: processedFrames,
          total: frames.length,
          completedBatches,
          totalBatches: batches.length,
          percent,
          currentFrame: batch[0]?.base64Full,
          message: `⚡ Đang chạy song song ${concurrency} luồng AI Vision: Đã xong ${completedBatches}/${batches.length} nhóm (${processedFrames}/${frames.length} frames)...`
        });
      }
    }
  };

  // Multi-threaded worker pool execution
  const effectiveConcurrency = Math.min(concurrency || 5, batches.length);
  const queue = [...batches];
  const workers = Array.from({ length: effectiveConcurrency }, async () => {
    while (queue.length > 0) {
      const nextBatch = queue.shift();
      if (nextBatch) {
        await processBatch(nextBatch);
      }
    }
  });

  await Promise.all(workers);

  // Sort characters chronologically by timestamp
  allDetectedCharacters.sort((a, b) => srtTimeToMs(a.firstTimestamp) - srtTimeToMs(b.firstTimestamp));

  return allDetectedCharacters;
}


// Default Character Lore System Prompt for Xianxia/Anime (SRT Text Fallback)
export const CHARACTER_EXTRACTION_PROMPT = `
Bạn là Chuyên gia Phân Tích Nhân Vật & Cốt Truyện Phim Hoạt Hình 3D Trung Quốc / Tu Tiên / Kiếm Hiệp.
Nhiệm vụ của bạn là đọc toàn bộ danh sách phụ đề của các tập phim dưới đây và trích xuất DANH SÁCH TẤT CẢ NHÂN VẬT XUẤT HIỆN LẦN ĐẦU (First Appearance).

YÊU CẦU ĐẦU RA JSON CHÍNH XÁC (KHÔNG thêm markdown hay văn bản ngoài JSON):
[
  {
    "name": "Tên nhân vật tiếng Việt Hán-Việt (VD: Tiêu Viêm, Lý Mộ Uyển, Diệp Thần)",
    "originalName": "Tên gốc chữ Hán nếu có (VD: 萧炎, 李慕婉)",
    "role": "Thân phận / Vai trò (VD: Nhân vật chính, Nữ chính, Đại sư huynh, Trưởng lão, Phản diện)",
    "sect": "Tông môn / Gia tộc / Thế lực (VD: Bách Hoa Cốc, Tiêu Gia, Vân Lam Tông, Ma Giáo)",
    "realm": "Cảnh giới tu luyện lúc mới xuất hiện (VD: Đấu Chi Khí Tam Đoạn, Luyện Khí tầng 9, Trúc Cơ sơ kỳ, Đấu Vương)",
    "firstFileId": "ID file tập phim xuất hiện lần đầu (VD: file_0)",
    "firstFileName": "Tên file tập phim (VD: d1_01.srt)",
    "firstLineIndex": 12,
    "firstTimestamp": "00:03:15,200",
    "firstEndTimestamp": "00:03:20,200",
    "quote": "Câu thoại đầu tiên mà nhân vật này nói hoặc được người khác xưng tên",
    "introTag": "【 NHÂN VẬT: TIÊU VIÊM | TIÊU GIA | ĐẤU CHI KHÍ TAM ĐOẠN 】",
    "personality": "Tính cách ngắn gọn (VD: Kiên cường, trọng tình nghĩa, cơ trí)"
  }
]
`;


// Extract characters with AI (supports both Orimise and Gemini APIs)
export async function extractCharactersWithAI({
  files = [],
  apiKey,
  aiProvider = 'orimise',
  baseUrl = 'https://api.orimise.com/v1',
  model = 'gemini-2.5-flash',
  customPrompt = ''
}) {
  if (!files || files.length === 0) return [];
  if (!apiKey) {
    throw new Error(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
  }

  // Build condensed context of all files with line indices and timestamps
  let subtitleContext = '';
  files.forEach((file) => {
    subtitleContext += `\n\n=== TẬP PHIM [ID: ${file.id}] [TÊN: ${file.name}] ===\n`;
    file.subtitles.forEach((sub, lineIdx) => {
      const text = sub.translatedText || sub.originalText || '';
      if (text.trim()) {
        subtitleContext += `[Dòng ${lineIdx + 1} | ${sub.startTime} --> ${sub.endTime}] ${text}\n`;
      }
    });
  });

  const prompt = `${CHARACTER_EXTRACTION_PROMPT}

${customPrompt ? `YÊU CẦU BỔ SUNG TỪ NGƯỜI DÙNG: ${customPrompt}\n` : ''}

DƯỚI ĐÂY LÀ TOÀN BỘ PHỤ ĐỀ CÁC TẬP PHIM CẦN PHÂN TÍCH:
${subtitleContext.substring(0, 150000)}

HÃY TRẢ VỀ DUY NHẤT 1 MẢNG JSON CÁC NHÂN VẬT THEO ĐÚNG CẤU TRÚC ĐÃ HƯỚNG DẪN.`;

  let rawResult = '';

  try {
    if (aiProvider === 'orimise') {
      const endpoint = baseUrl.endsWith('/chat/completions')
        ? baseUrl
        : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a professional Chinese Anime / Xianxia Lore Master. Output only JSON array.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Lỗi Orimise API HTTP ${response.status}`);
      }

      const data = await response.json();
      rawResult = data.choices?.[0]?.message?.content || '';
    } else {
      // Google Gemini API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Lỗi Gemini API HTTP ${response.status}`);
      }

      const data = await response.json();
      rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    
    // Parse JSON
    let jsonStr = rawResult.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const characters = JSON.parse(jsonStr);
    if (Array.isArray(characters)) {
      return characters.map((char, idx) => {
        // Match character to real file in files array
        let matchedFile = files[0] || null;
        if (char.firstFileId) {
          const directMatch = files.find(f => f.id === char.firstFileId);
          if (directMatch) matchedFile = directMatch;
        }
        if (!matchedFile && char.firstFileName) {
          const cleanTarget = char.firstFileName.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '').trim().toLowerCase();
          matchedFile = files.find(f => {
            const cleanF = f.name.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '').trim().toLowerCase();
            return cleanF === cleanTarget || cleanF.includes(cleanTarget) || cleanTarget.includes(cleanF);
          });
        }
        if (!matchedFile && files.length > 0) {
          matchedFile = files[0];
        }

        return {
          id: `char_${Date.now()}_${idx}`,
          name: char.name || 'Nhân vật ẩn danh',
          originalName: char.originalName || '',
          role: char.role || 'Chưa rõ',
          sect: char.sect || 'Vô Môn Phái',
          realm: char.realm || 'Phàm nhân',
          firstFileId: matchedFile ? matchedFile.id : (char.firstFileId || ''),
          firstFileName: matchedFile ? matchedFile.name : (char.firstFileName || ''),
          firstLineIndex: char.firstLineIndex || 1,
          firstTimestamp: char.firstTimestamp || '00:01:00,000',
          firstEndTimestamp: char.firstEndTimestamp || '00:01:05,000',
          quote: char.quote || '',
          introTag: char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`,
          personality: char.personality || '',
          enabled: true
        };
      });
    }
    return [];
  } catch (err) {
    console.error("Lỗi khi trích xuất nhân vật:", err);
    throw new Error(`Không thể phân tích nhân vật bằng AI: ${err.message}`);
  }
}


// Convert Milliseconds to SRT Timestamp format (00:00:00,000)
export function msToSrtTime(ms) {
  if (isNaN(ms) || ms < 0) ms = 0;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

// Convert SRT Timestamp (00:00:00,000) to Milliseconds
export function srtTimeToMs(srtTime) {
  if (!srtTime) return 0;
  const clean = srtTime.trim().replace('.', ',');
  const parts = clean.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const secParts = parts[2].split(',');
  const seconds = parseInt(secParts[0], 10) || 0;
  const milliseconds = parseInt(secParts[1], 10) || 0;

  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

// Find accurate cumulative offset for a character across episodes
export function findFileOffset(char, files = [], fileOffsets = {}) {
  // 1. Direct File ID match
  if (char.firstFileId && fileOffsets[char.firstFileId] !== undefined) {
    return fileOffsets[char.firstFileId];
  }

  // 2. By File Name match
  if (char.firstFileName) {
    const cleanCharFile = char.firstFileName.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '').trim().toLowerCase();
    for (const file of files) {
      const cleanFile = file.name.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '').trim().toLowerCase();
      if (cleanFile === cleanCharFile || cleanFile.includes(cleanCharFile) || cleanCharFile.includes(cleanFile)) {
        return fileOffsets[file.id] || 0;
      }
    }

    // 3. Numeric Episode matching (e.g., 'd7_02' or '02' or 'ep02')
    const charNums = cleanCharFile.match(/\d+/g);
    if (charNums && charNums.length > 0) {
      const charKey = charNums.join('_');
      for (const file of files) {
        const cleanFile = file.name.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '').trim().toLowerCase();
        const fileNums = cleanFile.match(/\d+/g);
        if (fileNums && fileNums.join('_') === charKey) {
          return fileOffsets[file.id] || 0;
        }
      }
    }
  }

  return 0;
}

// Compute File Offsets Map and Total Movie Duration
export function computeFileOffsets(files = [], fileDurations = {}, gapSeconds = 0) {
  let cumulativeOffsetMs = 0;
  const fileOffsets = {};

  files.forEach(file => {
    fileOffsets[file.id] = cumulativeOffsetMs;
    let durationMs = 0;
    if (fileDurations[file.id]) {
      durationMs = fileDurations[file.id] * 1000;
    } else if (file.subtitles && file.subtitles.length > 0) {
      const lastSub = file.subtitles[file.subtitles.length - 1];
      durationMs = srtTimeToMs(lastSub.endTime);
    }
    cumulativeOffsetMs += durationMs + (gapSeconds * 1000);
  });

  return { fileOffsets, totalMovieDurationMs: cumulativeOffsetMs };
}

// Generate Separate SRT file for Character Intro Tags (Strictly Sorted Chronologically, 2s Display Duration)
export function generateCharacterIntroSRT(characters, files, isFullMovie = false, fileDurations = {}, gapSeconds = 0, displayDurationSec = 2) {
  const activeChars = characters.filter(c => c.enabled !== false);
  if (activeChars.length === 0) return '';

  const { fileOffsets, totalMovieDurationMs } = isFullMovie 
    ? computeFileOffsets(files, fileDurations, gapSeconds) 
    : { fileOffsets: {}, totalMovieDurationMs: 0 };

  const durationMs = (Number(displayDurationSec) || 2) * 1000;

  // Build tag items with exact start and end millisecond timestamps
  const tagItems = activeChars.map(char => {
    const fileOffset = isFullMovie ? findFileOffset(char, files, fileOffsets) : 0;
    const charLocalStartMs = srtTimeToMs(char.firstTimestamp);
    let startMs = fileOffset + charLocalStartMs;

    // Bounds checking
    if (totalMovieDurationMs > 0 && startMs > totalMovieDurationMs) {
      if (charLocalStartMs < totalMovieDurationMs) {
        startMs = charLocalStartMs;
      } else {
        startMs = Math.max(0, totalMovieDurationMs - 10000);
      }
    }

    const endMs = startMs + durationMs; // 2s display duration
    const text = char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`;

    return {
      char,
      startMs,
      endMs,
      text
    };
  });

  // ⚡ CRITICAL: SORT STRICTLY CHRONOLOGICALLY BY START TIME (FROM BEGINNING TO END)
  tagItems.sort((a, b) => a.startMs - b.startMs);

  let srtLines = [];
  tagItems.forEach((item, index) => {
    const startTime = msToSrtTime(item.startMs);
    const endTime = msToSrtTime(item.endMs);
    srtLines.push(`${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n`);
  });

  return srtLines.join('\n');
}

// Generate Beautiful Advanced ASS Subtitle file (Top-Center Glowing Yellow Ancient Calligraphy Style, Strictly Sorted, 2s Duration)
export function generateCharacterIntroASS(characters, files, isFullMovie = false, fileDurations = {}, gapSeconds = 0, displayDurationSec = 2) {
  const activeChars = characters.filter(c => c.enabled !== false);
  if (activeChars.length === 0) return '';

  const assHeader = `[Script Info]
Title: Character Intro Tags
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CharacterIntro,Arial,48,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,3,2,8,20,20,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Convert SRT time (00:00:00,000) to ASS time (0:00:00.00)
  const toAssTime = (ms) => {
    const srt = msToSrtTime(ms);
    const parts = srt.split(',');
    const main = parts[0];
    const centis = Math.floor(parseInt(parts[1], 10) / 10).toString().padStart(2, '0');
    return `${main}.${centis}`;
  };

  const { fileOffsets, totalMovieDurationMs } = isFullMovie 
    ? computeFileOffsets(files, fileDurations, gapSeconds) 
    : { fileOffsets: {}, totalMovieDurationMs: 0 };

  const durationMs = (Number(displayDurationSec) || 2) * 1000;

  // Build tag items with exact start and end millisecond timestamps
  const tagItems = activeChars.map(char => {
    const fileOffset = isFullMovie ? findFileOffset(char, files, fileOffsets) : 0;
    const charLocalStartMs = srtTimeToMs(char.firstTimestamp);
    let startMs = fileOffset + charLocalStartMs;

    if (totalMovieDurationMs > 0 && startMs > totalMovieDurationMs) {
      if (charLocalStartMs < totalMovieDurationMs) {
        startMs = charLocalStartMs;
      } else {
        startMs = Math.max(0, totalMovieDurationMs - 10000);
      }
    }

    const endMs = startMs + durationMs;
    const text = char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`;

    return {
      char,
      startMs,
      endMs,
      text
    };
  });

  // ⚡ CRITICAL: SORT STRICTLY CHRONOLOGICALLY
  tagItems.sort((a, b) => a.startMs - b.startMs);

  let dialogueLines = [];
  tagItems.forEach(item => {
    dialogueLines.push(`Dialogue: 0,${toAssTime(item.startMs)},${toAssTime(item.endMs)},CharacterIntro,,0,0,0,,{\\fad(300,300)\\b1\\c&H00F2FE&\\3c&H000000&}${item.text}`);
  });

  return assHeader + dialogueLines.join('\n');
}





// Stitch All File SRTs into 1 Seamless Full Movie SRT with Continuous Timeline
export function stitchAllFilesToFullMovieSRT(files, fileDurations = {}, gapSeconds = 0) {
  if (!files || files.length === 0) return '';

  let allMergedSubtitles = [];
  let cumulativeOffsetMs = 0;
  let lineCounter = 1;

  files.forEach((file, fileIdx) => {
    const fileSubs = file.subtitles || [];
    
    fileSubs.forEach(sub => {
      const subStartMs = srtTimeToMs(sub.startTime);
      const subEndMs = srtTimeToMs(sub.endTime);

      const stitchedStartMs = cumulativeOffsetMs + subStartMs;
      const stitchedEndMs = cumulativeOffsetMs + subEndMs;

      allMergedSubtitles.push({
        id: lineCounter++,
        startTime: msToSrtTime(stitchedStartMs),
        endTime: msToSrtTime(stitchedEndMs),
        originalText: sub.originalText,
        translatedText: sub.translatedText || sub.originalText
      });
    });

    // Compute duration for next file offset
    let fileDurationMs = 0;
    if (fileDurations[file.id]) {
      fileDurationMs = fileDurations[file.id] * 1000;
    } else if (fileSubs.length > 0) {
      const lastSub = fileSubs[fileSubs.length - 1];
      fileDurationMs = srtTimeToMs(lastSub.endTime);
    }

    cumulativeOffsetMs += fileDurationMs + (gapSeconds * 1000);
  });

  return generateSRT(allMergedSubtitles);
}

// Fast MP4 Box Parser to extract duration from 'mvhd' atom without decoding
export async function extractMp4DurationFromBuffer(file) {
  try {
    const slice = file.slice(0, Math.min(file.size, 1024 * 1024 * 10)); // first 10MB
    const buffer = await slice.arrayBuffer();
    const dataView = new DataView(buffer);

    let offset = 0;
    while (offset < buffer.byteLength - 8) {
      const size = dataView.getUint32(offset);
      const type = String.fromCharCode(
        dataView.getUint8(offset + 4),
        dataView.getUint8(offset + 5),
        dataView.getUint8(offset + 6),
        dataView.getUint8(offset + 7)
      );

      if (size < 8) break;

      if (type === 'moov') {
        let moovOffset = offset + 8;
        const moovEnd = Math.min(offset + size, buffer.byteLength);
        while (moovOffset < moovEnd - 8) {
          const subSize = dataView.getUint32(moovOffset);
          const subType = String.fromCharCode(
            dataView.getUint8(moovOffset + 4),
            dataView.getUint8(moovOffset + 5),
            dataView.getUint8(moovOffset + 6),
            dataView.getUint8(moovOffset + 7)
          );
          if (subType === 'mvhd') {
            const version = dataView.getUint8(moovOffset + 8);
            let timescale = 0;
            let duration = 0;
            if (version === 1) {
              timescale = dataView.getUint32(moovOffset + 28);
              const durHigh = dataView.getUint32(moovOffset + 32);
              const durLow = dataView.getUint32(moovOffset + 36);
              duration = durHigh * 4294967296 + durLow;
            } else {
              timescale = dataView.getUint32(moovOffset + 20);
              duration = dataView.getUint32(moovOffset + 24);
            }
            if (timescale > 0 && duration > 0) {
              return Math.round((duration / timescale) * 100) / 100;
            }
          }
          if (subSize < 8) break;
          moovOffset += subSize;
        }
      }

      offset += size;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Universal Media Duration Reader (Binary MP4 parser + HTML5 Video element fallback)
export async function readMediaDuration(file) {
  // 1. Try fast binary header parse first (0.005s)
  const binaryDur = await extractMp4DurationFromBuffer(file);
  if (binaryDur !== null && binaryDur > 0) {
    return binaryDur;
  }

  // 2. Try HTML5 Video element
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      let resolved = false;
      const done = (dur) => {
        if (!resolved) {
          resolved = true;
          try {
            URL.revokeObjectURL(url);
            video.src = '';
          } catch {}
          resolve(dur);
        }
      };

      const timer = setTimeout(() => done(null), 6000);

      video.onloadedmetadata = () => {
        clearTimeout(timer);
        const dur = video.duration;
        if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
          done(Math.round(dur * 100) / 100);
        } else {
          done(null);
        }
      };

      video.onerror = () => {
        clearTimeout(timer);
        done(null);
      };

      video.src = url;
    } catch (err) {
      resolve(null);
    }
  });
}

