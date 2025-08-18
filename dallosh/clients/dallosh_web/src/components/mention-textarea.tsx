"use client";

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { parseMentions } from '@/lib/utils/mention-parser';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onCursorPositionChange?: (position: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export function MentionTextarea({
  value,
  onChange,
  onCursorPositionChange,
  placeholder,
  className,
  disabled,
  maxLength
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync scroll between textarea and highlight layer
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Handle cursor position changes
  const handleSelectionChange = () => {
    if (textareaRef.current && onCursorPositionChange) {
      onCursorPositionChange(textareaRef.current.selectionStart || 0);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    handleSelectionChange();
  };

  const handleKeyUp = () => {
    handleSelectionChange();
  };

  const handleClick = () => {
    handleSelectionChange();
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      {/* Highlight layer - positioned behind the textarea */}
      <div
        ref={highlightRef}
        className={cn(
          "absolute inset-0 pointer-events-none overflow-hidden",
          "whitespace-pre-wrap break-words",
          "text-transparent", // Make base text transparent so highlights show through
          "p-3 text-base leading-6",
          "font-inherit"
        )}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {/* Render the text with highlighted mentions */}
        <div className="text-white">
          {parseMentions(value)}
        </div>
      </div>

      {/* Actual textarea - transparent text so highlights show through */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onScroll={handleScroll}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={cn(
          "w-full resize-none bg-transparent border-none outline-none",
          "text-transparent caret-white", // Make text transparent but keep caret visible
          "p-3 text-base leading-6",
          "placeholder:text-gray-400",
          "font-inherit",
          "relative z-10" // Above the highlight layer
        )}
        style={{
          minHeight: '48px',
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      />

      {/* Show placeholder when empty and not focused */}
      {!value && !isFocused && placeholder && (
        <div className="absolute top-3 left-3 text-gray-400 pointer-events-none text-base">
          {placeholder}
        </div>
      )}
    </div>
  );
}


