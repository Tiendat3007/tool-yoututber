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

2. LIÊN KẾT MẠCH TRUYỆN & NGỮ CẢNH LIỀN TRƯỚC (CONTEXT-AWARE):
   - Trong mỗi khối phụ đề gửi đến có kèm mục "NGỮ CẢNH CÂU THOẠI LIỀN TRƯỚC".
   - BẮT BUỘC đọc ngữ cảnh trước để xác định rõ ai đang nói với ai, quan hệ nhân vật (sư đồ, kẻ thù, đạo lữ, tôn chủ - thuộc hạ) nhằm giữ ĐẠI TỪ XƯNG HÔ (ta - ngươi, hắn - nàng, bổn tọa, tiền bối, sư tôn) ĐỒNG NHẤT 100% xuyên suốt các khối.
   - TUYỆT ĐỐI KHÔNG dịch các câu trong phần ngữ cảnh liền trước, CHỈ DỊCH các câu trong "DANH SÁCH PHỤ ĐỀ MỤC TIÊU".

3. XƯNG HÔ & TÊN: 
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
  contextSubtitles = [],
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

  let contextBlock = '';
  if (contextSubtitles && contextSubtitles.length > 0) {
    const contextItems = contextSubtitles.map(s => `[Dòng ${s.index}]: ${s.translatedText || s.originalText}`).join('\n');
    contextBlock = `NGỮ CẢNH CÂU THOẠI LIỀN TRƯỚC (Dùng để hiểu mạch truyện & giữ nhất quán xưng hô đại từ, TUYỆT ĐỐI KHÔNG DỊCH LẠI CÁC CÂU NÀY):\n${contextItems}\n\n`;
  }

  const userContent = `BẢNG TỪ ĐIỂN JSON GLOSSARY BẮT BUỘC DÙNG KHI DỊCH:
${JSON.stringify(relevantGlossary, null, 2)}

${contextBlock}DANH SÁCH PHỤ ĐỀ MỤC TIÊU CẦN DỊCH (Xuất duy nhất JSON array [{"id": 1, "translatedText": "..."}]):
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
  contextSubtitles = [],
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

  let contextBlock = '';
  if (contextSubtitles && contextSubtitles.length > 0) {
    const contextItems = contextSubtitles.map(s => `[Dòng ${s.index}]: ${s.translatedText || s.originalText}`).join('\n');
    contextBlock = `NGỮ CẢNH CÂU THOẠI LIỀN TRƯỚC (Dùng để hiểu mạch truyện & giữ nhất quán xưng hô đại từ, TUYỆT ĐỐI KHÔNG DỊCH LẠI CÁC CÂU NÀY):\n${contextItems}\n\n`;
  }

  const userContent = `BẢNG TỪ ĐIỂN JSON GLOSSARY BẮT BUỘC DÙNG KHI DỊCH:
${JSON.stringify(relevantGlossary, null, 2)}

${contextBlock}DANH SÁCH PHỤ ĐỀ MỤC TIÊU CẦN DỊCH (Xuất duy nhất JSON array [{"id": 1, "translatedText": "..."}]):
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

/**
 * ⚡ Helper translating a single chunk with up to 3 automatic retries and fallback subdivision
 */
