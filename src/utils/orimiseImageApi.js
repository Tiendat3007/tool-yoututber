// Orimise Official Image Generation & Reference Upload API integration

const ORIMISE_BASE = 'https://api.orimise.com';

/**
 * Upload local reference image file to Orimise (/api/images/uploads)
 * Returns temporary downloadable Orimise image_url
 */
export async function uploadReferenceImageToOrimise(file, apiKey) {
  if (!apiKey) throw new Error('Vui lòng nhập Orimise API Key trong Cấu Hình AI!');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${ORIMISE_BASE}/api/images/uploads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error?.message || `Upload Orimise thất bại: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.image_url) {
    throw new Error('Orimise không trả về image_url sau khi upload.');
  }

  return data.image_url;
}

/**
 * Generate AI Image using Orimise official endpoints
 * - Supports async task flow with reference image_urls
 * - Supports OpenAI-compatible sync flow (/v1/images/generations)
 */
export async function generateOrimiseImage({
  prompt,
  imageUrls = [],
  apiKey,
  model = 'gpt-image-1',
  onProgress
}) {
  if (!apiKey) throw new Error('Vui lòng nhập Orimise API Key trong Cấu Hình AI!');
  if (!prompt) throw new Error('Chưa có prompt mô tả tạo ảnh!');

  // Option 1: Async task flow when reference imageUrls are present
  if (imageUrls && imageUrls.length > 0) {
    if (onProgress) onProgress('Đang gửi task tạo ảnh Orimise kèm ảnh tham chiếu...');

    const taskRes = await fetch(`${ORIMISE_BASE}/api/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        image_urls: imageUrls
      })
    });

    if (!taskRes.ok) {
      const err = await taskRes.json().catch(() => ({}));
      throw new Error(err.message || err.error?.message || `Khởi tạo task Orimise thất bại: HTTP ${taskRes.status}`);
    }

    let task = await taskRes.json();
    const taskId = task.task_id;

    if (!taskId) {
      throw new Error('Không nhận được task_id từ Orimise.');
    }

    // Poll status until completed
    let attempts = 0;
    while (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'timeout') {
      if (attempts > 50) throw new Error('Tạo ảnh quá thời gian chờ (Timeout 150s). Vui lòng thử lại sau!');
      const seconds = attempts * 3;
      if (onProgress) onProgress(`⏳ Đang xếp hàng & vẽ ảnh Orimise GPU (Đã chờ ${seconds}s - Trạng thái: ${task.status})...`);

      await new Promise(r => setTimeout(r, 3000));
      attempts++;


      const pollRes = await fetch(`${ORIMISE_BASE}/api/images/generations/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (pollRes.ok) {
        task = await pollRes.json();
      }
    }

    if (task.status === 'failed') {
      throw new Error('Task Orimise bị từ chối/thất bại. Vui lòng kiểm tra lại prompt.');
    }

    const finalUrl = task.file?.url || task.image_url;
    if (!finalUrl) {
      throw new Error('Task hoàn tất nhưng không tìm thấy URL ảnh.');
    }

    return finalUrl;
  }

  // Option 2: OpenAI-compatible Sync Flow (/v1/images/generations)
  if (onProgress) onProgress('Đang tạo ảnh qua Orimise API (v1/images/generations)...');

  const syncRes = await fetch(`${ORIMISE_BASE}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url'
    })
  });

  if (!syncRes.ok) {
    const err = await syncRes.json().catch(() => ({}));
    throw new Error(err.message || err.error?.message || `Lỗi Orimise Sync API HTTP ${syncRes.status}`);
  }

  const data = await syncRes.json();
  const generatedUrl = data.data?.[0]?.url;

  if (!generatedUrl) {
    throw new Error('Orimise không trả về URL hình ảnh.');
  }

  return generatedUrl;
}
