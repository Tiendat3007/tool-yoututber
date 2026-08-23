// Vision Character & Location Lore Detection Prompt for Chinese 3D Donghua / Xianxia Videos
export const VISION_CHARACTER_PROMPT = `
Bạn là Chuyên gia Thị giác AI & OCR Phim Hoạt Hình 3D Trung Quốc / Tu Tiên / Huyền Huyễn (Tencent, Bilibili, Youku, iQiyi).
Nhiệm vụ của bạn là soi kỹ các khung hình video (đã được lật thuận chiều xuôi chuẩn) để tìm và đọc DUY NHẤT 2 LOẠI BẢNG TÊN / THẺ ĐỒ HỌA:

1. 👤 BẢNG TÊN NHÂN VẬT ("type": "character"):
   - Chữ Hán thư pháp tên nhân vật (VD: 欧阳青 [Âu Dương Thanh], 顾辰 [Cố Thần], 萧炎 [Tiêu Viêm], 陆阳 [Lục Dương], 慕容复...).
   - Nhãn đỏ / Khung đỏ chứa thân phận: 主角 (Chủ Giác = Nhân vật chính), 反派 (Phản Diện), 宗主 (Tông Chủ), 大师兄 (Đại Sư Huynh), 圣女 (Thánh Nữ), 长老 (Trưởng Lão), 门主 (Môn Chủ)...
   - Tông môn / Xuất xứ (VD: 玄天宗, 青云门...).

2. 🏛️ ĐỊA DANH / TÔNG MÔN / SƠN MẠCH / THÀNH TRÌ ("type": "location"):
   - Tên môn phái, thánh địa, cấm địa, thành trì, sơn mạch (VD: 八荒剑阁 [Bát Hoang Kiếm Các], 玄天宗 [Huyền Thiên Tông], Ma Thú Sơn Mạch, Vạn Kiếm Trũng...).

YÊU CẦU ĐẦU RA JSON ARRAY CHÍNH XÁC (Dịch sang âm Hán-Việt chuẩn xác, KHÔNG thêm markdown ngoài JSON):
[
  {
    "hasTag": true,
    "type": "character", // 'character' | 'location'
    "frameIndex": 1,
    "timestamp": "00:00:18,200",
    "name": "Tên Hán-Việt chuẩn xác (VD: Cố Thần, Âu Dương Thanh, Bát Hoang Kiếm Các, Huyền Thiên Tông)",
    "originalName": "Chữ Hán gốc trên màn hình (VD: 顾辰, 欧阳青, 八荒剑阁, 玄天宗)",
    "role": "Thân phận nếu có (VD: Nhân vật chính, Tông chủ, Trưởng lão, nếu không có để \"\")",
    "sect": "Tông môn / Xuất xứ nếu có (VD: Bát Hoang Kiếm Các, nếu không có để \"\")",
    "realm": "",
    "introTag": "【 CỐ THẦN | BÁT HOANG KIẾM CÁC 】",
    "description": "Mô tả ngắn hình ảnh xuất hiện trên video"
  }
]

LƯU Ý ĐẶC BIỆT QUAN TRỌNG VỀ RÀNG BUỘC (CHỈ LẤY GIỚI THIỆU QUAN TRỌNG, BỎ 100% TEXT RÁC):
1. ĐỌC MỐC THỜI GIAN CHÍNH XÁC: Ở góc trên bên trái của MỖI khung hình đều có nhãn vàng nổi bật ghi rõ số thứ tự và mốc thời gian dạng [#1] 00:00:15,000. Khi phát hiện thẻ ở ảnh nào, HÃY ĐIỀN ĐÚNG "frameIndex" VÀ "timestamp" IN TRÊN ẢNH ĐÓ!
2. CHỈ LẤY DUY NHẤT CÁC BẢNG GIỚI THIỆU ĐỒ HỌA CHÍNH THỨC (QUAN TRỌNG):
   - 👤 Bảng Tên Nhân Vật: Bảng đồ họa 2D/3D chuyên biệt do studio hoạt hình bung ra giữa màn hình hoặc cạnh nhân vật (kèm thân phận: Chủ Giác, Phản Diện, Tông Chủ, Sư Huynh, Thánh Nữ, Trưởng Lão, Môn Chủ... VD: Cố Thần, Tiêu Viêm, Lục Dương, Âu Dương Thanh).
   - 🏛️ Bảng Đại Địa Danh / Tông Môn Lớn: Bảng giới thiệu môn phái, thánh địa, cấm địa lớn khi chuyển phân cảnh (VD: Huyền Thiên Tông, Bát Hoang Kiếm Các, Thanh Vân Môn, Ma Thú Sơn Mạch).

3. TUYỆT ĐỐI BỎ QUA VÀ LOẠI BỎ 100% CÁC TEXT RÁC:
   - ❌ BIỂN HIỆU QUÁN XÁ / PHỐ XÁ HẬU CẢNH: Biển hiệu quán ăn, tửu lâu, trà quán, quán trọ, tiệm thuốc, cửa hiệu ven đường, chữ trên đèn lồng phố xá (VD: 玉玉楼 [Ngọc Ngọc Lâu], 酒楼 [Tửu Lâu], 客栈 [Khách Sạn], 药铺 [Dược Phường], 茶馆 [Trà Quán], 正正...). Đây chỉ là vật thể trang trí bối cảnh phố phường, TUYỆT ĐỐI KHÔNG LẤY!
   - ❌ PHỤ ĐỀ HỘI THOẠI & LỜI THOẠI Ở ĐÁY MÀN HÌNH (VD: "Hãy nhớ kỹ cái tên này", "Ngươi muốn làm gì", "Chúng ta đi thôi", "Không thể nào", "Đứng lại cho ta").
   - ❌ LOGO WATERMARK KÊNH / NHÀ ĐÀI (VD: Tiểu Hổ, Bilibili, Tencent, Youku, iQiyi, Tập sau, Đón xem).
   - ❌ THÔNG BÁO HỆ THỐNG / NHIỆM VỤ / THUỘC TÍNH.
   - ❌ VŨ KHÍ, CÔNG PHÁP, CẢNH GIỚI TU VI.

4. Tên ("name") BẮT BUỘC NGẮN GỌN (từ 2 đến 4 từ, độ dài < 22 ký tự, TUYỆT ĐỐI KHÔNG chứa dấu câu . , ! ? : ;).
5. Nếu trên khung hình không ghi Môn Phái, hãy để chuỗi rỗng "" (tuyệt đối KHÔNG ghi "N/A", "Unknown", "Chưa rõ" hay "Không").
Nếu trong các khung hình không có thẻ giới thiệu nhân vật hay tông môn chính thức nào, trả về [].
`;

