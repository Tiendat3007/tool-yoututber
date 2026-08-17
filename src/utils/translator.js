// Translation Engine: Master Tu Tiên - Huyền Huyễn - Xuyên Không Script Integration

export function applyGlossary(text, glossary) {
  if (!text) return '';
  let result = text;

  // Filter enabled terms and sort by length descending to prevent substring collision
  const activeTerms = (glossary || [])
    .filter(g => g.enabled && g.zh && g.vi)
    .sort((a, b) => b.zh.length - a.zh.length);

  activeTerms.forEach(item => {
    // Escaping special characters for regex
    const escaped = item.zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    result = result.replace(regex, item.vi);
  });

  return result;
}

export function applyPronounRules(text, rules) {
  if (!text || !rules || rules.length === 0) return text;
  let result = text;

  rules.forEach(rule => {
    if (rule.from && rule.to) {
      result = result.replace(rule.from, rule.to);
    }
  });

  return result;
}

export function localTranslateLine(originalText, glossary, activePronounRules = []) {
  let text = originalText;
  
  // Step 1: Apply Tu Tiên glossary term replacements
  text = applyGlossary(text, glossary);

  // Step 2: Apply Pronoun Preset
  if (activePronounRules && activePronounRules.length > 0) {
    text = applyPronounRules(text, activePronounRules);
  }

  return text;
}

// Master System Prompt generator enforcing 46 Tu Tien rules + JSON spec
// Filter active glossary terms that actually appear in this batch of subtitles, plus top high-frequency terms
export function extractRelevantGlossary(subtitles = [], glossary = []) {
  const combinedText = (subtitles || []).map(s => s.originalText || '').join(' ');
  const activeTerms = (glossary || []).filter(g => g.enabled && g.zh && g.vi);

  const relevantDict = {};
  let count = 0;

  // 1. First priority: terms directly present in current subtitle lines
  activeTerms.forEach(g => {
    if (combinedText.includes(g.zh)) {
      relevantDict[g.zh] = g.vi;
      count++;
    }
  });

  // 2. Second priority: if fewer than 40 terms matched, add important high-priority terms
  if (count < 40) {
    for (const g of activeTerms) {
      if (!relevantDict[g.zh]) {
        relevantDict[g.zh] = g.vi;
        count++;
        if (count >= 50) break;
      }
    }
  }

  return relevantDict;
}

