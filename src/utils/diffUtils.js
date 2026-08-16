// Simple Word-level Diff Generator for Subtitle History Tracking
// Red = Old/Deleted, Green = New/Inserted

export function computeDiff(oldText, newText) {
  if (!oldText && !newText) return [];
  if (!oldText) return [{ type: 'added', value: newText }];
  if (!newText) return [{ type: 'removed', value: oldText }];
  if (oldText === newText) return [{ type: 'unchanged', value: newText }];

  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // Simple Longest Common Subsequence or word token diff
  let i = 0, j = 0;
  const result = [];

  // For subtitle lines, if texts are completely different (e.g. Translation from Chinese to Vietnamese),
  // show full Old (Red) -> New (Green)
  const isTransformed = Math.abs(oldWords.length - newWords.length) > Math.max(oldWords.length, newWords.length) * 0.7;

  if (isTransformed) {
    return [
      { type: 'removed', value: oldText },
      { type: 'added', value: newText }
    ];
  }

  // Word by word matching
  while (i < oldWords.length || j < newWords.length) {
    if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
      result.push({ type: 'unchanged', value: oldWords[i] });
      i++;
      j++;
    } else if (j < newWords.length && (!oldWords.includes(newWords[j]) || oldWords.indexOf(newWords[j]) < i)) {
      result.push({ type: 'added', value: newWords[j] });
      j++;
    } else if (i < oldWords.length) {
      result.push({ type: 'removed', value: oldWords[i] });
      i++;
    }
  }

  return result;
}
