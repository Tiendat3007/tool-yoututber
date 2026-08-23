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
  characterReferences = [],
  genre = 'Tu Tiên / Tiên Hiệp',
  contentType = 'Review Phim / Tóm Tắt Phim',
  customPrompt = '',
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

  let charRefContext = '';
  if (Array.isArray(characterReferences) && characterReferences.length > 0) {
    charRefContext = `\n=== 👥 DANH SÁCH NHÂN VẬT THAM CHIẾU TỪ PHIM (${characterReferences.length} nhân vật): ===\n` +
      characterReferences.map((c, i) => {
        const info = [
          c.name ? `Tên: ${c.name}` : '',
          c.role ? `Thân phận: ${c.role}` : '',
          c.sect ? `Môn phái: ${c.sect}` : '',
          c.realm ? `Cảnh giới: ${c.realm}` : '',
          c.note ? `Ghi chú: ${c.note}` : ''
        ].filter(Boolean).join(' | ');
        return `[Nhân vật #${i + 1}] ${info}`;
      }).join('\n') +
      `\n=> YÊU CẦU: Hãy soi kỹ các ảnh tham chiếu đính kèm và mô tả chính xác ngoại hình, kiểu tóc, y phục, thần khí và vũ khí của các nhân vật trên vào Prompt Midjourney/Flux!\n`;
  }

  const systemPrompt = `You are an Elite YouTube Creative Director & Viral Content Strategist specializing in Review Truyện Tranh / Manhua / Donghua 3D / Phim Tu Tiên.

QUY TRÌNH 2 BƯỚC BẮT BUỘC KHI XỬ LÝ DỮ LIỆU:

BƯỚC 1: ĐỌC VÀ HIỂU TRỌN VẸN 100% CỐT TRUYỆN TỪ ĐẦU ĐẾN CUỐI & ẢNH THAM CHIẾU
- Đọc kỹ toàn bộ từng câu thoại trong tất cả các tập phim SRT được cung cấp bên dưới (không bỏ sót tình tiết nào).
- Soi kỹ các ảnh tham chiếu nhân vật (nếu có) để nắm rõ diện mạo, y phục, thần kiếm, pháp bảo.
- Nắm rõ: Nhân vật chính là ai, khởi đầu từ nghịch cảnh nào (bị phế, hủy hôn, đuổi khỏi tông môn, trọng sinh, xuyên không...)?
- Xuất hiện công pháp, bảo vật hay cơ duyên gì?
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
     + Tiêu đề #3: Góc độ Thần kiếm / Bảo vật vô địch.
     + Tiêu đề #4: Góc độ Tu La / Ma Đạo / Bá vương giáng thế.
     + Tiêu đề #5: Góc độ Đột phá cảnh giới / Quét sạch vạn giới.

3. 5 MẪU CHỮ THUMBNAIL 2 DÒNG TƯƠNG ỨNG 1-1 VỚI TỪNG TIÊU ĐỀ ĐÓ (thumbnailTexts):
   - BẮT BUỘC TẠO ĐỦ 5 MẪU CHỮ THUMBNAIL KHỚP CHÍNH XÁC VỚI 5 TIÊU ĐỀ TRÊN:
     + Mẫu #1 tương ứng và bổ trợ cho Tiêu đề #1.
     + Mẫu #2 tương ứng và bổ trợ cho Tiêu đề #2.
     + Mẫu #3 tương ứng và bổ trợ cho Tiêu đề #3.
     + Mẫu #4 tương ứng và bổ trợ cho Tiêu đề #4.
     + Mẫu #5 tương ứng và bổ trợ cho Tiêu đề #5.
   - Mỗi mẫu gồm 2 dòng:
     * Dòng 1 (line1): 7–10 từ, IN HOA TOÀN BỘ, tạo nghịch cảnh tột cùng hoặc câu hỏi kích thích trí tò mò cực độ (VD: "TÔ SƯ HUYNH XUYÊN KHÔNG...", "BỊ TÔNG MÔN TRỤC XUẤT...").
     * Dòng 2 (line2): 7–10 từ, IN HOA TOÀN BỘ, cú twist vả mặt hoặc kết quả bá đạo rung chuyển trời đất (VD: "LIỀN THỨC TỈNH THẦN THÔNG VÔ ĐỊCH!", "MỘT KIẾM CHÉM DIỆT CẢ TÔNG MÔN!").

4. MÔ TẢ YOUTUBE CHUẨN SEO & HẤP DẪN (description):
   - Mở đầu bằng đoạn giới thiệu gay cấn về nội dung chuỗi tập phim.
   - Đính kèm tóm tắt nội dung hấp dẫn.
   - Danh sách mốc thời gian (Timestamps) tự động cho từng tập phim:
${selectedFiles.map((f, i) => `${i === 0 ? '00:00' : '...'} Tập ${i + 1}: ${f.name.replace(/\.srt$/i, '')}`).join('\n')}
   - Kêu gọi Like, Đăng ký kênh, Bình luận tương tác.
   - 3 hashtag chính ở cuối (VD: #ReviewPhim #HoatHinh3D #TuTien).

5. PROMPT ẢNH MIDJOURNEY/FLUX (imagePromptEn & imagePromptVi):
   - 16:9 Midjourney v6.1/Flux prompt miêu tả đúng nhân vật (dựa trên ảnh tham chiếu nếu có), áo choàng chiến bào, thần kiếm, hào quang linh lực và bối cảnh tông môn trong phim, 8k cinematic octane render, chừa không gian giữa để đặt chữ 3D.
   - imagePromptVi: Gợi ý bối cảnh và nhân vật bằng tiếng Việt dễ hiểu.

6. 30 THẺ TAGS YOUTUBE (tags):
   - Danh sách các từ khóa hot nhất về phim phân cách bằng dấu phẩy.

7. GỢI Ý 5–8 PHÂN CẢNH THUMBNAIL CAO TRÀO ĐẶC SẮC NHẤT CỦA BỘ PHIM (suggestedScenes):
   - Trích xuất 5-8 khoảnh khắc kịch tính nhất từ chính phụ đề SRT và các nhân vật của bộ phim này (VD: Cảnh bị phế tu vi ở đại điện, Cảnh đoạt kiếm tại kiếm các, Cảnh đại chiến cứu sư tỷ, Cảnh thức tỉnh thần thông vả mặt kẻ thù, Cảnh triệu hồi thần thú...).
   - Mỗi cảnh gồm:
     * title: Tên phân cảnh ngắn gọn (3-6 từ) (VD: "Bị Phế Tu Vi Ở Đại Điện", "Đoạt Trấn Trạch Thần Kiếm", "Đại Chiến Cứu Sư Tỷ", "Đột Phá Kim Đan Vả Mặt"...)
     * icon: Emoji trực quan (💔, ⚔️, ⚡, 💥, 🐉, 🖤, 👑, 🔥...)
     * prompt: Câu prompt tiếng Việt chi tiết mô tả bố cục tiền cảnh nhân vật chính to lớn + hậu cảnh kẻ thù / bối cảnh phim để nạp vào AI vẽ ảnh.

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT SAU (Không thêm bất kỳ chữ nào ngoài JSON):
{
  "storySummary": "Bài tóm tắt cốt truyện 350-550 chữ...",
  "titles": [
    "Tiêu đề 1...",
    "Tiêu đề 2...",
    "Tiêu đề 3...",
    "Tiêu đề 4...",
    "Tiêu đề 5..."
  ],
  "thumbnailTexts": [
    { "line1": "DÒNG 1 MẪU 1 (7-10 TỪ IN HOA)", "line2": "DÒNG 2 MẪU 1 (7-10 TỪ IN HOA)" },
    { "line1": "DÒNG 1 MẪU 2 (7-10 TỪ IN HOA)", "line2": "DÒNG 2 MẪU 2 (7-10 TỪ IN HOA)" },
    { "line1": "DÒNG 1 MẪU 3 (7-10 TỪ IN HOA)", "line2": "DÒNG 2 MẪU 3 (7-10 TỪ IN HOA)" },
    { "line1": "DÒNG 1 MẪU 4 (7-10 TỪ IN HOA)", "line2": "DÒNG 2 MẪU 4 (7-10 TỪ IN HOA)" },
    { "line1": "DÒNG 1 MẪU 5 (7-10 TỪ IN HOA)", "line2": "DÒNG 2 MẪU 5 (7-10 TỪ IN HOA)" }
  ],
  "suggestedScenes": [
    {
      "title": "Bị Phế Tu Vi Tại Đại Điện",
      "icon": "💔",
      "prompt": "Bố cục đa nhân vật: Nhân vật chính to lớn nổi bật ở tiền cảnh quỳ kiên cường giữa đại điện, tu vi bị phế xiềng xích vỡ vụn, mắt rực sáng thức tỉnh thần thông bí mật, hậu cảnh chưởng môn và các trưởng lão nhìn xuống khinh bỉ"
    },
    {
      "title": "Một Mình Đại Chiến Cứu Sư Tỷ",
      "icon": "⚔️",
      "prompt": "Bố cục đa nhân vật: Nhân vật chính chiếm 70% tiền cảnh cầm thần kiếm hoàng kim chém vỡ kết giới, trung cảnh sư tỷ bị thương, hậu cảnh vạn ma đầu vây hãm"
    },
    {
      "title": "Đột Phá Sức Mạnh Vả Mặt Phản Diện",
      "icon": "💥",
      "prompt": "Bố cục đa nhân vật: Nhân vật chính ở trung tâm tiền cảnh bộc phát linh lực kinh thiên động địa, phản diện hoảng sợ bay dạt ra xa"
    },
    {
      "title": "Triệu Hồi Thần Long Hộ Thể",
      "icon": "🐉",
      "prompt": "Bố cục đa nhân vật: Nhân vật chính ở tiền cảnh tỏa hào quang, phía sau là hư ảnh rồng thần khổng lồ cuồn cuộn mây trời che lấp cả chiến trường"
    }
  ],
  "imagePromptEn": "Cinematic 16:9 master piece of Xianxia protagonist with glowing eyes and golden dragon aura...",
  "imagePromptVi": "Mô tả ý tưởng hình ảnh thumbnail bằng tiếng Việt...",
  "description": "Nội dung mô tả YouTube chi tiết...",
  "tags": "review phim tu tien, hoat hinh 3d trung quoc, ..."
}
`;


  const customPromptDirective = customPrompt && customPrompt.trim()
    ? `\n\n=== 🎯 YÊU CẦU ĐẶC BIỆT TỪ CREATOR (CUSTOM PROMPT): ===\n${customPrompt.trim()}\n=> LƯU Ý BẮT BUỘC: Hãy đặc biệt ưu tiên áp dụng đúng yêu cầu tùy chỉnh này khi tạo Tóm Tắt Cốt Truyện, 5 Tiêu Đề, 5 Mẫu Chữ Thumbnail, Mô Tả Video và Thẻ Tags!\n`
    : '';

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}
DANH SÁCH TẬP PHIM (${selectedFiles.length} TẬP): ${fileNames}
${customPromptDirective}
${charRefContext}
=== NỘI DUNG TOÀN BỘ 100% PHỤ ĐỀ SRT CỦA TẤT CẢ CÁC TẬP ===
${fullTranscriptContext}
=== HẾT TOÀN BỘ PHỤ ĐỀ SRT ===