// Master System Prompt generator enforcing Tu Tien rules + JSON glossary spec
export function buildSystemPrompt(glossary = [], customPrompt = '', relevantGlossary = null) {
  const glossaryDict = relevantGlossary || extractRelevantGlossary([], glossary);
  const termsJsonString = JSON.stringify(glossaryDict, null, 2);

  const masterPrompt = `You are an automated Data Processing & Localization Engine for video subtitle software.
Your task is to process Chinese/Vietnamese subtitle input data and translate/re-edit each item into fluent Vietnamese Xianxia/Tu Tien ancient style text.
Output MUST be a pure JSON array: [{"id": 1, "translatedText": "..."}].

BẮT BUỘC TUÂN THỦ QUY TẮC CỐT LÕI (DỊCH SANG TIẾNG VIỆT CỔ TRANG TU TIÊN):

1. BẢNG TỪ ĐIỂN JSON GLOSSARY BẮT BUỘC (QUAN TRỌNG NHẤT):
   - Khi dịch câu thoại, nếu gặp bất kỳ thuật ngữ, danh xưng, cảnh giới hoặc tên riêng nào có trong "glossary_dict" bên dưới, BẮT BUỘC 100% phải dịch chính xác sang từ tiếng Việt đã chỉ định trong JSON.
   - TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý ĐỔI TỪ HOẶC DÙNG TỪ ĐỒNG NGHĨA KHÁC.
   BẢNG JSON GLOSSARY:
   ${termsJsonString}

2. XƯNG HÔ & TÊN: 
   - Đặt theo vị trí: [Tên + Danh xưng] (VD: 苏师兄 -> Tô sư huynh, 林师姐 -> Lâm sư tỷ, 叶前辈 -> Diệp tiền bối, 陈长老 -> Trần trưởng lão, 王宗主 -> Vương tông chủ). CẤM đảo thành "Sư huynh Tô", "Sư tỷ Lâm".
   - 师尊 -> sư tôn, 师父 -> sư phụ, 前辈 -> tiền bối, 晚辈 -> vãn bối, 道友 -> đạo hữu, 阁下 -> các hạ.
   - Đại từ quyền uy: 本座 -> bổn tọa, 本尊 -> bổn tôn, 本帝 -> bổn đế, 本王 -> bổn vương. KHÔNG dịch thành "tôi".
   - Nam nhân dùng "hắn/y", nữ nhân dùng "nàng", KHÔNG dịch 他 thành "anh ấy" trong bối cảnh cổ trang.

3. CẢNH GIỚI TU LUYỆN: 
   - 炼气(Luyện Khí), 筑基(Trúc Cơ), 金丹(Kim Đan), 元婴(Nguyên Anh), 化神(Hóa Thần), 炼虚(Luyện Hư), 合体(Hợp Thể), 大乘(Đại Thừa), 渡劫(Độ Kiếp).
   - Cấp bậc: 初期(sơ kỳ), 中期(trung kỳ), 后期(hậu kỳ), 巅峰(đỉnh phong), 圆满(viên mãn). VD: 化神巅峰 -> Hóa Thần đỉnh phong.
   - 突破 -> đột phá, 越级挑战 -> vượt cấp khiêu chiến.

4. KHÁI NIỆM TU TIÊN & TẢI TÀI NGUYÊN:
   - 功法(công pháp), 武技(võ kỹ), 秘术(bí thuật), 神通(thần thông), 心法(tâm pháp).
   - 法宝(pháp bảo), 灵器(linh khí), 仙器(tiên khí), 飞剑(phi kiếm).
   - 丹药(đan dược), 筑基丹(Trúc Cơ Đan), 灵石(linh thạch), 天材地宝(thiên tài địa bảo).
   - 宗门(tông môn), 宗主(tông chủ), 太上长老(thái thượng trưởng lão), 掌门(chưởng môn).

5. NGHĨA SÂU SẮC & KHẨU NGỮ:
   - 蝼蚁 -> "sâu kiến" (KHÔNG dịch con kiến), 找死 -> "tìm chết" / "muốn chết sao?", 不自量力 -> "không biết tự lượng sức".
   - 穿越 -> xuyên không, 重生 -> trọng sinh, 转世 -> chuyển thế, 夺舍 -> đoạt xá.
   - Hệ thống: 系统 -> hệ thống, 宿主 -> ký chủ, 任务 -> nhiệm vụ, 奖励 -> phần thưởng, 恭喜宿主 -> Chúc mừng ký chủ.

6. NGUYÊN TẮC FORMAT ĐẦU RA: 
   - GIỮ NGUYÊN số ID dòng phụ đề.
   - Trả về BẮT BUỘC duy nhất định dạng JSON Array: [{"id": 1, "translatedText": "..."}, ...]. KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO NGOÀI JSON ARRAY.`;

  return customPrompt || masterPrompt;
}

// Helper to safely parse JSON array from any model response
function parseJSONArrayFromText(rawText) {
  if (!rawText) return [];

  // Try extracting json code block
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let textToParse = codeBlockMatch ? codeBlockMatch[1] : rawText;

  // Try extracting JSON array pattern [...]
  const arrayMatch = textToParse.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    textToParse = arrayMatch[0];
  } else {
    // If output is wrapped in an object like { "subtitles": [...] } or { "translations": [...] }
    const objMatch = textToParse.match(/"(?:subtitles|translations|results|data)"\s*:\s*(\[\s*\{[\s\S]*\}\s*\])/i);
    if (objMatch) {
      textToParse = objMatch[1];
    }
  }

  try {
    const res = JSON.parse(textToParse.trim());
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.subtitles)) return res.subtitles;
    if (res && Array.isArray(res.translations)) return res.translations;
    return [];
  } catch (e) {
    // Attempt relaxed cleanup for trailing commas
    try {
      const cleaned = textToParse.replace(/,\s*([\]}])/g, '$1').trim();
      const res = JSON.parse(cleaned);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.subtitles)) return res.subtitles;
      if (res && Array.isArray(res.translations)) return res.translations;
      return [];
    } catch (e2) {
      // If AI returned conversational refusal text
      if (rawText.toLowerCase().includes('không thể') || rawText.toLowerCase().includes('cannot') || rawText.toLowerCase().includes('software engineering') || rawText.toLowerCase().includes('clarify')) {
        throw new Error(`Mô hình trên Orimise hiện được cấu hình kèm Persona CLI nên hay trả về câu từ chối. Vui lòng chọn mô hình "gemini-2.5-flash" hoặc "claude-sonnet-5" trong Cấu Hình AI để dịch mượt 100%!`);
      }
      throw new Error(`Kết quả từ AI không đúng định dạng JSON array. Nội dung nhận được: "${rawText.substring(0, 100)}..."`);
    }
  }
}


