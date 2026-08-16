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

  const systemPrompt = `You are a World-Class YouTube Marketing Specialist.
Task: Analyze the film transcript and generate a high-CTR YouTube Publishing Pack in Vietnamese.
Rules:
1. Output ONLY a valid JSON object. No explanation, no markdown text outside JSON.
2. Escape all quotes inside strings. Do NOT use unescaped newlines inside strings.

REQUIRED JSON SCHEMA:
{
  "titles": [
    "Tiêu đề 1 cuốn hút SEO",
    "Tiêu đề 2 kịch tính tò mò",
    "Tiêu đề 3 bá đạo tóm tắt",
    "Tiêu đề 4 CTR ngắn gọn",
    "Tiêu đề 5 bí mật nhân vật"
  ],
  "thumbnailTexts": [
    { "line1": "DÒNG 1 CHỮ VÀNG 3D", "line2": "DÒNG 2 CHỮ XANH 3D" },
    { "line1": "DÒNG 1 KỊCH TÍNH THỨ 2", "line2": "DÒNG 2 BIẾN CỐ THỨ 2" },
    { "line1": "DÒNG 1 KỊCH TÍNH THỨ 3", "line2": "DÒNG 2 BIẾN CỐ THỨ 3" }
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

HÃY XUẤT 1 ĐOẠN JSON HOÀN CHỈNH THEO SCHEMA TRÊN:`;

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
          line1: t.line1 || t.line_1 || 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ',
          line2: t.line2 || t.line_2 || 'TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC'
        };
      } else if (typeof t === 'string') {
        const parts = t.split(/[\n|]/);
        return {
          line1: parts[0]?.trim() || t,
          line2: parts[1]?.trim() || ''
        };
      }
      return { line1: 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ', line2: '' };
    });
  } else {
    formattedTexts = [
      { line1: 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ', line2: 'TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC' }
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