async function translateChunkWithResilience({
  chunk,
  contextSubtitles,
  isOrimise,
  apiKey,
  baseUrl,
  systemPrompt,
  glossary,
  model,
  retryCount = 0
}) {
  const maxRetries = 3;
  try {
    if (isOrimise) {
      return await translateBatchWithOrimise({
        subtitles: chunk,
        contextSubtitles,
        apiKey,
        baseUrl,
        systemPrompt,
        glossary,
        model
      });
    } else {
      return await translateBatchWithGemini({
        subtitles: chunk,
        contextSubtitles,
        apiKey,
        systemPrompt,
        glossary,
        model
      });
    }
  } catch (err) {
    if (retryCount < maxRetries) {
      const delayMs = (retryCount + 1) * 1500;
      console.warn(`[Auto-Retry] Khối dịch gặp lỗi "${err.message}". Đang tự động thử lại lần ${retryCount + 1}/${maxRetries} sau ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));

      return await translateChunkWithResilience({
        chunk,
        contextSubtitles,
        isOrimise,
        apiKey,
        baseUrl,
        systemPrompt,
        glossary,
        model,
        retryCount: retryCount + 1
      });
    }

    // Fallback: If 3 retries failed and chunk has more than 5 lines, split in half
    if (chunk.length > 5) {
      console.warn(`[Auto-Split Fallback] Chia nhỏ khối ${chunk.length} dòng thành 2 nửa để giải quyết lỗi Bad Request...`);
      const mid = Math.floor(chunk.length / 2);
      const half1 = chunk.slice(0, mid);
      const half2 = chunk.slice(mid);

      const map1 = await translateChunkWithResilience({
        chunk: half1,
        contextSubtitles,
        isOrimise,
        apiKey,
        baseUrl,
        systemPrompt,
        glossary,
        model,
        retryCount: 0
      });

      const map2 = await translateChunkWithResilience({
        chunk: half2,
        contextSubtitles: half1,
        isOrimise,
        apiKey,
        baseUrl,
        systemPrompt,
        glossary,
        model,
        retryCount: 0
      });

      const combinedMap = new Map();
      map1.forEach((val, key) => combinedMap.set(key, val));
      map2.forEach((val, key) => combinedMap.set(key, val));
      return combinedMap;
    }

    throw err;
  }
}

/**
 * ⚡ TURBO MULTI-THREADING TRANSLATION ENGINE (CONTEXT-AWARE & AUTO-RETRY RESILIENT)
 * Breaks subtitles into optimized batches with sliding context window and executes concurrent worker threads.
 */
export async function translateSubtitlesWithThreadPool({
  subtitles,
  isOrimise,
  apiKey,
  baseUrl,
  systemPrompt,
  glossary,
  model,
  batchSize = 25,
  concurrency = 4,
  onProgress // (completedChunks, totalChunks, completedLines, totalLines, currentStatus) => void
}) {
  if (!subtitles || subtitles.length === 0) return new Map();

  // 1. Break subtitles into chunks with their context lines
  const chunkObjects = [];
  for (let i = 0; i < subtitles.length; i += batchSize) {
    const chunk = subtitles.slice(i, i + batchSize);
    const contextSubtitles = i > 0
      ? subtitles.slice(Math.max(0, i - 3), i)
      : [];

    chunkObjects.push({
      chunk,
      contextSubtitles,
      startIndex: i
    });
  }

  const totalChunks = chunkObjects.length;
  let completedChunks = 0;
  const resultMap = new Map();

  // 2. Worker Queue
  let chunkQueueIndex = 0;

  async function worker(workerId) {
    while (chunkQueueIndex < chunkObjects.length) {
      const currentIdx = chunkQueueIndex++;
      const { chunk, contextSubtitles } = chunkObjects[currentIdx];

      try {
        const chunkResultMap = await translateChunkWithResilience({
          chunk,
          contextSubtitles,
          isOrimise,
          apiKey,
          baseUrl,
          systemPrompt,
          glossary,
          model
        });

        if (chunkResultMap) {
          chunkResultMap.forEach((val, key) => resultMap.set(key, val));
        }
      } catch (fatalErr) {
        console.error(`[Worker ${workerId}] Khối ${currentIdx + 1} không thể dịch sau nhiều lần thử:`, fatalErr);
      } finally {
        completedChunks++;
        if (onProgress) {
          onProgress(
            completedChunks,
            totalChunks,
            Math.min(completedChunks * batchSize, subtitles.length),
            subtitles.length
          );
        }
      }
    }
  }

  // 3. Launch pool of parallel workers
  const numWorkers = Math.min(Math.max(1, concurrency), chunkObjects.length);
  const workers = Array.from({ length: numWorkers }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  return resultMap;
}