// Helper: Summarize SRT Subtitles context to inject into Vision AI

export function buildSRTContextSummary(subtitles = [], glossary = [], maxLines = 150) {
  if (!Array.isArray(subtitles) || subtitles.length === 0) return '';

  // Extract non-empty text lines (sample evenly across the episode/movie)
  const step = Math.max(1, Math.floor(subtitles.length / maxLines));
  const sampled = [];
  for (let i = 0; i < subtitles.length; i += step) {
    const sub = subtitles[i];
    const text = (sub.translatedText || sub.text || '').replace(/\r?\n/g, ' ').trim();
    if (text && text.length > 2) {
      sampled.push(`[${sub.startTime}] ${text}`);
    }
    if (sampled.length >= maxLines) break;
  }

  // Extract glossary terms summary if available
  let glossarySummary = '';
  if (Array.isArray(glossary) && glossary.length > 0) {
    const topTerms = glossary.slice(0, 50).map(g => `${g.zh} -> ${g.vi}`).join('; ');
    glossarySummary = `\n- TỪ ĐIỂN THUẬT NGỮ BẮT BUỘC: ${topTerms}`;
  }

  return `\n=== 🧠 NGỮ CẢNH PHỤ ĐỀ SRT CỦA PHIM (ĐỐI CHIẾU VỚI KHUNG HÌNH ĐỂ DỊCH CHUẨN XÁC) ===${glossarySummary}\n- MỘT SỐ HỘI THOẠI & THUẬT NGỮ TRONG PHỤ ĐỀ:\n${sampled.join('\n')}\n=== HẾT NGỮ CẢNH SRT ===\n`;
}

// Fast pixel difference metric (0.0 to 1.0) to filter out redundant static dialogue frames
function computeFrameDifference(data1, data2) {
  if (!data1 || !data2 || data1.length !== data2.length) return 1.0;
  let diffSum = 0;
  const step = 4 * 8; // Sample every 8th pixel for ultra-fast calculation
  let samples = 0;
  for (let i = 0; i < data1.length; i += step) {
    const rDiff = Math.abs(data1[i] - data2[i]);
    const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
    const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
    diffSum += (rDiff + gDiff + bDiff) / 3;
    samples++;
  }
  return samples > 0 ? diffSum / (samples * 255) : 1.0;
}

