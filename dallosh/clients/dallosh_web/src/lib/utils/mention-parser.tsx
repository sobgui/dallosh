import React from 'react';
import Link from 'next/link';

/**
 * Parses text and returns JSX with @mentions, #hashtags, and URLs highlighted in blue
 */
export function parseMentions(text: string): React.ReactNode {
  if (!text) return text;

  // Define patterns for mentions, hashtags, and URLs
  const patterns = [
    { type: 'mention', regex: /@\w+/g },
    { type: 'hashtag', regex: /#\w+/g },
    { type: 'url', regex: /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g }
  ];

  // Find all matches with their positions
  const matches: Array<{ start: number; end: number; text: string; type: string }> = [];
  
  patterns.forEach(({ type, regex }) => {
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);
    while ((match = regexCopy.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        type
      });
    }
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep the first one)
  const filteredMatches = matches.filter((match, index) => {
    for (let i = 0; i < index; i++) {
      const prevMatch = matches[i];
      if (match.start < prevMatch.end) {
        return false; // This match overlaps with a previous one
      }
    }
    return true;
  });

  // Build the result
  const result: React.ReactNode[] = [];
  let currentIndex = 0;

  filteredMatches.forEach((match, index) => {
    // Add text before the match
    if (currentIndex < match.start) {
      result.push(text.slice(currentIndex, match.start));
    }

    // Add the styled match
    if (match.type === 'mention') {
      result.push(
        <span 
          key={`mention-${index}`}
          className="text-blue-400 font-medium hover:text-blue-300 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clicked mention:', match.text);
          }}
        >
          {match.text}
        </span>
      );
    } else if (match.type === 'hashtag') {
      result.push(
        <span 
          key={`hashtag-${index}`}
          className="text-blue-400 font-medium hover:text-blue-300 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clicked hashtag:', match.text);
          }}
        >
          {match.text}
        </span>
      );
    } else if (match.type === 'url') {
      // Ensure URL has protocol for proper linking
      let href = match.text;
      if (!match.text.match(/^https?:\/\//)) {
        href = match.text.startsWith('www.') ? `http://${match.text}` : `http://${match.text}`;
      }
      
      // Check if this is a local chat URL that should use Next.js navigation
      const isLocalChatUrl = (href.includes('localhost') || href.includes('127.0.0.1')) && href.includes('/chat/');
      
      if (isLocalChatUrl) {
        // Extract the path from the localhost URL for internal navigation
        const urlObj = new URL(href);
        const path = urlObj.pathname;
        
        result.push(
          <Link 
            key={`url-${index}`}
            href={path}
            target="_blank"
            className="text-blue-400 font-medium hover:text-blue-300 cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation(); // Prevent post click when clicking URL
            }}
          >
            {match.text}
          </Link>
        );
      } else {
        // External URL - open in new tab
        result.push(
          <a
            key={`url-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 font-medium hover:text-blue-300 cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation(); // Prevent post click when clicking URL
            }}
          >
            {match.text}
          </a>
        );
      }
    }

    currentIndex = match.end;
  });

  // Add remaining text after the last match
  if (currentIndex < text.length) {
    result.push(text.slice(currentIndex));
  }

  return result;
}

/**
 * Gets the styled text for input fields with mention highlighting
 */
export function getStyledInputText(text: string, cursorPosition: number): {
  beforeCursor: React.ReactNode;
  afterCursor: React.ReactNode;
} {
  const beforeText = text.slice(0, cursorPosition);
  const afterText = text.slice(cursorPosition);
  
  return {
    beforeCursor: parseMentions(beforeText),
    afterCursor: parseMentions(afterText)
  };
}

/**
 * Extracts all @mentions from text
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  
  const mentions = text.match(/@\w+/g) || [];
  return mentions.map(mention => mention.slice(1)); // Remove @ symbol
}

/**
 * Extracts all #hashtags from text
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  
  const hashtags = text.match(/#\w+/g) || [];
  return hashtags.map(hashtag => hashtag.slice(1)); // Remove # symbol
}

/**
 * Extracts all URLs from text
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  const urls = text.match(urlPattern) || [];
  
  return urls.map(url => {
    // Normalize URLs to include protocol
    if (!url.match(/^https?:\/\//)) {
      return url.startsWith('www.') ? `http://${url}` : `http://${url}`;
    }
    return url;
  });
}