HÃY THỰC HIỆN ĐÚNG QUY TRÌNH 2 BƯỚC:
1. Đọc và hiểu toàn bộ 100% nội dung phụ đề trên và ảnh tham chiếu (nếu có) để viết bài TÓM TẮT CỐT TRUYỆN CHI TIẾT (storySummary).
2. Tạo 5 Tiêu Đề chuẩn 80-90 ký tự + 5 Mẫu Chữ Thumbnail 2 Dòng (7-10 từ/dòng) + Prompt Ảnh khớp 100% với phim ${customPrompt ? 'và tuân theo đúng yêu cầu đặc biệt của Creator' : ''}.
3. Xuất ra 1 đối tượng JSON duy nhất:`;

  let rawText = '';

  if (aiProvider === 'orimise') {
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    // Multi-modal message construction if images exist
    const userContent = [];
    userContent.push({ type: 'text', text: userMessage });

    if (Array.isArray(characterReferences)) {
      characterReferences.forEach((ref) => {
        const imgUrl = ref.imageBase64 || ref.thumbnail;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:image')) {
          userContent.push({
            type: 'image_url',
            image_url: { url: imgUrl }
          });
        }
      });
    }

    const reqBody = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent.length > 1 ? userContent : userMessage }
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
    // Gemini Direct API with Vision
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts = [{ text: `${systemPrompt}\n\n${userMessage}` }];

    if (Array.isArray(characterReferences)) {
      characterReferences.forEach((ref) => {
        const imgUrl = ref.imageBase64 || ref.thumbnail;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:image')) {
          const mimeMatch = imgUrl.match(/^data:(image\/[a-z]+);base64,/i);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const cleanBase64 = imgUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          });
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: parts
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

// 🪄 1. Dedicated AI Generator for 5 Titles & 5 Paired Thumbnail Texts according to prompt
export async function regenerateTitlesAndThumbnailTexts({
  storySummary = '',
  customPrompt = '',
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
  if (!customPrompt || !customPrompt.trim()) {
    throw new Error('Vui lòng nhập prompt yêu cầu cho Tiêu đề & Chữ Thumbnail!');
  }

  const systemPrompt = `You are an Elite YouTube Creative Director & Clickbait SEO Specialist.
