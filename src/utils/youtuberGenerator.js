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

  // Extract representative lines (up to 120 lines sampled evenly across all files)
  const step = Math.max(1, Math.floor(allSubtitles.length / 120));
  const sampledText = allSubtitles
    .filter((_, idx) => idx % step === 0)
    .map(s => s.translatedText || s.originalText)
    .join('\n');

    const systemPrompt = `You are a World-Class YouTube Growth Expert specializing in Review Truyện Tranh / Manhua / Anime / Tu Tiên.
Task: Analyze the film transcript and generate a high-CTR YouTube Publishing Pack in Vietnamese.

RULES FOR TITLES (titles):
1. TUYỆT ĐỐI KHÔNG dùng tên riêng đích danh của nhân vật (Không dùng: Lâm Tiêu, Trâu Phong, Diệp Phàm, Dương Lăng, v.v.).
2. LUÔN DÙNG NGÔI XƯNG "TA", "BẢN TỌA", "BẢN ĐẾ" HOẶC DANH XƯNG THÂN PHẬN BÍ ẨN ("Gã Gia Đinh", "Kẻ Phế Vật", "Đại Lão Ẩn Thân", "Nữ Đế", "Ma Tôn", "Tên Đầy Tớ", "Đệ Tử Ngoại Môn"...).
3. ĐÁNH VÀO TÂM LÝ TÒ MÒ / NGHỊCH LÝ / VẢ MẶT BÁ ĐẠO (Độ dài 65-85 ký tự):
   - Kiểu nghịch lý: Bị ép làm điều xấu/gặp nạn -> Không ngờ ta lại hưởng lợi khủng / Tác dụng phụ rơi hết vào đầu kẻ địch.
   - Kiểu vả mặt/Karma: Chê ta là phế vật nên chèn ép -> Đến khi ta ra tay thì cả tông môn/gia tộc phải quỳ lạy.
   - Kiểu trớ trêu/hài hước: Ta là Ma Tôn vô địch nhưng lại bị kéo xuống làm shipper/người thường.
   - Kiểu tò mò cực độ: Lén luyện cấm thuật / Vừa trùng sinh liền bị...
4. Viết hoa chữ cái đầu các từ quan trọng, thêm 1 emoji nổi bật ở đầu (💥, 🔥, ⚡, 😱, 👑).

RULES FOR THUMBNAIL TEXT (thumbnailTexts):
Each thumbnail text MUST consist of 2 lines. Each line MUST be long and detailed, approximately 7 to 8 words per line (Dùng 7 đến 8 từ mỗi dòng, viết HOA, kịch tính, giật gân, cuốn hút).
Example:
Line 1: "TỔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIỀN CỔ KHỞI ĐẦU BÁ ĐẠO" (8 từ)
Line 2: "TOÀN GIA BỊ TỐNG VÀO NGỤC TỐC MẠNG NGƯỜI NHƯ CỎ RÁC" (8 từ)

REQUIRED JSON SCHEMA:
{
  "titles": [
    "💥 Bắt Ta Đi Luyện Tà Công, Ai Ngờ Tác Dụng Phụ Lại Rơi Hết Vào Đầu Kẻ Thù!",
    "🔥 Ta Càng Chăm Chỉ Đột Phá, Cả Tông Môn Lại Càng... Hộc Máu Đau Đớn!",
    "⚡ Cứ Nghĩ Ta Là Gã Đầy Tớ Vô Dụng, Cho Đến Khi Ta Rút Kiếm Chém Đứt Thiên Kiếp!",
    "👑 Vừa Trùng Sinh Liền Bị Nữ Đế Ép Cưới, Không Ngờ Ta Lại Là Ma Tôn Thượng Cổ!",
    "😱 Tưởng Ta Hết Linh Lực Liền Muốn Trả Thù, Kết Cục Cả Gia Tộc Phải Quỳ Xin Tha!"
  ],
  "thumbnailTexts": [
    { 
      "line1": "TỔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIỀN CỔ KHỞI ĐẦU BÁ ĐẠO", 
      "line2": "TOÀN GIA BỊ TỐNG VÀO NGỤC TỐC MẠNG NGƯỜI NHƯ CỎ RÁC" 
    },
    { 
      "line1": "ĐỘT PHÁ KIM ĐAN KỲ VÔ THƯỢNG NĂNG LƯỢNG TIÊN TÔNG", 
      "line2": "TRẢ THÙ DIỆT SẠCH CẢ TÔNG MÔN PHẢN BỘI TẬP THỂ" 
    },
    { 
      "line1": "CHIẾN THẦN TRÙNG SINH NẮM GIỮ HỆ THỐNG BÁ ĐẠO VƯƠNG TRIỀU", 
      "line2": "MỘT TAY CHE TRỜI SAN BẰNG MỌI CƯỜNG ĐỊCH TÔNG MÔN" 
    }
  ],
  "imagePromptEn": "Detailed 16:9 Midjourney/Flux prompt with character, aura, lighting, 8k --ar 16:9",
  "imagePromptVi": "Mô tả ý tưởng ảnh bằng tiếng Việt",
  "description": "Mô tả video YouTube chi tiết",
  "tags": "tu tiên, tóm tắt phim, review phim, xuyên không"
}`;

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}
TẬP PHIM: ${fileNames}

NỘI DUNG PHỤ ĐỀ PHIM (TRÍCH ĐOẠN):
${sampledText.substring(0, 5000)}

HÃY XUẤT 1 ĐOẠN JSON HOÀN CHỈNH VỚI CHỮ THUMBNAIL 2 DÒNG DÀI NỔI BẬT (ĐÚNG 7 TỚI 8 TỪ MỖI DÒNG):`;

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
