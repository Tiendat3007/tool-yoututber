import { parseSRT, generateSRT } from './srtParser';

// Default Character Lore System Prompt for Xianxia/Anime
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
      return characters.map((char, idx) => ({
        id: `char_${Date.now()}_${idx}`,
        name: char.name || 'Nhân vật ẩn danh',
        originalName: char.originalName || '',
        role: char.role || 'Chưa rõ',
        sect: char.sect || 'Vô Môn Phái',
        realm: char.realm || 'Phàm nhân',
        firstFileId: char.firstFileId || (files[0] ? files[0].id : ''),
        firstFileName: char.firstFileName || (files[0] ? files[0].name : ''),
        firstLineIndex: char.firstLineIndex || 1,
        firstTimestamp: char.firstTimestamp || '00:01:00,000',
        firstEndTimestamp: char.firstEndTimestamp || '00:01:05,000',
        quote: char.quote || '',
        introTag: char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`,
        personality: char.personality || '',
        enabled: true
      }));
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

// Generate Separate SRT file for Character Intro Tags
export function generateCharacterIntroSRT(characters, files, isFullMovie = false, fileDurations = {}, gapSeconds = 0) {
  const activeChars = characters.filter(c => c.enabled !== false);
  if (activeChars.length === 0) return '';

  let srtLines = [];
  let counter = 1;

  if (!isFullMovie) {
    // Generate per file (Local Episode Timestamps)
    activeChars.forEach(char => {
      const startTime = char.firstTimestamp || '00:00:05,000';
      const endTime = char.firstEndTimestamp || msToSrtTime(srtTimeToMs(startTime) + 5000); // 5s duration
      const text = char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`;

      srtLines.push(`${counter++}\n${startTime} --> ${endTime}\n${text}\n`);
    });
  } else {
    // Generate for Full Stitched Long Movie (Exact MP4 Video Timeline)
    let cumulativeOffsetMs = 0;
    const fileOffsets = {};

    files.forEach(file => {
      fileOffsets[file.id] = cumulativeOffsetMs;
      // Get exact duration from MP4 video file, user input, or last sub endTime
      let durationMs = 0;
      if (fileDurations[file.id]) {
        durationMs = fileDurations[file.id] * 1000;
      } else if (file.subtitles.length > 0) {
        const lastSub = file.subtitles[file.subtitles.length - 1];
        durationMs = srtTimeToMs(lastSub.endTime);
      }
      cumulativeOffsetMs += durationMs + (gapSeconds * 1000);
    });

    activeChars.forEach(char => {
      const fileOffset = fileOffsets[char.firstFileId] || 0;
      const charLocalStartMs = srtTimeToMs(char.firstTimestamp);
      const fullMovieStartMs = fileOffset + charLocalStartMs;
      const fullMovieEndMs = fullMovieStartMs + 5000; // 5s display duration

      const startTime = msToSrtTime(fullMovieStartMs);
      const endTime = msToSrtTime(fullMovieEndMs);
      const text = char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`;

      srtLines.push(`${counter++}\n${startTime} --> ${endTime}\n${text}\n`);
    });
  }

  return srtLines.join('\n');
}

// Generate Beautiful Advanced ASS Subtitle file (Top-Center Glowing Yellow Ancient Calligraphy Style for CapCut/Premiere)
export function generateCharacterIntroASS(characters, files, isFullMovie = false, fileDurations = {}, gapSeconds = 0) {
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

  let dialogueLines = [];

  if (!isFullMovie) {
    activeChars.forEach(char => {
      const startMs = srtTimeToMs(char.firstTimestamp);
      const endMs = srtTimeToMs(char.firstEndTimestamp) || (startMs + 5000);
      const tagText = char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`;

      dialogueLines.push(`Dialogue: 0,${toAssTime(startMs)},${toAssTime(endMs)},CharacterIntro,,0,0,0,,{\\fad(300,300)\\b1\\c&H00F2FE&\\3c&H000000&}${tagText}`);
    });
  } else {
    let cumulativeOffsetMs = 0;
    const fileOffsets = {};

    files.forEach(file => {
      fileOffsets[file.id] = cumulativeOffsetMs;
      let durationMs = 0;
      if (fileDurations[file.id]) {
        durationMs = fileDurations[file.id] * 1000;
      } else if (file.subtitles.length > 0) {
        const lastSub = file.subtitles[file.subtitles.length - 1];
        durationMs = srtTimeToMs(lastSub.endTime);
      }
      cumulativeOffsetMs += durationMs + (gapSeconds * 1000);
    });

    activeChars.forEach(char => {
      const fileOffset = fileOffsets[char.firstFileId] || 0;
      const startMs = fileOffset + srtTimeToMs(char.firstTimestamp);
      const endMs = startMs + 5000;
      const tagText = char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} | ${char.sect} | ${char.realm} 】`;

      dialogueLines.push(`Dialogue: 0,${toAssTime(startMs)},${toAssTime(endMs)},CharacterIntro,,0,0,0,,{\\fad(300,300)\\b1\\c&H00F2FE&\\3c&H000000&}${tagText}`);
    });
  }

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