Based on the provided story synopsis, your task is to generate 5 Viral YouTube Titles (80-90 chars) and 5 strictly paired 2-Line Text Thumbnails (7-10 words/line) strictly following the Creator's Custom Prompt.

RULES:
1. 5 TIÊU ĐỀ YOUTUBE CHUẨN 80-90 KÝ TỰ (titles):
   - Chuẩn độ dài 80 - 90 ký tự. Không dùng tên riêng đích danh (dùng: Hắn, Kẻ Phế Vật, Ma Tôn, Gã Đệ Tử...).
   - Áp dụng phong cách, góc nhìn hoặc yêu cầu từ Prompt của Creator.
2. 5 MẪU CHỮ THUMBNAIL 2 DÒNG KHỚP 1-1 VỚI 5 TIÊU ĐỀ (thumbnailTexts):
   - Mẫu #i khớp chính xác với Tiêu đề #i.
   - line1 (Vàng 3D - 7 đến 10 từ): Biến cố / Nghịch cảnh hiểm nghèo.
   - line2 (Xanh ngọc - 7 đến 10 từ): Thức tỉnh sức mạnh / Vả mặt phản đòn.

REQUIRED OUTPUT JSON FORMAT (Return ONLY valid JSON):
{
  "titles": [
    "💥 [Tiêu đề 1 chuẩn 80-90 ký tự theo prompt]",
    "🔥 [Tiêu đề 2 chuẩn 80-90 ký tự theo prompt]",
    "⚡ [Tiêu đề 3 chuẩn 80-90 ký tự theo prompt]",
    "👑 [Tiêu đề 4 chuẩn 80-90 ký tự theo prompt]",
    "😱 [Tiêu đề 5 chuẩn 80-90 ký tự theo prompt]"
  ],
  "thumbnailTexts": [
    { "line1": "DÒNG 1 KHỚP TIÊU ĐỀ 1 (7-10 TỪ)", "line2": "DÒNG 2 KHỚP TIÊU ĐỀ 1 (7-10 TỪ)" },
    { "line1": "DÒNG 1 KHỚP TIÊU ĐỀ 2 (7-10 TỪ)", "line2": "DÒNG 2 KHỚP TIÊU ĐỀ 2 (7-10 TỪ)" },
    { "line1": "DÒNG 1 KHỚP TIÊU ĐỀ 3 (7-10 TỪ)", "line2": "DÒNG 2 KHỚP TIÊU ĐỀ 3 (7-10 TỪ)" },
    { "line1": "DÒNG 1 KHỚP TIÊU ĐỀ 4 (7-10 TỪ)", "line2": "DÒNG 2 KHỚP TIÊU ĐỀ 4 (7-10 TỪ)" },
    { "line1": "DÒNG 1 KHỚP TIÊU ĐỀ 5 (7-10 TỪ)", "line2": "DÒNG 2 KHỚP TIÊU ĐỀ 5 (7-10 TỪ)" }
  ]
}`;

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}

=== 🎯 PROMPT YÊU CẦU TỪ CREATOR: ===
${customPrompt.trim()}

=== TÓM TẮT CỐT TRUYỆN GỐC ===
${storySummary}

HÃY TẠO 5 TIÊU ĐỀ VÀ 5 MẪU CHỮ THUMBNAIL 2 DÒNG MỚI THEO ĐÚNG PROMPT TRÊN. XUẤT RA 1 ĐỐI TƯỢNG JSON DUY NHẤT:`;

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
      temperature: 0.75
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.choices?.[0]?.message?.content || '';
  } else {
    const targetModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
        ],
        generationConfig: {
          temperature: 0.75,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const parsed = safeParseAIJson(rawText);
  if (!parsed || !Array.isArray(parsed.titles) || parsed.titles.length === 0) {
    throw new Error('AI không tạo được danh sách tiêu đề mới. Vui lòng thử lại!');
  }

  let formattedTexts = [];
  if (Array.isArray(parsed.thumbnailTexts) && parsed.thumbnailTexts.length > 0) {
    formattedTexts = parsed.thumbnailTexts.map(t => ({
      line1: (typeof t === 'object' ? (t.line1 || t.text1 || '') : t).toString().trim(),
      line2: (typeof t === 'object' ? (t.line2 || t.text2 || '') : '').toString().trim()
    }));
  }

  return {
    titles: parsed.titles,
    thumbnailTexts: formattedTexts
  };
}


