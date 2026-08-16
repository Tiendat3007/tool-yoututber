// YouTube Metadata & Thumbnail Prompt AI Engine (Bulletproof JSON Parsing)

function safeParseAIJson(rawText) {
  if (!rawText) return null;

  // 1. Strip markdown code blocks
  let cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // 2. Extract object bounded by first '{' and last '}'
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // 3. Direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // 4. Sanitize trailing commas and control characters inside string literals
    try {
      const sanitized = cleaned
        .replace(/,\s*([\}\]])/g, '$1') // Fix trailing commas
        .replace(/\n/g, '\\n')           // Escape raw newlines
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return JSON.parse(sanitized);
    } catch (e2) {
      console.warn('JSON Repair Attempt 1 failed:', e2);
    }

    // 5. Advanced string literal repair
    try {
      const sanitized2 = cleaned
        .replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, (str) => {
          return str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        })
        .replace(/,\s*([\}\]])/g, '$1');
      return JSON.parse(sanitized2);
    } catch (e3) {
      console.warn('JSON Repair Attempt 2 failed:', e3);
    }
  }

  // 6. Regex Fallback Extractor if JSON structure is severely broken
  try {
    const titles = [];
    const titleRegex = /"titles"\s*:\s*\[([\s\S]*?)\]/i;
    const titleMatch = rawText.match(titleRegex);
    if (titleMatch) {
      const matches = titleMatch[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
      if (matches) {
        matches.forEach(m => titles.push(m.replace(/^"|"$/g, '').replace(/\\"/g, '"')));
      }
    }

    const descMatch = rawText.match(/"description"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/i);
    const promptEnMatch = rawText.match(/"imagePromptEn"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/i);
    const promptViMatch = rawText.match(/"imagePromptVi"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/i);
    const tagsMatch = rawText.match(/"tags"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/i);

    if (titles.length > 0) {
      return {
        titles,
        thumbnailTexts: [
          { line1: 'TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ', line2: 'TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC' }
        ],
        imagePromptEn: promptEnMatch ? promptEnMatch[1].replace(/\\n/g, '\n') : '',
        imagePromptVi: promptViMatch ? promptViMatch[1].replace(/\\n/g, '\n') : '',
        description: descMatch ? descMatch[1].replace(/\\n/g, '\n') : '',
        tags: tagsMatch ? tagsMatch[1] : ''
      };
    }
  } catch (e4) {
    console.error('Regex Fallback Extractor failed:', e4);
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

  const systemPrompt = `You are a World-Class YouTube Growth Expert and AI Prompt Engineer.
YOUR TASK: Analyze the movie transcript and output ONLY a raw JSON object (NO markdown, NO intro, NO outro).

CRITICAL FORMAT REQUIREMENT:
Return ONLY a valid JSON object matching this schema. All string values MUST escape quotes and newlines:
{
  "titles": [
    "Tiêu đề 1 (Giật gân, chuẩn SEO Tu Tiên)",
    "Tiêu đề 2 (Gây tò mò kịch tính)",
    "Tiêu đề 3 (Bá đạo, phong cách review)",
    "Tiêu đề 4 (Tiêu đề ngắn 50 ký tự chuẩn CTR)",
    "Tiêu đề 5 (Bí mật nhân vật chính)"
  ],
  "thumbnailTexts": [
    {
      "line1": "TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ",
      "line2": "TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC"
    },
    {
      "line1": "ĐỘT PHÁ KIM ĐAN KỲ VÔ THƯỢNG NĂNG LƯỢNG",
      "line2": "TRẢ THÙ DIỆT SẠCH CẢ TÔNG MÔN PHẢN BỘI"
    },
    {
      "line1": "MẠNG NGƯỜI NHƯ CỎ RÁC TẠI ĐẠI ĐƯỜNG VƯƠNG TRIỀU",
      "line2": "VỪA MỞ MẮT GẶP ĐỈNH CẤP ĐẠI YÊU VƯƠNG"
    }
  ],
  "imagePromptEn": "Detailed Midjourney/Flux prompt with character armor, glowing eyes, magic aura, ancient Chinese background, octane render 8k --ar 16:9",
  "imagePromptVi": "Mô tả ý tưởng ảnh Thumbnail tiếng Việt",
  "description": "Mô tả video YouTube hoàn chỉnh",
  "tags": "tu tiên, phim tiên hiệp, xuyên không, review phim..."
}`;

  const userMessage = `GENRE: ${genre}\nCONTENT TYPE: ${contentType}\nFILES ANALYZED: ${fileNames}\n\nHÃY PHÂN TÍCH TỔNG HỢP VÀ XUẤT NGUYÊN BẢN 1 CẤU TRÚC JSON ĐÚNG CÚ PHÁP:\n\n${sampledText.substring(0, 5000)}`;

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

    // Enable JSON response format for OpenAI/Gemini models if supported
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
    throw new Error('Không thể phân tích cấu trúc JSON từ kết quả AI trả về. Vui lòng thử lại!');
  }

  // Normalize thumbnailTexts to array of { line1, line2 }
  let formattedTexts = [];
  if (Array.isArray(parsed.thumbnailTexts)) {
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
    titles: Array.isArray(parsed.titles) ? parsed.titles : [parsed.title || 'Tiêu đề Phim Tu Tiên'],
    thumbnailTexts: formattedTexts,
    imagePromptEn: parsed.imagePromptEn || parsed.prompt || '',
    imagePromptVi: parsed.imagePromptVi || '',
    description: parsed.description || '',
    tags: parsed.tags || ''
  };
}