// Orimise API Translator (OpenAI Compatible Format)
export async function translateBatchWithOrimise({
  subtitles,
  apiKey,
  baseUrl = 'https://api.orimise.com/v1',
  systemPrompt,
  glossary = [],
  model = 'gemini-2.5-flash'
}) {
  if (!apiKey) {
    throw new Error('Chưa nhập Orimise API Key!');
  }

  const relevantGlossary = extractRelevantGlossary(subtitles, glossary);
  const finalSystemPrompt = buildSystemPrompt(glossary, systemPrompt, relevantGlossary);

  const inputPayload = subtitles.map(sub => ({
    id: sub.index,
    text: sub.originalText
  }));

  const userContent = `BẢNG TỪ ĐIỂN JSON GLOSSARY BẮT BUỘC DÙNG KHI DỊCH:
${JSON.stringify(relevantGlossary, null, 2)}

DANH SÁCH PHỤ ĐỀ CẦN DỊCH SANG TIẾNG VIỆT TU TIÊN (Xuất duy nhất JSON array [{"id": 1, "translatedText": "..."}]):
${JSON.stringify(inputPayload, null, 2)}`;

  const endpoint = baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const requestBody = {
    model: model,
    messages: [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `Lỗi Orimise API HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error('Orimise API không trả về nội dung.');
  }

  try {
    const parsedResults = parseJSONArrayFromText(rawText);
    const resultMap = new Map();
    if (Array.isArray(parsedResults)) {
      parsedResults.forEach(item => {
        const transText = item.translatedText || item.translation || item.text_vi || item.vi;
        if (item.id && transText) {
          resultMap.set(item.id, transText);
        }
      });
    }
    return resultMap;
  } catch (err) {
    console.error("Orimise JSON Parse error:", err, rawText);
    throw new Error(err.message || 'Không thể đọc kết quả trả về từ Orimise AI (Định dạng JSON không hợp lệ).');
  }
}

// Google Gemini API Translator
export async function translateBatchWithGemini({
  subtitles,
  apiKey,
  systemPrompt,
  glossary = [],
  model = 'gemini-2.5-flash'
}) {
  if (!apiKey) {
    throw new Error('Chưa nhập Google Gemini API Key!');
  }

  const relevantGlossary = extractRelevantGlossary(subtitles, glossary);
  const finalSystemPrompt = buildSystemPrompt(glossary, systemPrompt, relevantGlossary);

  const inputPayload = subtitles.map(sub => ({
    id: sub.index,
    text: sub.originalText
  }));

  const userContent = `BẢNG TỪ ĐIỂN JSON GLOSSARY BẮT BUỘC DÙNG KHI DỊCH:
${JSON.stringify(relevantGlossary, null, 2)}

DANH SÁCH PHỤ ĐỀ CẦN DỊCH SANG TIẾNG VIỆT TU TIÊN (Xuất duy nhất JSON array [{"id": 1, "translatedText": "..."}]):
${JSON.stringify(inputPayload, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${finalSystemPrompt}\n\n${userContent}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `Lỗi API Gemini HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('API Gemini không trả về dữ liệu.');
  }

  try {
    const parsedResults = parseJSONArrayFromText(rawText);
    const resultMap = new Map();
    if (Array.isArray(parsedResults)) {
      parsedResults.forEach(item => {
        const transText = item.translatedText || item.translation || item.text_vi || item.vi;
        if (item.id && transText) {
          resultMap.set(item.id, transText);
        }
      });
    }
    return resultMap;
  } catch (err) {
    console.error("Gemini JSON Parse error:", err, rawText);
    throw new Error(err.message || 'Không thể đọc kết quả trả về từ Gemini AI (Định dạng JSON không hợp lệ).');
  }
}