// 🪄 2. Dedicated AI Generator for Description & Metadata according to prompt
export async function regenerateDescriptionOnly({
  storySummary = '',
  timestamps = [],
  currentDescription = '',
  customPrompt = '',
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
  if (!customPrompt || !customPrompt.trim()) {
    throw new Error('Vui lòng nhập prompt yêu cầu cho phần Mô Tả Video!');
  }

  const systemPrompt = `You are an Elite YouTube Creative Director & SEO Copywriter.
Rewrite and optimize the YouTube Video Description and SEO Tags based on the provided story synopsis and timestamps, strictly following the Creator's Custom Prompt (e.g. adding call-to-actions, donate/social links, changing tone, highlighting key arcs).

RULES:
1. Include engaging hook paragraphs.
2. Embed the timestamps naturally if provided.
3. Add a rich set of 15-20 relevant YouTube SEO tags.
4. Return ONLY valid JSON:
{
  "description": "Nội dung mô tả YouTube hoàn chỉnh, hấp dẫn...",
  "tags": "tag1, tag2, tag3, ..."
}`;

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}

=== 🎯 PROMPT YÊU CẦU CHO MÔ TẢ: ===
${customPrompt.trim()}

=== TÓM TẮT CỐT TRUYỆN GỐC ===
${storySummary}

=== MỐC THỜI GIAN (TIMESTAMPS) ===
${timestamps.join('\n')}

=== MÔ TẢ HIỆN TẠI ===
${currentDescription}

HÃY VIẾT LẠI MÔ TẢ YOUTUBE VÀ DANH SÁCH TAGS MỚI THEO ĐÚNG PROMPT TRÊN. XUẤT RA 1 ĐỐI TƯỢNG JSON DUY NHẤT:`;

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

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.choices?.[0]?.message?.content || '';
  } else {
    const targetModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const parsed = safeParseAIJson(rawText);
  if (!parsed || !parsed.description) {
    throw new Error('AI không tạo được mô tả mới. Vui lòng thử lại!');
  }

  let finalDescription = parsed.description;
  if (timestamps.length > 0 && !finalDescription.includes('00:00')) {
    finalDescription = `${finalDescription}\n\n📌 MỐC THỜI GIAN VIDEO:\n${timestamps.join('\n')}`;
  }

  return {
    description: finalDescription,
    tags: parsed.tags || ''
  };
}

// 🪄 3. Dedicated AI Generator for Story Summary according to prompt
export async function regenerateStorySummaryOnly({
  storySummary = '',
  customPrompt = '',
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
  if (!customPrompt || !customPrompt.trim()) {
    throw new Error('Vui lòng nhập prompt yêu cầu cho Tóm Tắt Cốt Truyện!');
  }

  const systemPrompt = `You are an Elite YouTube Creative Director & Scriptwriter.
Your task is to rewrite, expand, or adjust the YouTube Story Summary Synopsis based on the provided existing story and the Creator's Custom Prompt.

RULES:
1. Write a gripping, coherent synopsis (300-600 words) in Vietnamese.
2. Accurately reflect all modifications requested in the prompt (tone, focus, pacing, humor, dark themes, etc.).
3. Return ONLY valid JSON:
{
  "storySummary": "Bài tóm tắt cốt truyện hoàn chỉnh đã được viết lại..."
}`;

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}

=== 🎯 PROMPT YÊU CẦU CHO TÓM TẮT CỐT TRUYỆN: ===
${customPrompt.trim()}

=== TÓM TẮT CỐT TRUYỆN GỐC ===
${storySummary}

HÃY VIẾT LẠI TÓM TẮT CỐT TRUYỆN THEO ĐÚNG PROMPT TRÊN. XUẤT RA 1 ĐỐI TƯỢNG JSON DUY NHẤT:`;

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

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.choices?.[0]?.message?.content || '';
  } else {
    const targetModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const parsed = safeParseAIJson(rawText);
  if (!parsed || !parsed.storySummary) {
    throw new Error('AI không tạo được tóm tắt mới. Vui lòng thử lại!');
  }

  return {
    storySummary: parsed.storySummary
  };
}


