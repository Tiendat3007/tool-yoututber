import React from 'react';
import { computeDiff } from '../utils/diffUtils';

export default function DiffViewer({ oldText, newText, titleOld = 'Cũ', titleNew = 'Mới' }) {
  if (!oldText && !newText) return null;

  // If text hasn't changed
  if (oldText === newText) {
    return <div className="diff-no-change text-muted">{newText}</div>;
  }

  const diffs = computeDiff(oldText, newText);

  return (
    <div className="diff-viewer-wrapper">
      {/* Visual Side-by-Side or Word Highlight Diff */}
      <div className="diff-inline-box">
        {diffs.map((part, index) => {
          if (part.type === 'removed') {
            return (
              <span key={index} className="diff-word diff-word-removed">
                {part.value}
              </span>
            );
          }
          if (part.type === 'added') {
            return (
              <span key={index} className="diff-word diff-word-added">
                {part.value}
              </span>
            );
          }
          return <span key={index}>{part.value}</span>;
        })}
      </div>

      {/* Structured Comparison Bar: Red (Old) vs Green (New) */}
      <div className="diff-blocks-grid">
        <div className="diff-block block-old">
          <span className="block-label label-red">{titleOld}:</span>
          <span className="block-text text-red-strikethrough">{oldText || '(Trống)'}</span>
        </div>
        <div className="diff-block block-new">
          <span className="block-label label-green">{titleNew}:</span>
          <span className="block-text text-green-highlight">{newText || '(Trống)'}</span>
        </div>
      </div>
    </div>
  );
}
