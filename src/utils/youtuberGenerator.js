// YouTube Metadata & Thumbnail Prompt AI Engine (Supercharged AI Generation)

function safeParseAIJson(rawText) {
  if (!rawText) return null;

  // 1. Strip markdown code fences ```json ... ```
  let cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // 2. Extract object enclosed by first '{' and last '}'
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // 3. Fix unescaped newlines/tabs inside quoted string values
  function sanitizeJsonStrings(str) {
    return str
      .replace(/,\s*([\}\]])/g, '$1') // remove trailing commas
      .replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
        return match
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
      });
  }

  // Attempt 1: Direct JSON Parse
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Attempt 2: Parse after sanitizing string literals
    try {
      const sanitized = sanitizeJsonStrings(cleaned);
      return JSON.parse(sanitized);
    } catch (e2) {
      console.warn("JSON repair attempt failed:", e2);
    }
  }

  // Attempt 3: Extract structured fields using Regex
  try {
    const titles = [];
    const titleRegex = /"titles"\s*:\s*\[([\s\S]*?)\]/i;
    const titleMatch = rawText.match(titleRegex);
    if (titleMatch) {
      const matches = titleMatch[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
      if (matches) {
        matches.forEach(m => {
          const t = m.replace(/^"|"$/g, '').replace(/\\"/g, '"').trim();
          if (t && !t.startsWith('Tiêu đề 1')) titles.push(t);
        });
      }
    }

    const thumbMatches = [...rawText.matchAll(/\{\s*"line1"\s*:\s*"([^"]+)"\s*,\s*"line2"\s*:\s*"([^"]+)"\s*\}/gi)];
    const thumbnailTexts = thumbMatches.map(m => ({ line1: m[1], line2: m[2] }));

    const summaryMatch = rawText.match(/"storySummary"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i) ||
                         rawText.match(/"summary"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);
    const descMatch = rawText.match(/"description"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);
    const promptEnMatch = rawText.match(/"imagePromptEn"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);
    const promptViMatch = rawText.match(/"imagePromptVi"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);
    const tagsMatch = rawText.match(/"tags"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);

    // Extract timestamps array
    const timeMatch = rawText.match(/"timestamps"\s*:\s*\[([\s\S]*?)\]/i);
    const timestamps = [];
    if (timeMatch) {
      const items = timeMatch[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
      if (items) {
        items.forEach(t => timestamps.push(t.replace(/^"|"$/g, '').trim()));
      }
    }

    if (titles.length > 0 || descMatch || summaryMatch) {
      return {
        titles: titles.length > 0 ? titles : ['Tóm Tắt Phim Tu Tiên'],
        thumbnailTexts: thumbnailTexts.length > 0 ? thumbnailTexts : null,
        storySummary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : '',
        timestamps: timestamps.length > 0 ? timestamps : [],
        imagePromptEn: promptEnMatch ? promptEnMatch[1].replace(/\\n/g, ' ') : '',
        imagePromptVi: promptViMatch ? promptViMatch[1].replace(/\\n/g, ' ') : '',
        description: descMatch ? descMatch[1].replace(/\\n/g, '\n') : '',
        tags: tagsMatch ? tagsMatch[1] : ''
      };
    }

  } catch (e3) {
    console.error("Regex fallback parser failed:", e3);
  }

  return null;
}


export async function generateYoutubeContent({
  selectedFiles = [],
  genre = 'Tu Tiên / Tiên Hiệp',
  contentType = 'Review Phim / Tóm Tắt Phim',
  aiProvider = 'orimise',
  apiKey,
  baseUrl = 'https://api.orimise.com/v1',
  model = 'claude-sonnet-5'
}) {
  if (!apiKey) {
    throw new Error('Chưa nhập API Key trong Cấu Hình AI!');
  }

  if (!selectedFiles || selectedFiles.length === 0) {
    throw new Error('Vui lòng chọn ít nhất 1 file SRT phụ đề để phân tích!');
  }

  // Combine subtitles from all selected files
  let allSubtitles = [];
  const fileNames = selectedFiles.map(f => f.name).join(', ');

  selectedFiles.forEach(f => {
    if (f.subtitles && f.subtitles.length > 0) {
      allSubtitles = allSubtitles.concat(f.subtitles);
    }
  });

  if (allSubtitles.length === 0) {
    throw new Error('Các file đã chọn không có nội dung phụ đề!');
  }

  // Helper: Format compact time stamp (e.g. '00:01:23,456' -> '01:23') to save 40% tokens
  const formatCompactTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.replace(/^00:/, '').split(',')[0].split('.')[0];
  };

  // Combine 100% FULL subtitles of all selected files in token-optimized compact format
  const fullTranscriptContext = selectedFiles.map((file, fileIdx) => {
    let prevText = '';
    const compactLines = file.subtitles
      .map(s => {
        const text = (s.translatedText || s.originalText || '').trim();
        if (!text || text === prevText) return null;
        prevText = text;
        const time = formatCompactTime(s.startTime);
        return time ? `[${time}] ${text}` : text;
      })
      .filter(Boolean)
      .join('\n');

    return `=== TẬP #${fileIdx + 1}: ${file.name} (${file.subtitles.length} dòng) ===\n${compactLines}`;
  }).join('\n\n');

  const systemPrompt = `You are an Elite YouTube Creative Director & Viral Content Strategist specializing in Review Truyện Tranh / Manhua / Donghua 3D / Phim Tu Tiên.

QUY TRÌNH 2 BƯỚC BẮT BUỘC KHI XỬ LÝ DỮ LIỆU:

BƯỚC 1: ĐỌC VÀ HIỂU TRỌN VẸN 100% CỐT TRUYỆN TỪ ĐẦU ĐẾN CUỐI
- Đọc kỹ toàn bộ từng câu thoại trong tất cả các tập phim SRT được cung cấp bên dưới (không bỏ sót tình tiết nào).
- Nắm rõ: Nhân vật chính là ai, khởi đầu từ nghịch cảnh nào (bị phế, hủy hôn, đuổi khỏi tông môn, trọng sinh, xuyên không...)?
- Xuất hiện công pháp, hệ thống, bảo vật hay cơ duyên gì?
- Những phân đoạn cao trào, vả mặt kẻ thù, đột phá cảnh giới và kết cục của chuỗi tập phim.

BƯỚC 2: TỔNG HỢP VÀ SÁNG TẠO BỘ METADATA YOUTUBE CHUẨN VIRAL
1. TÓM TẮT CỐT TRUYỆN CHI TIẾT (storySummary):
   - Viết bài tóm tắt mạch lạc, cuốn hút (khoảng 350 - 550 chữ) kể lại toàn bộ diễn biến các tập phim từ mở đầu đến kết thúc để nhà sáng tạo video đọc hiểu trọn vẹn 100% câu chuyện.

2. 5 TIÊU ĐỀ YOUTUBE CHUẨN 80–90 KÝ TỰ (titles):
   - Áp dụng công thức viral: [Xuyên Không/Trọng Sinh] + [Nghịch Cảnh Trong Phim] + [Cơ Duyên/Hệ Thống] + [Sức Mạnh] + [Kết Quả Bá Đạo]
   - Chuẩn độ dài 80 - 90 ký tự. Không dùng tên riêng đích danh (dùng: Hắn, Gã Đệ Tử Tạp Dịch, Kẻ Phế Vật, Ma Tôn...).
   - Chia 5 góc độ hấp dẫn khác nhau dựa trên đúng cốt truyện đã đọc:
     + Tiêu đề #1: Góc độ Xuyên Không / Trọng Sinh thức tỉnh.
     + Tiêu đề #2: Góc độ Nghịch cảnh / Bị tông môn ruồng bỏ & vả mặt.
     + Tiêu đề #3: Góc độ Thần kiếm / Hệ thống / Bảo vật vô địch.
     + Tiêu đề #4: Góc độ Tu La / Ma Đạo / Bá vương giáng thế.
     + Tiêu đề #5: Góc độ Đột phá cảnh giới / Quét sạch vạn giới.

3. 5 MẪU CHỮ THUMBNAIL 2 DÒNG TƯƠNG ỨNG 1-1 VỚI TỪNG TIÊU ĐỀ ĐÓ (thumbnailTexts):
   - BẮT BUỘC TẠO ĐỦ 5 MẪU CHỮ THUMBNAIL KHỚP CHÍNH XÁC VỚI 5 TIÊU ĐỀ TRÊN:
     + Mẫu #1 tương ứng và bổ trợ cho Tiêu đề #1.
     + Mẫu #2 tương ứng và bổ trợ cho Tiêu đề #2.
     + Mẫu #3 tương ứng và bổ trợ cho Tiêu đề #3.
     + Mẫu #4 tương ứng và bổ trợ cho Tiêu đề #4.
     + Mẫu #5 tương ứng và bổ trợ cho Tiêu đề #5.
   - Mỗi mẫu gồm 2 dòng, mỗi dòng DÀI KHOẢNG 7 ĐẾN 10 TỪ (viết HOA, cuốn hút, giàu hình tượng, kịch tính, đầy đủ ý nghĩa):
     + line1 (Chữ vàng 3D đập mắt - 7 đến 10 từ): Nêu bật biến cố / nghịch cảnh hiểm nghèo của Tiêu đề đó.
     + line2 (Chữ xanh ngọc kịch tính - 7 đến 10 từ): Nêu bật thức tỉnh sức mạnh / vả mặt phản đòn quét sạch kẻ thù của Tiêu đề đó.

4. BẢNG MỐC THỜI GIAN PHÂN CẢNH YOUTUBE (timestamps):
   - Mảng 4 - 6 mốc thời gian diễn biến chính (VD: "00:00 Mở đầu: Xuyên Không...", "03:45 Nghịch Cảnh...", "12:10 Cao Trào...", "20:30 Kết Cục...").

5. PROMPT ẢNH MIDJOURNEY/FLUX (imagePromptEn & imagePromptVi):
   - 16:9 Midjourney v6/Flux prompt miêu tả đúng nhân vật, áo choàng chiến bào, thần kiếm, hào quang linh lực và bối cảnh tông môn trong phim, 8k cinematic octane render, chừa không gian giữa để đặt chữ 3D.

6. MÔ TẢ & TAGS (description & tags):
   - Mô tả video YouTube cuốn hút theo dòng thời gian, nhúng sẵn mốc thời gian và danh sách thẻ tags SEO.

REQUIRED OUTPUT JSON FORMAT (Return ONLY valid JSON):
{
  "storySummary": "Bài tóm tắt toàn bộ cốt truyện chi tiết, mạch lạc, dễ hiểu...",
  "titles": [
    "💥 [Tiêu đề 1 chuẩn 80-90 ký tự: Góc độ Xuyên Không/Trọng Sinh]",
    "🔥 [Tiêu đề 2 chuẩn 80-90 ký tự: Góc độ Nghịch Cảnh Vả Mặt]",
    "⚡ [Tiêu đề 3 chuẩn 80-90 ký tự: Góc độ Hệ Thống/Bảo Vật Vô Địch]",
    "👑 [Tiêu đề 4 chuẩn 80-90 ký tự: Góc độ Ma Tôn/Tu La Bá Vương]",
    "😱 [Tiêu đề 5 chuẩn 80-90 ký tự: Góc độ Đột Phá Quét Sạch Thiên Hạ]"
  ],
  "thumbnailTexts": [
    {
      "line1": "TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ",
      "line2": "MỘT KIẾM CHÉM ĐỨT TOÀN BỘ XIỀNG XÍCH TÔNG MÔN"
    },
    {
      "line1": "KẺ PHẾ VẬT BỊ CẢ TÔNG MÔN RUỒNG BỎ ĐUỔI ĐI",
      "line2": "THỨC TỈNH THẦN MA QUYẾT QUÉT SẠCH THIÊN HẠ"
    },
    {
      "line1": "TRỌNG SINH MANG THEO HỆ THỐNG VÔ ĐỊCH THẦN CẤP",
      "line2": "MỘT BƯỚC ĐỘT PHÁ THÀNH ĐỈNH CAO THẦN MA"
    },
    {
      "line1": "TOÀN GIA BỊ BẮT TỐNG VÀO NGỤC TỐI TU TIÊN",
      "line2": "HẮN TRIỆU HỒI MA TÔN THẦN KIẾM PHẢN SÁT"
    },
    {
      "line1": "ĐẠI CHIẾN SINH TỬ ĐỐI ĐẦU HÀNG TRĂM TRƯỞNG LÃO",
      "line2": "MỘT CHIÊU QUYẾT ĐỊNH XÓA SỔ TOÀN BỘ ĐỊCH NHÂN"
    }
  ],

  "timestamps": [
    "00:00 Mở đầu: Xuyên Không Đến Tu Tiên Giới",
    "03:45 Biến cố: Toàn Gia Bị Tống Vào Hầm Ngục",
    "08:20 Cơ duyên: Thức Tỉnh Hệ Thống Vô Địch",
    "14:15 Cao trào: Đột Phá Cảnh Giới Quét Sạch Kẻ Thù",
    "22:00 Kết cục: Bắt Đầu Hành Trình Vô Địch Thiên Hạ"
  ],
  "imagePromptEn": "Cinematic 16:9 master piece of Xianxia protagonist with glowing eyes and golden dragon aura...",
  "imagePromptVi": "Mô tả ý tưởng hình ảnh thumbnail bằng tiếng Việt...",
  "description": "Mô tả video YouTube chi tiết theo các tập phim...",
  "tags": "tu tiên, tóm tắt phim, review phim tu tiên..."
}
`;


  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}
DANH SÁCH TẬP PHIM (${selectedFiles.length} TẬP): ${fileNames}

=== NỘI DUNG TOÀN BỘ 100% PHỤ ĐỀ SRT CỦA TẤT CẢ CÁC TẬP ===
${fullTranscriptContext}
=== HẾT TOÀN BỘ PHỤ ĐỀ SRT ===

HÃY THỰC HIỆN ĐÚNG QUY TRÌNH 2 BƯỚC:
1. Đọc và hiểu toàn bộ 100% nội dung phụ đề trên để viết bài TÓM TẮT CỐT TRUYỆN CHI TIẾT (storySummary).
2. Tạo 5 Tiêu Đề chuẩn 80-90 ký tự + 3 Mẫu Chữ Thumbnail 2 Dòng (7-8 từ/dòng) + Prompt Ảnh khớp 100% với phim.
3. Xuất ra 1 đối tượng JSON duy nhất:`;


  let rawText = '';

  if (aiProvider === 'orimise') {
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const reqBody = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7
    };

    if (model.includes('gpt') || model.includes('gemini')) {
      reqBody.response_format = { type: 'json_object' };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Lỗi Orimise API HTTP ${response.status}`);
    }

    const data = await response.json();
    rawText = data.choices?.[0]?.message?.content || '';
  } else {
    // Gemini Direct API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userMessage}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Lỗi Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (!rawText) {
    throw new Error('AI không trả về kết quả.');
  }

  // Safely parse JSON from AI output
  const parsed = safeParseAIJson(rawText);

  if (!parsed) {
    console.error("Failed raw AI text:", rawText);
    throw new Error('Không thể phân tích dữ liệu từ kết quả AI. Vui lòng thử lại!');
  }

  // Format thumbnailTexts
  let formattedTexts = [];
  if (Array.isArray(parsed.thumbnailTexts) && parsed.thumbnailTexts.length > 0) {
    formattedTexts = parsed.thumbnailTexts.map(t => {
      if (typeof t === 'object' && t !== null) {
        return {
          line1: t.line1 || t.line_1 || 'VỪA XUYÊN KHÔNG ĐÃ BỊ TỐNG VÀO HẦM NGỤC',
          line2: t.line2 || t.line_2 || 'KÍCH HOẠT HỆ THỐNG VÔ ĐỊCH QUÉT SẠCH TÔNG MÔN'
        };
      } else if (typeof t === 'string') {
        const parts = t.split(/[\n|]/);
        return {
          line1: parts[0]?.trim() || t,
          line2: parts[1]?.trim() || ''
        };
      }
      return { line1: 'VỪA XUYÊN KHÔNG ĐÃ BỊ TỐNG VÀO HẦM NGỤC', line2: '' };
    });
  } else {
    formattedTexts = [
      { line1: 'VỪA XUYÊN KHÔNG ĐÃ BỊ TỐNG VÀO HẦM NGỤC', line2: 'KÍCH HOẠT HỆ THỐNG VÔ ĐỊCH QUÉT SẠCH TÔNG MÔN' }
    ];
  }

  // Ensure description has timestamps if available
  let finalDescription = parsed.description || '';
  const parsedTimestamps = Array.isArray(parsed.timestamps) ? parsed.timestamps : [];
  if (parsedTimestamps.length > 0 && !finalDescription.includes('00:00')) {
    finalDescription = `${finalDescription}\n\n📌 MỐC THỜI GIAN VIDEO:\n${parsedTimestamps.join('\n')}`;
  }

  return {
    titles: (Array.isArray(parsed.titles) && parsed.titles.length > 0)
      ? parsed.titles
      : [parsed.title || 'Tiêu đề Phim Tu Tiên'],
    thumbnailTexts: formattedTexts,
    storySummary: parsed.storySummary || parsed.summary || '',
    timestamps: parsedTimestamps,
    imagePromptEn: parsed.imagePromptEn || parsed.prompt || '',
    imagePromptVi: parsed.imagePromptVi || '',
    description: finalDescription,
    tags: parsed.tags || ''
  };
}


