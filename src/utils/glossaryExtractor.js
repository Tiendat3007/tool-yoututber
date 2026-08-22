// AI Auto-Glossary Extractor from Subtitles

/**
 * Scans subtitle texts from a single file or entire series to automatically discover:
 * - Character names (Tên nhân vật)
 * - Sect / Faction / Clan names (Tông môn / Gia tộc)
 * - Cultivation realms & ranks (Cảnh giới / Cấp bậc)
 * - Martial arts / Skills / Techniques (Công pháp / Võ kỹ / Bí thuật)
 * - Artifacts / Pills / Special herbs (Pháp bảo / Đan dược / Thiên tài địa bảo)
 * - Special terms / Chinese idioms (Thuật ngữ / Thành ngữ riêng)
 */
export async function extractNewGlossaryTermsWithAI({
  subtitles = [],
  existingGlossary = [],
  aiProvider = 'orimise',
  apiKey,
  baseUrl = 'https://api.orimise.com/v1',
  model = 'gemini-2.5-flash'
}) {
  if (!apiKey) {
    throw new Error(`Vui lòng nhập ${aiProvider === 'orimise' ? 'Orimise' : 'Google Gemini'} API Key trong menu Cấu hình AI!`);
  }

  if (!subtitles || subtitles.length === 0) {
    throw new Error('Chưa có dữ liệu phụ đề để quét thuật ngữ.');
  }

  // Sample or collect original text (up to 300 representative lines to ensure fast & deep scanning)
  const sampleLines = subtitles.slice(0, 300).map(s => s.originalText || '').filter(Boolean);
  const textCorpus = sampleLines.join('\n');

  // Build existing glossary lookup set to filter out already known terms
  const existingSet = new Set(
    (existingGlossary || []).map(g => (g.zh || '').trim().toLowerCase())
  );

  const systemPrompt = `You are a Senior Xianxia / Ancient Chinese Localization Lexicographer & NLP Glossary Specialist.
Your task is to scan the provided Chinese subtitle corpus and extract ALL important novel terms, character names, sects, cultivation realms, martial skills, pills, and artifacts that SHOULD BE ADDED to the Tu Tiên Hán Việt Glossary.

OUTPUT REQUIREMENT:
Output ONLY a pure JSON array:
[
  {
    "zh": "Tiếng Trung gốc",
    "vi": "Tiếng Việt Hán Việt chuẩn xác",
    "category": "Tên nhân vật | Tông môn | Cảnh giới | Công pháp | Đan dược & Pháp bảo | Danh xưng & Khác",
    "meaning": "Giải nghĩa ngắn gọn vai trò / bối cảnh"
  }
]

QUY TẮC PHÂN TÍCH:
1. Trích xuất đúng tên tiếng Trung nguyên bản (zh) và phiên âm Hán Việt chuẩn, mượt mà (vi).
2. Phân loại đúng category: "Tên nhân vật", "Tông môn", "Cảnh giới", "Công pháp", "Đan dược & Pháp bảo", "Danh xưng & Khác".
3. Trả về tối thiểu 8 đến 25 thuật ngữ đặc trưng nhất của bộ phim.
4. BẮT BUỘC chỉ trả về JSON Array, không thêm bất kỳ văn bản giải thích nào khác.`;

  const userPrompt = `DANH SÁCH CÂU THOẠI TRONG PHIM ĐỂ QUÉT THUẬT NGỮ:
${textCorpus.substring(0, 8000)}`;

  let rawContent = '';

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Lỗi Orimise API HTTP ${response.status}`);
    }

    const data = await response.json();
    rawContent = data.choices?.[0]?.message?.content || '';
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
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
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
    rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // Parse JSON
  const codeBlockMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const textToParse = codeBlockMatch ? codeBlockMatch[1] : rawContent;

  let parsedList = [];
  try {
    const arrayMatch = textToParse.match(/\[\s*\{[\s\S]*\}\s*\]/);
    parsedList = JSON.parse(arrayMatch ? arrayMatch[0] : textToParse.trim());
  } catch (e) {
    // Regex fallback
    const itemRegex = /\{\s*"zh"\s*:\s*"([^"]+)"\s*,\s*"vi"\s*:\s*"([^"]+)"(?:\s*,\s*"category"\s*:\s*"([^"]+)")?(?:\s*,\s*"meaning"\s*:\s*"([^"]+)")?\s*\}/gi;
    let m;
    while ((m = itemRegex.exec(rawContent)) !== null) {
      parsedList.push({
        zh: m[1],
        vi: m[2],
        category: m[3] || 'Danh xưng & Khác',
        meaning: m[4] || ''
      });
    }
  }

  if (!Array.isArray(parsedList) || parsedList.length === 0) {
    throw new Error('AI không tìm thấy thuật ngữ mới nào đặc biệt trong đoạn phụ đề này.');
  }

  // Filter out terms that already exist in the glossary
  const newTerms = parsedList.filter(item => {
    if (!item.zh || !item.vi) return false;
    const cleanZh = item.zh.trim().toLowerCase();
    return !existingSet.has(cleanZh);
  });

  return newTerms.map((t, idx) => ({
    id: `term_ai_${Date.now()}_${idx}`,
    zh: t.zh.trim(),
    vi: t.vi.trim(),
    category: t.category || 'Danh xưng & Khác',
    meaning: t.meaning || '',
    enabled: true
  }));
}
