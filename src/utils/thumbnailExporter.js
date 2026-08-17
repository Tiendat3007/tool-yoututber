// 1080p HD Canvas Thumbnail Exporter Engine with Dynamic Color Themes & Presets

export const THUMBNAIL_COLOR_THEMES = [
  { id: 'gold-cyan', name: '🌟 Vàng Kim & Xanh Ngọc', color1: '#fbbf24', color2: '#22d3ee', glow1: 'rgba(251, 191, 36, 0.95)', glow2: 'rgba(34, 211, 238, 0.95)' },
  { id: 'flame-yellow', name: '🔥 Đỏ Lửa & Vàng Neon', color1: '#ef4444', color2: '#facc15', glow1: 'rgba(239, 68, 68, 0.95)', glow2: 'rgba(250, 204, 21, 0.95)' },
  { id: 'purple-ice', name: '💜 Tím Ma Tôn & Xanh Băng', color1: '#c084fc', color2: '#38bdf8', glow1: 'rgba(192, 132, 252, 0.95)', glow2: 'rgba(56, 189, 248, 0.95)' },
  { id: 'green-silver', name: '⚡ Xanh Neon & Trắng Bạc', color1: '#4ade80', color2: '#f8fafc', glow1: 'rgba(74, 222, 128, 0.95)', glow2: 'rgba(248, 250, 252, 0.95)' },
];

export async function exportThumbnailHD({
  bgImage,
  line1 = '',
  line2 = '',
  channelName = 'TU TIÊN ANIME',
  themeId = 'gold-cyan'
}) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    const selectedTheme = THUMBNAIL_COLOR_THEMES.find(t => t.id === themeId) || THUMBNAIL_COLOR_THEMES[0];

    const renderLayers = (imgObj) => {
      // 1. Draw Background Image or Dark Gradient
      if (imgObj) {
        ctx.drawImage(imgObj, 0, 0, 1280, 720);
      } else {
        const bgGradient = ctx.createRadialGradient(640, 360, 50, 640, 360, 700);
        bgGradient.addColorStop(0, '#1e1b4b');
        bgGradient.addColorStop(0.5, '#0f172a');
        bgGradient.addColorStop(1, '#020617');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 1280, 720);
      }

      // 2. Cinematic Vignette Overlay
      const vignette = ctx.createRadialGradient(640, 360, 200, 640, 360, 750);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.6)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, 1280, 720);

      // Bottom Shadow Gradient
      const bottomGrad = ctx.createLinearGradient(0, 450, 0, 720);
      bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, 450, 1280, 270);

      // 3. Top Badges (1080p HD & Duration)
      ctx.fillStyle = 'rgba(0, 242, 254, 0.9)';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(30, 25, 110, 34, 6);
        ctx.fill();
      } else {
        ctx.fillRect(30, 25, 110, 34);
      }
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('1080p HD', 48, 48);

      // 4. Channel Watermark Pill
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

        // Glow
        ctx.shadowColor = selectedTheme.glow1;
        ctx.shadowBlur = 25;

        ctx.fillStyle = selectedTheme.color1;
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

        // Glow
        ctx.shadowColor = selectedTheme.glow2;
        ctx.shadowBlur = 25;

        ctx.fillStyle = selectedTheme.color2;
        ctx.fillText(text2, 640, startY + 66);
        ctx.shadowBlur = 0;
      }

      resolve(canvas.toDataURL('image/png'));
    };

    if (bgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => renderLayers(img);
      img.onerror = () => renderLayers(null);
      img.src = bgImage;
    } else {
      renderLayers(null);
    }
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