// 🪄 4. Dedicated AI Generator for Midjourney/Flux Image Prompts according to prompt, ALL Character Reference Images & ALL SRT Subtitles
export async function regenerateImagePromptOnly({
  storySummary = '',
  customPrompt = '',
  selectedFiles = [],
  fullTranscriptContext = '',
  characterReferences = [],
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

  // Format compact time stamp
  const formatCompactTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.replace(/^00:/, '').split(',')[0].split('.')[0];
  };

  // Compile full 100% transcript of all selected SRT files if provided
  let transcript = fullTranscriptContext || '';
  if (!transcript && Array.isArray(selectedFiles) && selectedFiles.length > 0) {
    transcript = selectedFiles.map((file, fileIdx) => {
      let prevText = '';
      const compactLines = (file.subtitles || [])
        .map(s => {
          const text = (s.translatedText || s.originalText || '').trim();
          if (!text || text === prevText) return null;
          prevText = text;
          const time = formatCompactTime(s.startTime);
          return time ? `[${time}] ${text}` : text;
        })
        .filter(Boolean)
        .join('\n');

      return `=== TẬP #${fileIdx + 1}: ${file.name} (${(file.subtitles || []).length} dòng) ===\n${compactLines}`;
    }).join('\n\n');
  }

  const systemPrompt = `You are an Elite Midjourney v6.1, Flux.1 & Stable Diffusion AI Art Director specializing in Chinese 3D Animation (Donghua / Xianxia / Xuanhuan).
Your mission is to craft a hyper-detailed 16:9 YouTube Thumbnail Art Prompt in English and a concise Vietnamese visual description.

MANDATORY MULTI-CHARACTER CINEMATIC COMPOSITION & HERO HIERARCHY:
1. 🌟 MAIN PROTAGONIST MUST BE DOMINANT & LARGER (HERO FOREGROUND COMPOSITION):
   - In ANY scene containing multiple characters, the MAIN PROTAGONIST (Nhân vật chính) MUST BE PLACED IN THE CLOSE FOREGROUND OR CENTER-STAGE, significantly larger in scale (occupying 60-70% of visual dominance), with the sharpest focus, dramatic lighting, and luminous aura.
   - TRAGIC / DRAMATIC SCENES (e.g. Bị Phế Tu Vi, Hủy Đan Điền, Bị Trục Xuất):
     * Main character in close foreground: kneeling or standing defiantly, broken spiritual chains shattering around his body, bleeding from loss of cultivation but with intense glowing eyes, secret divine dragon / ancient demon aura igniting from within his chest.
   - BATTLE / BREAKTHROUGH SCENES:
     * Main character in close foreground unleashing colossal sword Qi or golden dragon energy, looking fiercely at the viewer.
2. 👥 SECONDARY CHARACTERS / ANTAGONISTS / ELDERS / ARMY IN MIDGROUND & BACKGROUND:
   - Enemies, sect masters, mocking elders, and armies MUST be positioned in the MIDGROUND and BACKGROUND (smaller in scale), looking down from high thrones, surrounding the hero from afar, or reeling backwards in terror.
3. 👁️ THOROUGH MULTI-IMAGE VISION SCAN:
   - Inspect ALL ${characterReferences.length} attached character reference images. Extract exact face, hair color, attire, robes, armor, and divine weapons to faithfully portray each character.
4. 📜 100% FULL SRT TRANSCRIPT HARVESTING:
   - Merge the grandest plot climax from the SRT dialogue into the scene.

PROMPT RULES:
1. imagePromptEn: Hyper-detailed 16:9 Midjourney/Flux prompt with cinematic depth of field, dramatic rim lighting, 8k octane render, volumetric god rays, space in center-top for 3D overlay text, --ar 16:9 --v 6.1 --style raw.
2. imagePromptVi: Gợi ý bối cảnh, thần thái nhân vật và bố cục hình ảnh bằng tiếng Việt dễ hiểu.
3. Return ONLY valid JSON:
{
  "imagePromptEn": "Hyper realistic 16:9 cinematic anime render of...",
  "imagePromptVi": "Mô tả bối cảnh, thần thái nhân vật và bố cục bằng tiếng Việt..."
}`;


  let charRefContext = '';
  if (Array.isArray(characterReferences) && characterReferences.length > 0) {
    charRefContext = `\n=== 👥 DANH SÁCH ${characterReferences.length} ẢNH THAM CHIẾU NHÂN VẬT ĐƯỢC CUNG CẤP: ===\n` +
      characterReferences.map((c, i) => {
        const info = [
          c.name ? `Tên: ${c.name}` : '',
          c.role ? `Thân phận: ${c.role}` : '',
          c.sect ? `Môn phái: ${c.sect}` : '',
          c.realm ? `Cảnh giới: ${c.realm}` : '',
          c.note ? `Ghi chú: ${c.note}` : ''
        ].filter(Boolean).join(' | ');
        return `[Ảnh nhân vật #${i + 1}] ${info}`;
      }).join('\n') +
      `\n=> YÊU CẦU BẮT BUỘC: Hãy soi kỹ TOÀN BỘ TỪNG ẢNH THAM CHIẾU đính kèm và mô tả chính xác ngoại hình, kiểu tóc, y phục, thần khí và vũ khí của các nhân vật trên vào Prompt Midjourney/Flux!\n`;
  }

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}

