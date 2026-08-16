// 16:9 YouTube Thumbnail Generator & HD Canvas Exporter Engine

export async function exportThumbnailHD({
  bgImage,
  line1 = '',
  line2 = '',
  channelName = 'TU TIÊN ANIME'
}) {
  return new Promise(async (resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // 1. Draw Background Image or Dark Gradient
    if (bgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
        img.src = bgImage;
      });

      if (img.complete && img.naturalWidth > 0) {
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const x = (canvas.width - img.naturalWidth * scale) / 2;
        const y = (canvas.height - img.naturalHeight * scale) / 2;
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
      }
    }

    if (!bgImage) {
      const grad = ctx.createRadialGradient(900, 200, 50, 640, 360, 800);
      grad.addColorStop(0, '#4c1d95');
      grad.addColorStop(0.6, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Dark Vignette / Contrast Overlay
    const vig = ctx.createRadialGradient(640, 360, 200, 640, 360, 720);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw 1080p HD Badge
    ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(30, 30, 110, 38, 8);
      ctx.fill();
    } else {
      ctx.fillRect(30, 30, 110, 38);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('1080p HD', 44, 56);

    // 4. Draw Channel Watermark
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(30, 650, 220, 38, 12);
      ctx.fill();
    } else {
      ctx.fillRect(30, 650, 220, 38);
    }
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('▶ ' + channelName, 45, 676);

    // 5. Draw 3D Text Overlays (Line 1 & Line 2)
    ctx.textAlign = 'center';

    const startY = line2 ? 340 : 380;

    if (line1) {
      const text1 = line1.toUpperCase();
      const fontSize1 = text1.length > 40 ? 38 : text1.length > 25 ? 44 : 54;
      ctx.font = `900 ${fontSize1}px "Impact", "Arial Black", sans-serif`;

      // Heavy 3D Stroke
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text1, 640, startY);

      // Gold Glow
      ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
      ctx.shadowBlur = 25;

      ctx.fillStyle = '#fbbf24';
      ctx.fillText(text1, 640, startY);
      ctx.shadowBlur = 0;
    }

    if (line2) {
      const text2 = line2.toUpperCase();
      const fontSize2 = text2.length > 40 ? 34 : text2.length > 25 ? 40 : 48;
      ctx.font = `900 ${fontSize2}px "Impact", "Arial Black", sans-serif`;

      // Heavy 3D Stroke
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text2, 640, startY + 66);

      // Cyan Glow
      ctx.shadowColor = 'rgba(34, 211, 238, 0.9)';
      ctx.shadowBlur = 25;

      ctx.fillStyle = '#22d3ee';
      ctx.fillText(text2, 640, startY + 66);
      ctx.shadowBlur = 0;
    }


    resolve(canvas.toDataURL('image/png'));
  });
}

// Generate Instant AI Image from Prompt using Pollinations AI (Free Unlimited AI Image Engine)
export function generateAIThumbnailImage(promptEn) {
  const cleanPrompt = encodeURIComponent(
    `${promptEn}, Xianxia anime master piece, glowing magic aura, 8k resolution cinematic, 16:9 ratio`
  );
  // Seed randomizer
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&seed=${seed}&nologo=true`;
}
