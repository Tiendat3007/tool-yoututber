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

    if (titles.length > 0 || descMatch || summaryMatch) {
      return {
        titles: titles.length > 0 ? titles : ['Tóm Tắt Phim Tu Tiên'],
        thumbnailTexts: thumbnailTexts.length > 0 ? thumbnailTexts : null,
        storySummary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : '',
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

  const systemPrompt = `You are an Elite YouTube Creative Director & AI Prompt Master specializing in 3D Anime / Manhua / Donghua / Tu Tiên review channels.

YOUR COMPREHENSIVE GENERATION DIRECTIVE:
Phân tích toàn bộ phụ đề kịch bản SRT để xuất trọn bộ YouTube Publishing Pack có tính TƯƠNG HỖ VÀ LIÊN KẾT CAO GIỮA TITLE - TEXT THUMBNAIL - PROMPT ẢNH:

1. QUY TẮC TIÊU ĐỀ YOUTUBE (titles - 5 Tiêu Đề):
   - ĐỘ DÀI CHUẨN: 80 - 90 KÝ TỰ (Đúng điểm ngọt thuật toán YouTube CTR & SEO).
   - CÔNG THỨC VÀNG 5 THÀNH PHẦN:
     [Xuyên Không/Trọng Sinh] + [Nghịch Cảnh Trong Phim] + [Cơ Duyên/Hệ Thống] + [Sức Mạnh Đạt Được] + [Kết Quả Bá Đạo]
   - KHÔNG dùng tên riêng đích danh (Dùng danh xưng: Hắn, Kẻ Phế Vật, Gã Đệ Tử Tạp Dịch, Ma Tôn, Tuyệt Thế Cao Thủ...).
   - Tạo 5 Tiêu Đề theo 5 góc độ hấp dẫn khác nhau từ chính diễn biến phim (1: Vô Địch Hệ Thống, 2: Vả Mặt Đột Phá, 3: Cơ Duyên Thần Công, 4: Vạn Năm Tu Vi, 5: Thân Phận Ẩn).

2. QUY TẮC CHỮ THUMBNAIL 2 DÒNG (thumbnailTexts - 3 Mẫu 2 Dòng):
   - MỖI DÒNG ĐÚNG 7 ĐẾN 8 TỪ, viết HOA toàn bộ.
   - NGUYÊN TẮC ĐỐI XỨNG TƯƠNG PHẢN (GÂY TÒ MÒ CỰC ĐỘ):
     * DÒNG 1 (Chữ Vàng 3D): Nêu nghịch cảnh/nguy nan/thách thức lớn nhất trong tập phim.
     * DÒNG 2 (Chữ Xanh 3D): Nêu cú phản đòn/thức tỉnh/vả mặt rung chuyển tông môn.
   - Ví dụ:
     Line 1: "VỪA XUYÊN KHÔNG ĐÃ BỊ TỐNG VÀO HẦM NGỤC" (8 từ)
     Line 2: "KÍCH HOẠT HỆ THỐNG VÔ ĐỊCH QUÉT SẠCH TÔNG MÔN" (8 từ)

3. QUY TẮC PROMPT ẢNH MIDJOURNEY / FLUX (imagePromptEn & imagePromptVi):
   - imagePromptEn: Viết bằng tiếng Anh chuẩn Prompt Master cho Midjourney v6/Flux.1:
     * Chủ thể: Nhân vật chính nam/nữ với thần thái bá đạo, mắt lóe sáng linh lực rực rỡ (glowing sacred eyes), áo choàng Tiên Hiệp tung bay trong gió (flowing Xianxia robe with intricate golden embroidery).
     * Tư thế: Đang tung chưởng hoặc rút thần kiếm phát ra năng lượng sấm sét cuồn cuộn (summoning ancient divine sword, lightning aura).
     * Bối cảnh: Khung cảnh tông môn Tiên Hiệp cổ kính kỳ vĩ, thiên kiếp mây đen bao phủ hoặc cung điện hoàng kim đổ nát (ancient Chinese floating mountains, thunderstorm sky, dramatic lighting, octane render 8k, cinematic composition, framed with negative center space for bold 3D text overlay --ar 16:9).
   - imagePromptVi: Mô tả ý tưởng chi tiết bằng tiếng Việt (bố cục nhân vật, ánh sáng, góc đặt chữ 2 dòng).

4. TÓM TẮT CỐT TRUYỆN TOÀN TẬP (storySummary):
   - Viết bài tóm tắt chi tiết, liền mạch, cuốn hút (khoảng 300 - 500 chữ) tóm lược toàn bộ cốt truyện các tập phim: nhân vật chính là ai, khởi đầu từ đâu, biến cố gì xảy ra, quá trình tu luyện/đột phá, các màn đối đầu gay cấn và kết cục của các tập phim này để nhà sáng tạo video đọc hiểu trọn vẹn.

5. MÔ TẢ (description) & TAGS (tags):
   - description: Viết đoạn mô tả YouTube cuốn hút, tóm tắt các nút thắt cao trào của các tập phim, chèn mốc thời gian và lời kêu gọi bấm Đăng Ký.
   - tags: Chuỗi từ khóa SEO YouTube phân cách bởi dấu phẩy.

REQUIRED OUTPUT JSON FORMAT (Return ONLY valid JSON):
{
  "storySummary": "Tóm tắt cốt truyện toàn tập chi tiết, mạch lạc, dễ đọc để nhà sáng tạo nắm rõ diễn biến phim...",
  "titles": [
    "💥 [Tiêu đề 1 chuẩn 80-90 ký tự dựa theo phim]",
    "🔥 [Tiêu đề 2 chuẩn 80-90 ký tự dựa theo phim]",
    "⚡ [Tiêu đề 3 chuẩn 80-90 ký tự dựa theo phim]",
    "👑 [Tiêu đề 4 chuẩn 80-90 ký tự dựa theo phim]",
    "😱 [Tiêu đề 5 chuẩn 80-90 ký tự dựa theo phim]"
  ],
  "thumbnailTexts": [
    {
      "line1": "DÒNG 1 NGHỊCH CẢNH CỦA PHIM ĐÚNG 7 ĐẾN 8 TỪ",
      "line2": "DÒNG 2 PHẢN ĐÒN VẢ MẶT CỦA PHIM ĐÚNG 7 ĐẾN 8 TỪ"
    },
    {
      "line1": "DÒNG 1 BIẾN CỐ BẤT NGỜ ĐÚNG 7 ĐẾN 8 TỪ",
      "line2": "DÒNG 2 ĐỘT PHÁ BÁ ĐẠO ĐÚNG 7 ĐẾN 8 TỪ"
    },
    {
      "line1": "DÒNG 1 THÁCH THỨC SINH TỬ ĐÚNG 7 ĐẾN 8 TỪ",
      "line2": "DÒNG 2 QUÉT NGANG THIÊN HẠ ĐÚNG 7 ĐẾN 8 TỪ"
    }
  ],
  "imagePromptEn": "Cinematic 16:9 master piece of Xianxia protagonist with glowing eyes and golden dragon aura...",
  "imagePromptVi": "Mô tả ý tưởng hình ảnh thumbnail bằng tiếng Việt...",
  "description": "Mô tả video YouTube chi tiết theo các tập phim...",
  "tags": "tu tiên, tóm tắt phim, review phim tu tiên..."
}`;


  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}
DANH SÁCH TẬP PHIM (${selectedFiles.length} TẬP): ${fileNames}

=== TOÀN BỘ DIỄN BIẾN PHỤ ĐỀ SRT TRÍCH ĐOẠN ĐẦY ĐỦ ===
${fullTranscriptContext}
=== HẾT DIỄN BIẾN PHỤ ĐỀ ===

YÊU CẦU ĐẶC BIỆT:
1. Đọc kỹ diễn biến trên và tạo 5 Tiêu Đề chuẩn công thức 80-90 ký tự.
2. Tạo 3 Mẫu Chữ Thumbnail 2 Dòng tương phản (Dòng 1: Nghịch cảnh, Dòng 2: Phản đòn vả mặt) đúng 7-8 từ/dòng.
3. Tạo Prompt Ảnh Midjourney/Flux 16:9 sắc nét khớp nhân vật và không gian trong phim.
4. Trả về đúng 1 đối tượng JSON duy nhất:`;

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

  return {
    titles: (Array.isArray(parsed.titles) && parsed.titles.length > 0)
      ? parsed.titles
      : [parsed.title || 'Tiêu đề Phim Tu Tiên'],
    thumbnailTexts: formattedTexts,
    storySummary: parsed.storySummary || parsed.summary || '',
    imagePromptEn: parsed.imagePromptEn || parsed.prompt || '',
    imagePromptVi: parsed.imagePromptVi || '',
    description: parsed.description || '',
    tags: parsed.tags || ''
  };
}

