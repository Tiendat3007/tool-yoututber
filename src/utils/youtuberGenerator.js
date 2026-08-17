// YouTube Metadata & Thumbnail Prompt AI Engine (Bulletproof JSON Parser)

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

    const descMatch = rawText.match(/"description"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);
    const promptEnMatch = rawText.match(/"imagePromptEn"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);
    const promptViMatch = rawText.match(/"imagePromptVi"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);
    const tagsMatch = rawText.match(/"tags"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"[a-zA-Z]+"|\s*\})/i);

    if (titles.length > 0 || descMatch) {
      return {
        titles: titles.length > 0 ? titles : ['Tóm Tắt Phim Tu Tiên'],
        thumbnailTexts: thumbnailTexts.length > 0 ? thumbnailTexts : null,
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

  // Extract deep narrative representation (up to 300 sampled lines covering beginning, climax and end)
  const maxLines = 300;
  const step = Math.max(1, Math.floor(allSubtitles.length / maxLines));
  const sampledLines = allSubtitles
    .filter((_, idx) => idx % step === 0)
    .map((s, idx) => `[Dòng ${idx + 1}] ${s.translatedText || s.originalText}`)
    .join('\n');

  // Allow up to 14,000 characters of rich transcript context
  const fullTranscriptContext = sampledLines.substring(0, 14000);

  const systemPrompt = `You are a World-Class YouTube Growth Expert & Viral Content Strategist specializing in Review Truyện Tranh / Manhua / Anime 3D / Phim Tu Tiên.

YOUR MISSION:
1. ĐỌC KỸ TOÀN BỘ NỘI DUNG PHỤ ĐỀ SRT BÊN DƯỚI ĐỂ HIỂU RÕ CỐT TRUYỆN:
   - Ai là nhân vật chính? Nghịch cảnh/biến cố gì đang xảy ra (bị trục xuất, hủy hôn, hãm hại, xuyên không, thức tỉnh...)?
   - Xuất hiện công pháp, bảo vật, cảnh giới tu luyện, tông môn hay kẻ thù nào?
   - Đâu là các phân đoạn cao trào, vả mặt, đột phá, trả thù hay bí mật lớn nhất trong các tập phim này?

2. TẠO 5 TIÊU ĐỀ YOUTUBE DỰA TRÊN CỐT TRUYỆN THỰC TẾ + CÔNG THỨC 80-90 KÝ TỰ:
   - Áp dụng cấu trúc vàng: [Xuyên Không/Trọng Sinh] + [Nghịch cảnh thực tế trong phim] + [Hệ Thống/Bảo Vật/Cơ Duyên thực tế] + [Sức mạnh] + [Kết quả bá đạo]
   - BẮT BUỘC ĐỘ DÀI: 80 - 90 ký tự (chuẩn SEO & tỷ lệ click CTR YouTube cao nhất).
   - TUYỆT ĐỐI KHÔNG sao chép ví dụ mẫu nguyên văn. Phải lấy đúng nhân vật, biến cố và tình tiết có trong phụ đề để sáng tác!
   - Không dùng tên riêng đích danh (Dùng: "Hắn", "Kẻ Phế Vật", "Gã Đệ Tử Tạp Dịch", "Đại Lão Ẩn Thân", "Ma Tôn", "Bản Tọa"...).
   - Đặt 5 góc nhìn khác nhau:
     * Tiêu đề 1: Theo hướng Xuyên Không / Hệ Thống / Vô Địch bá đạo.
     * Tiêu đề 2: Theo hướng Bị Coi Thường / Thức Tỉnh Nghịch Thiên / Đột Phá.
     * Tiêu đề 3: Theo hướng Đệ Tử Tạp Dịch / Nhận Thần Công / Đánh Dấu.
     * Tiêu đề 4: Theo hướng Tu Vi Khủng / Vạn Năm Tu Vi / Quét Ngang Thiên Hạ.
     * Tiêu đề 5: Theo hướng Thân Phận Ẩn / Tuyệt Thế Chí Tôn / Khiến Cả Tông Môn Khiếp Sợ.

3. TẠO 3 MẪU CHỮ THUMBNAIL 2 DÒNG (7-8 TỪ MỖI DÒNG):
   - Phải trích xuất 2 câu giật gân, cao trào nhất từ đúng diễn biến trong tập phim đã đọc.
   - Mỗi dòng chuẩn 7 đến 8 từ, viết HOA, kịch tính, gây tò mò tột độ.

4. TẠO PROMPT ẢNH VÀ MÔ TẢ:
   - imagePromptEn: Chi tiết 16:9 Midjourney/Flux prompt mô tả đúng ngoại hình nhân vật, y phục, ánh sáng linh lực, tông môn xuất hiện trong phim, 8k cinematic.
   - description: Tóm tắt hấp dẫn diễn biến kịch tính theo từng phân đoạn trong các tập phim kèm lời kêu gọi đăng ký và hashtags.
   - tags: Các từ khóa SEO YouTube liên quan trực tiếp đến phim và thể loại.

REQUIRED OUTPUT JSON SCHEMA (Output ONLY valid JSON, no markdown outside JSON):
{
  "titles": [
    "💥 [Tiêu đề 1 tạo từ cốt truyện thật, chuẩn 80-90 ký tự]",
    "🔥 [Tiêu đề 2 tạo từ cốt truyện thật, chuẩn 80-90 ký tự]",
    "⚡ [Tiêu đề 3 tạo từ cốt truyện thật, chuẩn 80-90 ký tự]",
    "👑 [Tiêu đề 4 tạo từ cốt truyện thật, chuẩn 80-90 ký tự]",
    "😱 [Tiêu đề 5 tạo từ cốt truyện thật, chuẩn 80-90 ký tự]"
  ],
  "thumbnailTexts": [
    { 
      "line1": "DÒNG 1 KỊCH TÍNH DỰA THEO PHIM ĐÚNG 7 ĐẾN 8 TỪ", 
      "line2": "DÒNG 2 BIẾN CỐ DỰA THEO PHIM ĐÚNG 7 ĐẾN 8 TỪ" 
    },
    { 
      "line1": "DÒNG 1 CAO TRÀO DỰA THEO PHIM ĐÚNG 7 ĐẾN 8 TỪ", 
      "line2": "DÒNG 2 CAO TRÀO DỰA THEO PHIM ĐÚNG 7 ĐẾN 8 TỪ" 
    },
    { 
      "line1": "DÒNG 1 VẢ MẶT DỰA THEO PHIM ĐÚNG 7 ĐẾN 8 TỪ", 
      "line2": "DÒNG 2 VẢ MẶT DỰA THEO PHIM ĐÚNG 7 ĐẾN 8 TỪ" 
    }
  ],
  "imagePromptEn": "Detailed 16:9 Midjourney/Flux prompt with character, aura, lighting, 8k --ar 16:9",
  "imagePromptVi": "Mô tả ý tưởng ảnh bằng tiếng Việt",
  "description": "Mô tả video YouTube chi tiết",
  "tags": "tu tiên, tóm tắt phim, review phim, xuyên không"
}`;

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}
DANH SÁCH TẬP PHIM (${selectedFiles.length} TẬP): ${fileNames}

=== NỘI DUNG PHỤ ĐỀ PHIM (TRÍCH ĐOẠN CHI TIẾT TỪ TOÀN BỘ CÁC TẬP) ===
${fullTranscriptContext}
=== HẾT NỘI DUNG PHỤ ĐỀ ===

YÊU CẦU:
Đọc kỹ toàn bộ cốt truyện phụ đề trên. Hãy kết hợp các tình tiết, sự kiện thực tế trong phim với bộ công thức 80-90 ký tự và chữ Thumbnail 2 dòng (7-8 từ/dòng) để xuất ra 1 đoạn JSON chuẩn xác 100%:`;

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
          line1: t.line1 || t.line_1 || 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ KHỞI ĐẦU BÁ ĐẠO',
          line2: t.line2 || t.line_2 || 'TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC MẠNG NGƯỜI NHƯ CỎ RÁC'
        };
      } else if (typeof t === 'string') {
        const parts = t.split(/[\n|]/);
        return {
          line1: parts[0]?.trim() || t,
          line2: parts[1]?.trim() || ''
        };
      }
      return { line1: 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ KHỞI ĐẦU BÁ ĐẠO', line2: '' };
    });
  } else {
    formattedTexts = [
      { line1: 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ KHỞI ĐẦU BÁ ĐẠO', line2: 'TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC MẠNG NGƯỜI NHƯ CỎ RÁC' }
    ];
  }

  return {
    titles: (Array.isArray(parsed.titles) && parsed.titles.length > 0)
      ? parsed.titles
      : [parsed.title || 'Tiêu đề Phim Tu Tiên'],
    thumbnailTexts: formattedTexts,
    imagePromptEn: parsed.imagePromptEn || parsed.prompt || '',
    imagePromptVi: parsed.imagePromptVi || '',
    description: parsed.description || '',
    tags: parsed.tags || ''
  };
}