// 🎯 ĐỀ XUẤT 2: Detect if a frame contains potential high-contrast graphic badges / calligraphy text overlay with normalized edge density
export function computeGraphicBadgeScore(imageData, width, height, customROI = null) {
  if (!imageData || !imageData.data || width <= 0 || height <= 0) return 0;
  const data = imageData.data;

  const checkZone = (startXRatio, endXRatio, startYRatio, endYRatio) => {
    const startX = Math.floor(width * Math.max(0, startXRatio));
    const endX = Math.floor(width * Math.min(1, endXRatio));
    const startY = Math.floor(height * Math.max(0, startYRatio));
    const endY = Math.floor(height * Math.min(1, endYRatio));

    let edgeCount = 0;
    let highContrastEdges = 0;
    let textStrokeCrossings = 0;
    let colorBadgeTones = 0;
    let samples = 0;
    const step = 2; // Step 2 for high accuracy

    for (let y = startY + 2; y < endY - 2; y += step) {
      let lineTransitions = 0;
      let prevLum = null;

      for (let x = startX + 2; x < endX - 2; x += step) {
        samples++;
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Horizontal gradient
        const idxR = (y * width + (x + 1)) * 4;
        const lumR = 0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
        const gradX = Math.abs(lumR - lum);

        // Vertical gradient
        const idxB = ((y + 1) * width + x) * 4;
        const lumB = 0.299 * data[idxB] + 0.587 * data[idxB + 1] + 0.114 * data[idxB + 2];
        const gradY = Math.abs(lumB - lum);

        const gradTotal = gradX + gradY;
        if (gradTotal > 45) {
          edgeCount++;
          if (gradTotal > 95) {
            highContrastEdges++;
          }
        }

        // Check for rapid typography stroke oscillations (Chinese calligraphy characters)
        if (prevLum !== null && Math.abs(lum - prevLum) > 65) {
          lineTransitions++;
        }
        prevLum = lum;

        // Check for vivid badge colors (red seal box 【主角】/【宗主】 or glowing gold border)
        if ((r > 145 && g < 75 && b < 75) || (r > 170 && g > 135 && b < 70)) {
          colorBadgeTones++;
        }
      }

      if (lineTransitions >= 2) {
        textStrokeCrossings += lineTransitions;
      }
    }

    if (samples === 0) return 0;

    // Normalized density score (0 to 100)
    const rawScore = (highContrastEdges * 3.5 + edgeCount * 1.0 + textStrokeCrossings * 2.2 + colorBadgeTones * 4.5);
    const density = (rawScore / samples) * 100;

    return Math.round(density * 10) / 10;
  };

  // If user provided a custom ROI box { x, y, w, h } in percentages (0 to 100)
  if (customROI && typeof customROI === 'object' && customROI.w > 0 && customROI.h > 0) {
    const startX = customROI.x / 100;
    const endX = (customROI.x + customROI.w) / 100;
    const startY = customROI.y / 100;
    const endY = (customROI.y + customROI.h) / 100;
    return checkZone(startX, endX, startY, endY);
  }

  const leftZoneScore = checkZone(0.02, 0.42, 0.12, 0.88);
  const centerZoneScore = checkZone(0.20, 0.80, 0.40, 0.88);
  const rightZoneScore = checkZone(0.58, 0.98, 0.12, 0.88);

  return Math.max(leftZoneScore, centerZoneScore, rightZoneScore);
}

// 🎯 ĐỀ XUẤT 3: Composite multiple video frames into 1 single high-definition Grid Contact Sheet
export async function createGridContactSheet(frames = []) {
  if (!frames || frames.length === 0) return { gridBase64: '', frameMap: {} };
  if (frames.length === 1) {
    return {
      gridBase64: frames[0].base64Data,
      gridDataUrl: frames[0].base64Full,
      frameMap: { 1: frames[0] }
    };
  }

  const count = frames.length;
  let cols = 2;
  let rows = 2;
  if (count === 2) { cols = 2; rows = 1; }
  else if (count <= 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 3; rows = 2; }
  else { cols = 4; rows = 2; }

  const cellWidth = 640;
  const cellHeight = 360;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellWidth;
  canvas.height = rows * cellHeight;
  const ctx = canvas.getContext('2d');

  // Fill dark background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const frameMap = {};

  for (let i = 0; i < count; i++) {
    const f = frames[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellWidth;
    const y = row * cellHeight;

    frameMap[i + 1] = f;

    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      img.src = f.base64Full || `data:image/jpeg;base64,${f.base64Data}`;
    });

    // Draw frame into cell
    ctx.drawImage(img, x, y, cellWidth, cellHeight);

    // Draw grid border line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellWidth, cellHeight);

    // 🎯 Burn in bold high-contrast timestamp label on top-left of each cell
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
    ctx.fillRect(x + 8, y + 8, 235, 32);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, 235, 32);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`[#${i + 1}] ${f.timestampFormatted}`, x + 16, y + 30);
    ctx.restore();
  }

  const gridDataUrl = canvas.toDataURL('image/jpeg', 0.72);
  const gridBase64 = gridDataUrl.split(',')[1];

  return {
    gridBase64,
    gridDataUrl,
    frameMap
  };
}