=== 🎯 PROMPT YÊU CẦU TỪ CREATOR: ===
${(customPrompt || 'Tạo ảnh thumbnail kịch tính, hoành tráng, làm nổi bật nhân vật chính của bộ phim').trim()}
${charRefContext}
${storySummary ? `=== TÓM TẮT CỐT TRUYỆN GỐC ===\n${storySummary}\n` : ''}
${transcript ? `=== TOÀN BỘ 100% PHỤ ĐỀ SRT CỦA TẤT CẢ CÁC TẬP PHIM ===\n${transcript}\n=== HẾT TOÀN BỘ PHỤ ĐỀ SRT ===\n` : ''}
HÃY QUÉT TOÀN BỘ CÁC ẢNH THAM CHIẾU VÀ TOÀN BỘ 100% PHỤ ĐỀ SRT TRÊN ĐỂ TẠO PROMPT VẼ ẢNH TIẾNG ANH VÀ Ý TƯỞNG TIẾNG VIỆT HOÀN HẢO NHẤT. XUẤT RA 1 ĐỐI TƯỢNG JSON DUY NHẤT:`;


  let rawText = '';

  if (aiProvider === 'orimise') {
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    // Multi-modal message construction if images exist
    const userContent = [];
    userContent.push({ type: 'text', text: userMessage });

    if (Array.isArray(characterReferences)) {
      characterReferences.forEach((ref) => {
        const imgUrl = ref.imageBase64 || ref.thumbnail;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:image')) {
          userContent.push({
            type: 'image_url',
            image_url: { url: imgUrl }
          });
        }
      });
    }

    const reqBody = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent.length > 1 ? userContent : userMessage }
      ],
      temperature: 0.8
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.choices?.[0]?.message?.content || '';
  } else {
    // Gemini API with Vision
    const targetModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const parts = [{ text: `${systemPrompt}\n\n${userMessage}` }];

    if (Array.isArray(characterReferences)) {
      characterReferences.forEach((ref) => {
        const imgUrl = ref.imageBase64 || ref.thumbnail;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:image')) {
          const mimeMatch = imgUrl.match(/^data:(image\/[a-z]+);base64,/i);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const cleanBase64 = imgUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          });
        }
      });
    }

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: parts }
        ],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const parsed = safeParseAIJson(rawText);
  if (!parsed || !parsed.imagePromptEn) {
    throw new Error('AI không tạo được prompt vẽ ảnh mới. Vui lòng thử lại!');
  }

  return {
    imagePromptEn: parsed.imagePromptEn,
    imagePromptVi: parsed.imagePromptVi || ''
  };
}


// 🚀 5. Batch Studio Generator for ALL Episodes in the Series
export async function generateBatchStudioForFiles({
  files = [],
  genre = 'Tu Tiên / Tiên Hiệp',
  contentType = 'Review Phim / Tóm Tắt Phim',
  aiProvider = 'orimise',
  apiKey,
  baseUrl = 'https://api.orimise.com/v1',
  model = 'claude-sonnet-5',
  concurrency = 3,
  onProgress // (completedCount, totalCount, currentFileName) => void
}) {
  if (!files || files.length === 0) return [];
  const results = [];
  let completed = 0;
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const fileObj = queue.shift();
      if (!fileObj) break;

      if (onProgress) {
        onProgress(completed, files.length, fileObj.name);
      }

      try {
        const fileData = await generateYoutubeContent({
          subtitles: fileObj.subtitles || [],
          genre,
          contentType,
          aiProvider,
          apiKey,
          baseUrl,
          model
        });

        results.push({
          fileId: fileObj.id,
          fileName: fileObj.name,
          episodeName: fileObj.name.replace(/\.srt$/i, '').replace(/^.*[\\/]/, ''),
          data: fileData
        });
      } catch (err) {
        console.error(`Error generating content for ${fileObj.name}:`, err);
        results.push({
          fileId: fileObj.id,
          fileName: fileObj.name,
          episodeName: fileObj.name.replace(/\.srt$/i, '').replace(/^.*[\\/]/, ''),
          error: err.message
        });
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, files.length, fileObj.name);
        }
      }
    }
  }

  const numWorkers = Math.min(Math.max(1, concurrency), files.length);
  await Promise.all(Array.from({ length: numWorkers }, worker));

  // Sort results to match original file order
  const fileIdOrder = files.map(f => f.id);
  return results.sort((a, b) => fileIdOrder.indexOf(a.fileId) - fileIdOrder.indexOf(b.fileId));
}

// Helper to escape CSV fields
function escapeCSV(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

// 📊 Export Batch Studio Results to CSV (Excel compatible with UTF-8 BOM)
export function exportStudioResultsToCSV(resultsList = [], seriesTitle = 'Bo_Phim_YouTube_Studio') {
  if (!resultsList || resultsList.length === 0) {
    alert('Chưa có dữ liệu phân tích tập nào để xuất CSV!');
    return;
  }

  const headers = [
    'STT',
    'Tập Phim',
    'Tiêu Đề 1 (Tối Ưu)',
    'Tiêu Đề 2',
    'Tiêu Đề 3',
    'Chữ Thumbnail Dòng 1',
    'Chữ Thumbnail Dòng 2',
    'Tóm Tắt Cốt Truyện',
    'Mô Tả Video (SEO)',
    'Thẻ Tags YouTube',
    'Prompt Tạo Ảnh AI'
  ];

  const rows = resultsList.map((item, idx) => {
    const d = item.data || {};
    const titles = Array.isArray(d.titles) ? d.titles : [];
    const thumbTexts = Array.isArray(d.thumbnailTexts) ? d.thumbnailTexts : [];
    const thumb1 = thumbTexts[0] || {};

    return [
      idx + 1,
      item.episodeName || item.fileName || `Tập ${idx + 1}`,
      titles[0] || '',
      titles[1] || '',
      titles[2] || '',
      thumb1.line1 || '',
      thumb1.line2 || '',
      d.storySummary || '',
      d.description || '',
      d.tags || '',
      d.imagePromptEn || ''
    ].map(escapeCSV).join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${seriesTitle.replace(/[\s/\\:]+/g, '_')}_YouTube_Studio_Batch.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// 📄 Export Batch Studio Results to TXT
export function exportStudioResultsToTXT(resultsList = [], seriesTitle = 'Bo_Phim_YouTube_Studio') {
  if (!resultsList || resultsList.length === 0) {
    alert('Chưa có dữ liệu phân tích tập nào để xuất TXT!');
    return;
  }

  let txtContent = `=======================================================\n`;
  txtContent += `🎬 BẢNG TỔNG HỢP METADATA YOUTUBE STUDIO CHO BỘ PHIM\n`;
  txtContent += `Tổng số tập: ${resultsList.length} tập\n`;
  txtContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
  txtContent += `=======================================================\n\n`;

  resultsList.forEach((item, idx) => {
    const d = item.data || {};
    txtContent += `-------------------------------------------------------\n`;
    txtContent += `📺 TẬP #${idx + 1}: ${item.episodeName || item.fileName}\n`;
    txtContent += `-------------------------------------------------------\n`;

    if (item.error) {
      txtContent += `❌ Lỗi phân tích: ${item.error}\n\n`;
      return;
    }

    txtContent += `📌 5 TIÊU ĐỀ YOUTUBE:\n`;
    (d.titles || []).forEach((t, tIdx) => {
      txtContent += `  ${tIdx + 1}. ${t}\n`;
    });
    txtContent += `\n`;

    txtContent += `🖼️ 5 MẪU CHỮ THUMBNAIL 2 DÒNG:\n`;
    (d.thumbnailTexts || []).forEach((th, thIdx) => {
      txtContent += `  Mẫu #${thIdx + 1}: [Dòng 1]: ${th.line1}  |  [Dòng 2]: ${th.line2}\n`;
    });
    txtContent += `\n`;

    txtContent += `📖 TÓM TẮT CỐT TRUYỆN:\n${d.storySummary || ''}\n\n`;

    txtContent += `🎨 PROMPT VẼ ẢNH AI:\n${d.imagePromptEn || ''}\n\n`;

    txtContent += `🏷️ THẺ TAGS YOUTUBE:\n${d.tags || ''}\n\n`;

    txtContent += `📝 MÔ TẢ VIDEO SEO:\n${d.description || ''}\n\n\n`;
  });

  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${seriesTitle.replace(/[\s/\\:]+/g, '_')}_Metadata_Full.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// 🔍 5. Dedicated AI Story Scene Extractor - Analyzes full SRT & character references to extract dynamic thumbnail scenes
