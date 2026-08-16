// SRT and VTT Parsing & Formatting Utilities

export function parseSRT(srtText) {
  if (!srtText || typeof srtText !== 'string') return [];

  // Normalize line endings
  const normalized = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\n+/);
  const parsed = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n');
    if (lines.length < 2) return;

    let index = idx + 1;
    let timeLineIdx = 0;

    // First line might be index
    if (/^\d+$/.test(lines[0].trim())) {
      index = parseInt(lines[0].trim(), 10);
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx] || '';
    const match = timeLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);

    if (match) {
      const startTime = match[1].replace('.', ',');
      const endTime = match[2].replace('.', ',');
      const originalText = lines.slice(timeLineIdx + 1).join('\n');

      parsed.push({
        id: `sub_${index}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        index: index,
        startTime: startTime,
        endTime: endTime,
        originalText: originalText,
        translatedText: originalText, // default same as original until translated
        status: 'pending'
      });
    }
  });

  return parsed;
}

export function generateSRT(subtitles, useTranslation = true) {
  return subtitles.map((sub, idx) => {
    const text = useTranslation ? (sub.translatedText || sub.originalText) : sub.originalText;
    return `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${text}`;
  }).join('\n\n');
}

export function generateVTT(subtitles, useTranslation = true) {
  const header = "WEBVTT\n\n";
  const body = subtitles.map((sub, idx) => {
    const start = sub.startTime.replace(',', '.');
    const end = sub.endTime.replace(',', '.');
    const text = useTranslation ? (sub.translatedText || sub.originalText) : sub.originalText;
    return `${idx + 1}\n${start} --> ${end}\n${text}`;
  }).join('\n\n');

  return header + body;
}

// Convert "HH:MM:SS,mmm" to total milliseconds
export function timestampToMs(timestamp) {
  if (!timestamp) return 0;
  const clean = timestamp.replace('.', ',');
  const parts = clean.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secParts = parts[2].split(',');
  const seconds = parseInt(secParts[0], 10);
  const ms = parseInt(secParts[1] || '0', 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
}

// Convert total milliseconds back to "HH:MM:SS,mmm"
export function msToTimestamp(ms) {
  if (ms < 0) ms = 0;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  const pad = (n, width = 2) => String(n).padStart(width, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

// Shift timestamp by offsetMs (+ or -)
export function shiftSubtitlesTime(subtitles, offsetMs) {
  return subtitles.map(sub => {
    const startMs = timestampToMs(sub.startTime) + offsetMs;
    const endMs = timestampToMs(sub.endTime) + offsetMs;
    return {
      ...sub,
      startTime: msToTimestamp(startMs),
      endTime: msToTimestamp(endMs)
    };
  });
}