// Extract video frames in browser memory via HTML5 Canvas with Flip Horizontal Mirror, Static Differencing & Graphic Badge Filter
export async function extractFramesFromVideo(videoFile, {
  intervalSec = 4,
  flipHorizontal = false,
  filterStaticFrames = true, // Smart filter to discard redundant static dialogue shots
  filterNonBadgeFrames = true, // 🎯 ĐỀ XUẤT 2: Smart filter to discard frames without graphic badge candidates (saves ~70-85% requests)
  customROI = null, // { x, y, w, h } in percent (0 to 100)
  filterSensitivity = 'balanced', // 'safe' (threshold 6) | 'balanced' (threshold 10) | 'aggressive' (threshold 14)
  minDiffRatio = 0.04, // 4% difference threshold
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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Determine normalized score threshold based on user sensitivity
    const badgeThreshold = filterSensitivity === 'aggressive' ? 13.0 : (filterSensitivity === 'safe' ? 6.0 : 9.5);

    video.onloadedmetadata = async () => {
      const duration = videoDuration || video.duration;
      const timestamps = [];
      for (let t = 2; t < duration; t += intervalSec) {
        timestamps.push(Math.round(t * 10) / 10);
      }

      const frames = [];
      let prevSavedImageData = null;
      let skippedCount = 0;

      for (let i = 0; i < timestamps.length; i++) {
        const time = timestamps[i];
        if (onProgress) {
          onProgress({
            phase: 'extracting',
            current: i + 1,
            total: timestamps.length,
            time,
            timeFormatted: msToSrtTime(time * 1000),
            percent: Math.round(((i + 1) / timestamps.length) * 100),
            filteredCount: skippedCount
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

            // Check Frame Differencing against previous SAVED frame
            const currentImageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const currentImageData = currentImageDataObj.data;
            const diff = prevSavedImageData ? computeFrameDifference(prevSavedImageData, currentImageData) : 1.0;

            // 🎯 ĐỀ XUẤT 2: Compute normalized graphic badge score in user selected ROI box
            const badgeScore = computeGraphicBadgeScore(currentImageDataObj, canvas.width, canvas.height, customROI);
            const hasBadgeCandidate = badgeScore >= badgeThreshold;

            let shouldSkip = false;

            // 1. If Non-Badge filter is ON: Frame has no badge candidate in ROI -> SKIP!
            if (filterNonBadgeFrames && !hasBadgeCandidate) {
              shouldSkip = true;
            } 
            // 2. If Static filter is ON: Frame is almost identical duplicate of previous saved frame -> SKIP!
            else if (filterStaticFrames && prevSavedImageData && diff < minDiffRatio) {
              shouldSkip = true;
            }

            if (shouldSkip) {
              skippedCount++;
            } else {
              prevSavedImageData = currentImageData;

              // Generate lightweight clean compact thumbnail for UI card display
              const thumbCanvas = document.createElement('canvas');
              thumbCanvas.width = 160;
              thumbCanvas.height = 90;
              const thumbCtx = thumbCanvas.getContext('2d');
              thumbCtx.drawImage(canvas, 0, 0, 160, 90);
              const thumbnailCompact = thumbCanvas.toDataURL('image/jpeg', 0.5);

              // 🎯 Burn-in high contrast visual timestamp & index label so AI ALWAYS matches exact time even in large batches
              const frameIdx = frames.length + 1;
              const timeFormatted = msToSrtTime(time * 1000);

              ctx.save();
              ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
              ctx.fillRect(6, 6, 210, 26);
              ctx.strokeStyle = '#facc15';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(6, 6, 210, 26);
              ctx.fillStyle = '#facc15'; // Bright yellow high-contrast text
              ctx.font = 'bold 14px monospace';
              ctx.fillText(`[#${frameIdx}] ${timeFormatted}`, 12, 24);
              ctx.restore();

              const base64Full = canvas.toDataURL('image/jpeg', 0.65);
              const base64Data = base64Full.split(',')[1];

              frames.push({
                frameIndex: frameIdx,
                timestampSec: time,
                timestampFormatted: timeFormatted,
                base64Data,
                base64Full,
                thumbnailCompact,
                badgeScore,
                customROI
              });
            }
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

// Scan video frames using Gemini Vision or Orimise Vision with Multi-threaded Concurrency & SRT Context Fusion
export async function scanVideoFramesWithVisionAI({
  frames = [],
  videoFileName = 'video.mp4',
  apiKey,
  aiProvider = 'orimise',
  baseUrl = 'https://api.orimise.com/v1',
  model = 'gemini-2.5-flash-lite',
  batchSize = 12, // User selectable: 12, 15, 20, 30, 40, 50, 60
  concurrency = 5,
  customROI = null, // { x, y, w, h }
  srtSubtitles = [],
  glossary = [],
  onProgress = () => {}
}) {
  if (!frames || frames.length === 0) return [];
  if (!apiKey) {
    throw new Error(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong Cấu Hình AI!`);
  }

  let zoneNote = '🌟 LƯU Ý VÙNG QUÉT: Quét toàn bộ khung hình nhưng bỏ qua dải phụ đề thoại ở sát đáy.';
  if (customROI && customROI.w > 0 && customROI.h > 0) {
    zoneNote = `📍 TỌA ĐỘ VÙNG QUÉT ĐƯỢC CHỈ ĐỊNH: X từ ${customROI.x}% đến ${Math.round(customROI.x + customROI.w)}%, Y từ ${customROI.y}% đến ${Math.round(customROI.y + customROI.h)}%. Bảng tên nhân vật/thân phận nằm chính xác trong khung này, hãy soi kỹ vùng này và bỏ qua các chữ ở ngoài khung!`;
  }

  // 🧠 Build rich multimodal SRT subtitles context block
  const srtContextBlock = buildSRTContextSummary(srtSubtitles, glossary, 150);
  const basePrompt = `${VISION_CHARACTER_PROMPT}\n${zoneNote}${srtContextBlock}`;

  // Split frames into batches
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
    const batchInfo = batch.map((f, idx) => `[Ô #${idx + 1} lúc ${f.timestampFormatted}]`).join(', ');
    
    // 🎯 ĐỀ XUẤT 3: Build Grid Contact Sheet (Single composite image for all frames in batch)
    const { gridBase64, frameMap } = await createGridContactSheet(batch);

    const userPromptText = `${basePrompt}\n\nDưới đây là BỨC ẢNH MA TRẬN GHÉP ${batch.length} KHUNG HÌNH (Grid Contact Sheet: ${batchInfo}).\nMỗi ô khung hình đều có nhãn vàng in mốc thời gian góc trên bên trái dạng [#1] 00:00:15,000.\n${zoneNote}\nHãy quan sát kỹ từng ô trong ma trận ảnh. Khi phát hiện bảng tên nhân vật hoặc tông môn xuất hiện ở ô nào, hãy đọc đúng số thứ tự "frameIndex" (1 đến ${batch.length}) và "timestamp" in trên ô đó!`;


    let rawResult = '';

    try {
      if (aiProvider === 'orimise') {
        const content = [
          { type: 'text', text: userPromptText },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${gridBase64}`,
              detail: 'high'
            }
          }
        ];

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
            model: model || 'claude-haiku-4-5-20251001',
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
        const parts = [
          { text: userPromptText },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: gridBase64
            }
          }
        ];

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
            // 🛡️ Strict filter: Only keep real character names, supreme artifacts (chí bảo), skills, sects
            if (!isValidLoreEntity(char)) return;

            const cleanName = (char.name || '').trim().toLowerCase();
            if (cleanName && !seenNames.has(cleanName)) {
              seenNames.add(cleanName);


              // 🎯 Smart & Accurate Frame Resolution: Match to exact video seek timestamp
              let matchedFrame = batch[0];
              if (typeof char.frameIndex === 'number' && !isNaN(char.frameIndex)) {
                const fIdx = Math.round(char.frameIndex);
                if (fIdx >= 1 && fIdx <= batch.length) {
                  matchedFrame = batch[fIdx - 1];
                } else {
                  const foundGlobal = batch.find(f => f.frameIndex === fIdx);
                  if (foundGlobal) matchedFrame = foundGlobal;
                }
              } else if (char.timestamp && typeof char.timestamp === 'string') {
                const targetMs = srtTimeToMs(char.timestamp);
                if (targetMs > 0) {
                  let closest = batch[0];
                  let minDiff = Infinity;
                  for (const f of batch) {
                    const diff = Math.abs(f.timestampSec * 1000 - targetMs);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closest = f;
                    }
                  }
                  matchedFrame = closest;
                }
              }

              // 🎯 ALWAYS use the verified video canvas seek timestamp from the video player!
              const actualTimestamp = matchedFrame.timestampFormatted;


              const formattedTag = cleanAndFormatIntroTag({
                name: char.name || 'Nhân vật',
                originalName: char.originalName || '',
                type: char.type || 'character',
                role: char.role || '',
                sect: char.sect || '',
                realm: char.realm || ''
              }, 'clean_compact');

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
                firstEndTimestamp: msToSrtTime(srtTimeToMs(actualTimestamp) + 2000),
                thumbnail: matchedFrame.thumbnailCompact || matchedFrame.base64Full,
                introTag: formattedTag,
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
      return characters
        .filter(c => isValidLoreEntity(c))
        .map((char, idx) => {
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

// Filter out dummy, placeholder, or missing values (N/A, Unknown, Chưa rõ, None, etc.)
export function isInvalidLoreValue(val) {
  if (!val || typeof val !== 'string') return true;
  const clean = val.trim().toLowerCase();
  return [
    'n/a', 'na', 'n\\a', 'n / a', 'n.a', 'none', 'null', 'unknown', 'undefined', 
    'chưa rõ', 'không rõ', 'không xác định', 'vô môn phái', 'vô', 
    'phàm nhân', '-', '--', '...', 'nhân vật', 'nhân vật phụ', 'ẩn danh', 'không'
  ].includes(clean);
}

// 🛡️ Strict Validator: Only keep genuine character names, supreme artifacts (chí bảo), skills, sects, realms
// Automatically rejects long meaningless text, system notifications, quest logs, dialogue lines, subtitles, and watermarks
export function isValidLoreEntity(char) {
  if (!char) return false;
  const name = (char.name || '').trim();
  if (!name) return false;

  // 1. Must not be a placeholder / invalid name
  if (isInvalidLoreValue(name)) return false;

  // 2. Length check: Genuine entity names are 2 to 26 characters (strict concise limit)
  if (name.length < 2 || name.length > 26) return false;

  // 3. Word count check: Real entity names never exceed 5 words (e.g. "Trấn Trạch Thần Kiếm" = 4 words)
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;

  // 4. Punctuation check: Real entity names do NOT contain sentence endings / dialogue punctuation
  if (/[.!?,;:，。！？…—~`"'“”‘’(){}[\]\\/]/.test(name)) return false;

  // 5. System notices, game status logs, quest notifications & dialogue filter
  const nameLower = name.toLowerCase();
  const rawRole = (char.role || '').toLowerCase();
  const rawType = (char.type || '').toLowerCase();

  // 🎯 STRICT CONSTRAINT: ONLY ALLOW CHARACTERS & LOCATIONS (Strictly exclude weapons, skills, realms, systems)
  if (['weapon', 'skill', 'realm', 'system', 'cong_phap', 'than_binh', 'canh_gioi', 'phap_bao'].includes(rawType)) {
    return false;
  }
  if (rawRole.includes('hệ thống') || rawRole.includes('thuộc tính') || rawRole.includes('nhiệm vụ') || rawRole.includes('công pháp') || rawRole.includes('thần binh') || rawRole.includes('cảnh giới')) {
    return false;
  }

  // Reject martial arts, weapons, realms keywords
  const excludedKeywords = [
    'kiếm quyết', 'công pháp', 'thần kiếm', 'đao pháp', 'quyền pháp', 'chưởng pháp',
    'thần thông', 'tuyệt kỹ', 'trận pháp', 'tâm pháp', 'bí kíp', 'hộ thể',
    'kim đan', 'nguyên anh', 'luyện khí', 'trúc cơ', 'hóa thần', 'động hư', 'đại thừa',
    'độ kiếp', 'đỉnh phong', 'đột phá', 'cảnh giới', 'hệ thống', 'bảng trạng thái'
  ];
  if (excludedKeywords.some(kw => nameLower.includes(kw))) {
    return false;
  }

  const systemAndGarbagePhrases = [
    // System notifications & game status
    'hệ thống', 'he thong', 'ký chủ', 'ky chu', 'túc chủ', 'tuc chu', 'nhắc nhở', 'nhac nho',
    'nhiệm vụ', 'nhiem vu', 'thuộc tính', 'thuoc tinh', 'trạng thái', 'trang thai',
    'kinh nghiệm', 'kinh nghiem', 'điểm thưởng', 'phần thưởng', 'phan thuong',
    'mở khóa', 'mo khoa', 'kích hoạt', 'kich hoat', 'chúc mừng', 'chuc mung',
    'cảnh báo', 'canh bao', 'thành công', 'thanh cong', 'thất bại', 'that bai',
    'thông báo', 'thong bao', 'đinh!', 'đinh', 'dinh!', 'level', 'hp:', 'mp:', 'exp:',

    // Dialogue & narrative pronouns
    'chúng ta', 'các ngươi', 'ngươi là', 'ta là', 'hắn là', 'nàng là', 'của ta', 'của ngươi',
    'tại sao', 'làm sao', 'thế nào', 'như thế nào', 'vì sao', 'ngươi dám', 'không thể nào',
    'hóa ra là', 'nói rằng', 'thế nhưng', 'rốt cuộc', 'chết tiệt', 'chạy mau', 'được rồi',
    'đi thôi', 'lên cho ta', 'giết hắn', 'đứng lại', 'ta không', 'ngươi không',

    // Watermarks, channel logos & media credits
    'bilibili', 'tencent', 'iqiyi', 'youku', 'tập sau', 'đón xem', 'phụ đề', 'vietsub',
    'thuyết minh', 'kính mời', 'chúc các bạn', 'like và subscribe', 'đăng ký kênh',
    'cảm ơn đã xem', 'hẹn gặp lại', 'video preview', 'trailer', 'quảng cáo', 'tiểu hồ', 'tieu ho',

    // Background street shop / tavern / inn props (scenery text rác)
    'ngọc ngọc lâu', 'ngoc ngoc lau', 'tửu lâu', 'tieu lau', 'trà quán', 'tra quan',
    'khách sạn', 'khach san', 'dược phường', 'quán xá', 'quán rượu', 'quán trọ',
    'biển hiệu', 'đèn lồng', 'hãy nhớ', 'cái tên'
  ];

  if (systemAndGarbagePhrases.some(phrase => nameLower.includes(phrase))) {
    return false;
  }


  // 6. Check if originalName (Chinese characters) contains system notices or sentence punctuation
  if (char.originalName && typeof char.originalName === 'string') {
    const rawZh = char.originalName.trim();
    if (rawZh.length > 8) return false; // Chinese entity names are usually 2-5 chars
    if (/[，。！？、…；：“”‘’]/u.test(rawZh)) return false;
    if (rawZh.includes('系统') || rawZh.includes('任务') || rawZh.includes('属性') || rawZh.includes('提示') || rawZh.includes('获得') || rawZh.includes('酒楼') || rawZh.includes('客栈') || rawZh.includes('药铺') || rawZh.includes('茶馆') || rawZh.includes('玉玉楼')) {
      return false;
    }
  }


  return true;
}



// Smart Clean & Format Character / Weapon / Realm / Skill Intro Tag (Deduplicates repetitive words and guarantees single-line display)
export function cleanAndFormatIntroTag(char, templateMode = 'clean_compact', customPattern = '') {
  if (!char) return '';
  let name = (char.name || '').trim();
  if (!name) return '';

  const rawType = (char.type || '').toLowerCase();
  let type = 'NHÂN VẬT';
  if (rawType === 'weapon' || name.toLowerCase().includes('kiếm') || name.toLowerCase().includes('bảo') || name.toLowerCase().includes('đao') || name.toLowerCase().includes('chuỳ') || name.toLowerCase().includes('tháp') || name.toLowerCase().includes('kính') || name.toLowerCase().includes('kích') || name.toLowerCase().includes('thương') || name.toLowerCase().includes('trượng') || name.toLowerCase().includes('phiên')) {
    type = 'CHÍ BẢO';
  } else if (rawType === 'skill' || rawType === 'cong_phap' || name.toLowerCase().includes('quyết') || name.toLowerCase().includes('công') || name.toLowerCase().includes('pháp') || name.toLowerCase().includes('quyền') || name.toLowerCase().includes('chưởng') || name.toLowerCase().includes('trận') || name.toLowerCase().includes('chỉ')) {
    type = 'CÔNG PHÁP';
  } else if (rawType === 'realm' || name.toLowerCase().includes('cảnh') || name.toLowerCase().includes('kỳ') || name.toLowerCase().includes('tầng') || name.toLowerCase().includes('đỉnh phong') || name.toLowerCase().includes('kim đan') || name.toLowerCase().includes('nguyên anh') || name.toLowerCase().includes('luyện khí') || name.toLowerCase().includes('trúc cơ') || name.toLowerCase().includes('hóa thần') || name.toLowerCase().includes('động hư') || name.toLowerCase().includes('đại thừa') || name.toLowerCase().includes('độ kiếp')) {
    type = 'CẢNH GIỚI';
  } else if (rawType === 'location' || name.toLowerCase().includes('tông') || name.toLowerCase().includes('môn') || name.toLowerCase().includes('phái') || name.toLowerCase().includes('sơn') || name.toLowerCase().includes('điện') || name.toLowerCase().includes('thành') || name.toLowerCase().includes('đảo')) {
    type = 'ĐỊA DANH';
  }

  // Clean Sect/Role/Realm: Automatically strip N/A, None, Unknown, Chưa rõ
  let sect = isInvalidLoreValue(char.sect) ? '' : char.sect.trim();
  let role = isInvalidLoreValue(char.role) ? '' : char.role.trim();
  let realm = isInvalidLoreValue(char.realm) ? '' : char.realm.trim();

  // Strip redundant leading type prefix words from name
  if (type === 'CẢNH GIỚI') {
    name = name.replace(/^cảnh\s*giới\s*[:\s]*/i, '').trim();
  } else if (type === 'CHÍ BẢO') {
    name = name.replace(/^(chí\s*bảo|thần\s*binh|pháp\s*bảo)\s*[:\s]*/i, '').trim();
  } else if (type === 'CÔNG PHÁP') {
    name = name.replace(/^(công\s*pháp|tuyệt\s*kỹ|thần\s*thông)\s*[:\s]*/i, '').trim();
  } else if (type === 'ĐỊA DANH') {
    name = name.replace(/^địa\s*danh\s*[:\s]*/i, '').trim();
  } else if (type === 'NHÂN VẬT') {
    name = name.replace(/^nhân\s*vật\s*[:\s]*/i, '').trim();
  }

  const nameLower = name.toLowerCase();

  // 🎯 STRICT DEDUPLICATION: If Realm / Sect / Role has overlapping words with Name, clear it!
  if (realm) {
    const realmLower = realm.toLowerCase();
    if (nameLower === realmLower || nameLower.includes(realmLower) || realmLower.includes(nameLower)) {
      realm = '';
    } else {
      // Check partial word overlap (e.g. "Kim Đan" in both "Kim Đan Tam Trọng Đỉnh Phong" and "Kim Đan Kỳ")
      const realmWords = realmLower.split(/\s+/).filter(w => w.length > 1);
      const matchedWords = realmWords.filter(w => nameLower.includes(w));
      if (matchedWords.length >= 2 || (realmWords.length <= 2 && matchedWords.length >= 1)) {
        realm = '';
      }
    }
  }

  if (sect) {
    const sectLower = sect.toLowerCase();
    if (nameLower === sectLower || nameLower.includes(sectLower) || sectLower.includes(nameLower)) {
      sect = '';
    }
  }

  if (role) {
    const roleLower = role.toLowerCase();
    if (nameLower === roleLower || nameLower.includes(roleLower) || roleLower.includes(nameLower)) {
      role = '';
    }
  }

  // 🎯 Clean single-part entities (No redundant tags!)
  if (type === 'CẢNH GIỚI') {
    return `【 CẢNH GIỚI: ${name.toUpperCase()} 】`;
  }
  if (type === 'ĐỊA DANH') {
    return `【 ${name.toUpperCase()} 】`;
  }


  // Prefix handling:
  // - NHÂN VẬT & ĐỊA DANH: NO prefix (User explicitly requested!)
  // - CHÍ BẢO / THẦN BINH: "CHÍ BẢO: "
  // - CÔNG PHÁP: "CÔNG PHÁP: "
  const prefix = type === 'NHÂN VẬT' ? '' : `${type}: `;

  if (templateMode === 'clean_compact') {
    const secondPart = sect || realm || role;
    if (secondPart && secondPart.toUpperCase() !== name.toUpperCase()) {
      return `【 ${prefix}${name.toUpperCase()} | ${secondPart.toUpperCase()} 】`;
    }
    return `【 ${prefix}${name.toUpperCase()} 】`;
  }

  if (templateMode === 'full_3part') {
    const parts = [`${prefix}${name.toUpperCase()}`];
    if (sect && !parts.includes(sect.toUpperCase())) parts.push(sect.toUpperCase());
    if (realm && !parts.includes(realm.toUpperCase())) parts.push(realm.toUpperCase());
    else if (role && !parts.includes(role.toUpperCase())) parts.push(role.toUpperCase());
    return `【 ${parts.join(' | ')} 】`;
  }

  if (templateMode === 'modern_badge') {
    const icon = type === 'CHÍ BẢO' ? '⚔️' : (type === 'ĐỊA DANH' ? '🏛️' : (type === 'CẢNH GIỚI' ? '⚡' : (type === 'CÔNG PHÁP' ? '📜' : (type === 'HỆ THỐNG' ? '🤖' : '👤'))));
    const extra = [sect, realm || role].filter(Boolean).filter(x => x.toLowerCase() !== nameLower).join(' • ');
    return `${icon} [ ${name.toUpperCase()} ]${extra ? ` • ${extra}` : ''}`;
  }

  if (templateMode === 'name_only_bracket') {
    const secondPart = sect || realm || role;
    if (secondPart && secondPart.toUpperCase() !== name.toUpperCase()) {
      return `【 ${name.toUpperCase()} • ${secondPart.toUpperCase()} 】`;
    }
    return `【 ${name.toUpperCase()} 】`;
  }



  if (templateMode === 'custom' && customPattern) {
    let result = customPattern
      .replace(/{TYPE}/g, type)
      .replace(/{NAME}/g, name.toUpperCase())
      .replace(/{name}/g, name)
      .replace(/{SECT}/g, sect ? sect.toUpperCase() : '')
      .replace(/{sect}/g, sect)
      .replace(/{REALM}/g, realm ? realm.toUpperCase() : '')
      .replace(/{realm}/g, realm)
      .replace(/{ROLE}/g, role ? role.toUpperCase() : '')
      .replace(/{role}/g, role);

    result = result.replace(/\s*\|\s*\|\s*/g, ' | ')
      .replace(/\s*\|\s*】/g, ' 】')
      .replace(/【\s*\|\s*/g, '【 ')
      .replace(/\s*•\s*•\s*/g, ' • ')
      .replace(/\s*•\s*\]/g, ' ]')
      .trim();
    return result;
  }

  return `【 ${type}: ${name.toUpperCase()} 】`;
}

// Generate Separate SRT file for Character Intro Tags (Strictly Sorted Chronologically, 2s Display Duration)
export function generateCharacterIntroSRT(characters, files, isFullMovie = false, fileDurations = {}, gapSeconds = 0, displayDurationSec = 2, templateMode = 'clean_compact', customPattern = '') {
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
    const text = cleanAndFormatIntroTag(char, templateMode, customPattern) || char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} 】`;

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
export function generateCharacterIntroASS(characters, files, isFullMovie = false, fileDurations = {}, gapSeconds = 0, displayDurationSec = 2, templateMode = 'clean_compact', customPattern = '') {
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
    const text = cleanAndFormatIntroTag(char, templateMode, customPattern) || char.introTag || `【 NHÂN VẬT: ${char.name.toUpperCase()} 】`;

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

