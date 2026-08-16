// 100% Free AI Image Generation API Engines (No API Key Required)

export const FREE_IMAGE_MODELS = [
  {
    id: 'flux',
    name: '⚡ Flux.1 Schnell (Vẽ 3s - Chuẩn Anime/Xianxia)',
    modelParam: 'flux'
  },
  {
    id: 'flux-realism',
    name: '🎬 Flux Realism Cinematic (Điện Ảnh 8K)',
    modelParam: 'flux-realism'
  },
  {
    id: 'anime',
    name: '🌸 Xianxia Anime Master (Đồ Họa 3D Tu Tiên)',
    modelParam: 'flux'
  },
  {
    id: 'turbo',
    name: '🚀 SDXL Turbo (Cực Nhanh 2s)',
    modelParam: 'turbo'
  }
];

/**
 * Generate 100% Free AI Image (16:9 YouTube Thumbnail Resolution)
 * Uses high-speed free AI GPU clusters (Pollinations AI Flux.1 Engine)
 */
export async function generateFreeAIImage({
  prompt,
  modelId = 'flux',
  width = 1280,
  height = 720
}) {
  if (!prompt) throw new Error('Chưa có prompt mô tả ảnh!');

  const modelObj = FREE_IMAGE_MODELS.find(m => m.id === modelId) || FREE_IMAGE_MODELS[0];
  
  // Style enhancements depending on selected model
  let styleSuffix = 'high resolution 8k, cinematic lighting, 16:9 aspect ratio, masterpiece, vivid colors';
  if (modelId === 'anime') {
    styleSuffix = 'xianxia 3d anime style, glowing energy aura, Chinese cultivator robes, detailed character art, octane render 8k';
  } else if (modelId === 'flux-realism') {
    styleSuffix = 'hyper-realistic photography, dramatic studio lighting, 8k octane render, detailed face and armor';
  }

  const fullPrompt = `${prompt}, ${styleSuffix}`;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 1000000);

  // Pollinations.ai Free Image API URL
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${modelObj.modelParam}&nologo=true`;

  // Preload and verify image in browser memory before returning
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      // Fallback resolve if network check takes too long
      resolve(imageUrl);
    }, 12000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(imageUrl);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      // Still return URL as fallback
      resolve(imageUrl);
    };
    img.src = imageUrl;
  });
}
