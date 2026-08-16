// YouTube Metadata & Thumbnail Prompt AI Engine

export async function generateYoutubeContent({
  selectedFiles = [],
  genre = 'Tu Tiên / Tiên Hiệp',
  contentType = 'Review Phim / Tóm Tắt Phim',
  aiProvider = 'orimise',
  apiKey,
  baseUrl = 'https://api.orimise.com/v1',
  model = 'gemini-2.5-flash'
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

  const systemPrompt = `You are a World-Class YouTube Growth Expert, Film Marketer, and Midjourney/Flux Prompt Engineer.
YOUR TASK: Analyze the combined movie subtitle transcript across ${selectedFiles.length} episode(s) and generate a high-CTR YouTube Publishing Pack with 2-Line High-Impact Text Thumbnails & AI Image Generation Prompts.

GENRE: ${genre}
CONTENT TYPE: ${contentType}
FILES ANALYZED (${selectedFiles.length}): ${fileNames}

CRITICAL RULES FOR THUMBNAIL TEXTS & PROMPTS:
1. "thumbnailTexts": Generate 5 pairs of 2-LINE THUMBNAIL TEXTS. They MUST be longer, extremely punchy, emotional, dramatic, and directly tied to the main video Titles.
   - Line 1: Main hook / protagonist action (3-6 words, UPPERCASE).
   - Line 2: Big climax / shocker / stakes (3-6 words, UPPERCASE).
   Example:
   Line 1: "TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ"
   Line 2: "TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC MẠNG NGƯỜI NHƯ CỎ RÁC"

2. "imagePromptEn": The AI Image Prompt MUST explicitly integrate and visually match the story plot AND the 2-Line Thumbnail Text concept. Describe:
   - Character appearance (ancient cultivator robes, armor, hair, glowing eyes, intense furious/shocked expression).
   - Scene environment (ancient sect ruins, forbidden dungeon, magical array, thunderous sky).
   - Lighting & FX (epic glowing aura, cyan and gold particle effects, volumetric cinematic lighting, octane render, 8k, 16:9 ratio --ar 16:9).
   - Composition (framed left/right to allow bold 3D text overlay in the center).

REQUIRED OUTPUT FORMAT:
You MUST output ONLY a single valid JSON object with the following exact keys:
{
  "titles": [
    "Tiêu đề 1 (Giật gân, cuốn hút, chuẩn SEO Tu Tiên / Huyền Huyễn)",
    "Tiêu đề 2 (Gây tò mò kịch tính, nhấn mạnh diễn biến chính)",
    "Tiêu đề 3 (Bá đạo, phong cách review tóm tắt phim)",
    "Tiêu đề 4 (Tiêu đề ngắn 50 ký tự chuẩn CTR)",
    "Tiêu đề 5 (Xoay quanh nhân vật chính & bí mật bị tiết lộ)"
  ],
  "thumbnailTexts": [
    {
      "line1": "TÔ SƯ HUYNH XUYÊN KHÔNG VỀ THỜI TIÊN CỔ",
      "line2": "TOÀN GIA BỊ TỐNG VÀO NGỤC TỤC MẠNG NGƯỜI NHƯ CỎ RÁC"
    },
    {
      "line1": "ĐỘT PHÁ KIM ĐAN KỲ VÔ THƯỢNG NĂNG LƯỢNG",
      "line2": "TRẢ THÙ DIỆT SẠCH CẢ TÔNG MÔN PHẢN BỘI"
    },
    {
      "line1": "MẠNG NGƯỜI NHƯ CỎ RÁC TẠI ĐẠI ĐƯỜNG VƯƠNG TRIỀU",
      "line2": "VỪA MỞ MẮT GẶP ĐỈNH CẤP ĐẠI YÊU VƯƠNG"
    },
    {
      "line1": "ANH HÙNG TRỌNG SINH NẮM GIỮ HỆ THỐNG BÁ ĐẠO",
      "line2": "MỘT TAY CHE TRỜI SAN BẰNG MỌI CƯỜNG ĐỊCH"
    },
    {
      "line1": "THẦN THOẠI TRỞ LẠI PHÁ BỎ MỌI PHONG ẤN VƯƠNG TRIỀU",
      "line2": "CHIẾN THẦN XUYÊN KHÔNG XONG VÀO NẠO TÔNG MÔN"
    }
  ],
  "imagePromptEn": "Detailed Midjourney / DALL-E / Flux English image prompt matching the plot and 2-line thumbnail text (include character armor/robe, glowing eyes, magic aura, ancient Chinese sect background, dramatic lighting, cinematic 8k, octane render, 16:9 ratio --ar 16:9)",
  "imagePromptVi": "Mô tả ý tưởng ảnh Thumbnail bằng tiếng Việt (bố cục nhân vật, màu sắc, vị trí đặt chữ 2 dòng)",
  "description": "Mô tả video YouTube hoàn chỉnh (Hook đầu giật gân, Tóm tắt diễn biến kịch tính các tập phim, Khung mốc thời gian, Lời kêu gọi đăng ký kênh, Hashtags #...)",
  "tags": "tu tiên, phim tiên hiệp, xuyên không, review phim tu tiên, phim ngắn tu tiên, ..."
}`;

  const userMessage = `HÃY PHÂN TÍCH TỔNG HỢP ${selectedFiles.length} TẬP PHIM NÀY VÀ XUẤT BỘ NỘI DUNG YOUTUBE VỚI CHỮ THUMBNAIL 2 DÒNG DÀI HƠN KỊCH TÍNH THEO TITLE & PROMPT ẢNH KÈM THUMBNAIL TEXT:\n\n${sampledText.substring(0, 6000)}`;

  let rawText = '';

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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7
      })
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

  // Parse JSON object from response
  try {
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1] : rawText;
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    const parseTarget = objectMatch ? objectMatch[0] : jsonStr;

    const parsed = JSON.parse(parseTarget.trim());

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
  } catch (e) {
    console.error("YouTube Content JSON parse error:", e, rawText);
    throw new Error('Không thể phân tích dữ liệu JSON trả về từ AI. Vui lòng thử lại!');
  }
}