export async function analyzeAndSuggestStoryScenes({

  selectedFiles = [],
  characterReferences = [],
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
    throw new Error('Vui lòng chọn ít nhất 1 file SRT phụ đề để phân tích cảnh!');
  }

  const formatCompactTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.replace(/^00:/, '').split(',')[0].split('.')[0];
  };

  const fullTranscriptContext = selectedFiles.map((file, fileIdx) => {
    let prevText = '';
    const compactLines = (file.subtitles || [])
      .map(s => {
        const text = (s.translatedText || s.originalText || '').trim();
        if (!text || text === prevText) return null;
        prevText = text;
        const time = formatCompactTime(s.startTime);
        return time ? `[${time}] ${text}` : text;
      })
      .filter(Boolean)
      .join('\n');

    return `=== TẬP #${fileIdx + 1}: ${file.name} (${(file.subtitles || []).length} dòng) ===\n${compactLines}`;
  }).join('\n\n');

  let charRefContext = '';
  if (Array.isArray(characterReferences) && characterReferences.length > 0) {
    charRefContext = `\n=== 👥 DANH SÁCH NHÂN VẬT THAM CHIẾU (${characterReferences.length} nhân vật): ===\n` +
      characterReferences.map((c, i) => `[#${i + 1}] ${c.name || 'Nhân vật'} (${c.role || ''} | ${c.realm || ''})`).join('\n') + '\n';
  }

  const systemPrompt = `You are an Elite Viral YouTube Anime / Donghua Thumbnail Director.
Your task is to thoroughly analyze the 100% full SRT subtitle dialogue and character references of this movie, and extract 6 to 8 most dramatic, climactic, viral, and visually stunning key scenes (Phân cảnh cao trào đắt giá nhất của chính bộ phim này).

COMPOSITION RULES FOR EACH SCENE:
- Hero Dominance: The main protagonist MUST be prominent in the close foreground (to lớn, nổi bật ở tiền cảnh chiếm 60-70% khung hình).
- Multi-character interaction: Describe secondary characters, villains, sect masters, elders, or enemy armies in the midground & background.
- Contextual accuracy: Use exact names of characters, sect locations, artifacts, swords, and techniques from the provided subtitles.

Return ONLY valid JSON array with 6-8 scenes:
{
  "suggestedScenes": [
    {
      "title": "Tên phân cảnh ngắn (3-6 từ)",
      "icon": "💔",
      "prompt": "Bố cục đa nhân vật: Nhân vật chính [Tên NV] to lớn nổi bật ở tiền cảnh quỳ kiên cường giữa đại điện, tu vi bị phế xiềng xích vỡ vụn, mắt rực sáng thức tỉnh thần thông bí mật, hậu cảnh [Tên Chưởng Môn/Trưởng Lão] và hàng trăm đệ tử nhìn xuống khinh bỉ"
    }
  ]
}`;

  const userMessage = `THỂ LOẠI: ${genre}
ĐỊNH DẠNG: ${contentType}
${charRefContext}
=== NỘI DUNG TOÀN BỘ 100% PHỤ ĐỀ SRT CỦA TẤT CẢ CÁC TẬP ===
${fullTranscriptContext}
=== HẾT PHỤ ĐỀ SRT ===

HÃY PHÂN TÍCH VÀ TRÍCH XUẤT 6 ĐẾN 8 PHÂN CẢNH CAO TRÀO ĐẶC SẮC NHẤT CỦA BỘ PHIM TRÊN ĐỂ TẠO PROMPT THUMBNAIL. XUẤT RA 1 ĐỐI TƯỢNG JSON DUY NHẤT:`;

  let rawText = '';

  if (aiProvider === 'orimise') {
    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const userContent = [{ type: 'text', text: userMessage }];
    if (Array.isArray(characterReferences)) {
      characterReferences.forEach((ref) => {
        const imgUrl = ref.imageBase64 || ref.thumbnail;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:image')) {
          userContent.push({ type: 'image_url', image_url: { url: imgUrl } });
        }
      });
    }

    const reqBody = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent.length > 1 ? userContent : userMessage }
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
    // Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const parts = [{ text: `${systemPrompt}\n\n${userMessage}` }];

    if (Array.isArray(characterReferences)) {
      characterReferences.forEach((ref) => {
        const imgUrl = ref.imageBase64 || ref.thumbnail;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:image')) {
          const mimeMatch = imgUrl.match(/^data:(image\/[a-z]+);base64,/i);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const cleanBase64 = imgUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          parts.push({
            inlineData: { mimeType: mimeType, data: cleanBase64 }
          });
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Lỗi Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const parsed = safeParseAIJson(rawText);
  if (!parsed || !Array.isArray(parsed.suggestedScenes)) {
    throw new Error('Không thể bóc tách phân cảnh từ AI. Vui lòng thử lại!');
  }

  return parsed.suggestedScenes;
}

