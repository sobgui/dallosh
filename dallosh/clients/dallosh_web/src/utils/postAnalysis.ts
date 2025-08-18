import { stringSimilarity } from "string-similarity-js";
import sentiment from "wink-sentiment";

export interface PostAnalysisResult {
  similarity: number;
  commonWords: string[];
  sentimentScore: number;
  sentimentComparative: number;
  positiveWords: string[];
  negativeWords: string[];
}

export interface PostSimilarityGroup {
  posts: Array<{
    uid: string;
    content: string;
    userName: string;
    source: string;
    createdAt: number;
  }>;
  similarity: number;
  commonWords: string[];
}

/**
 * Analyze sentiment of a post
 */
export function analyzePostSentiment(content: string, language: string = 'en'): {
  score: number;
  comparative: number;
  positive: string[];
  negative: string[];
} {
  try {
    // Use the wink-sentiment package
    const result = sentiment(content);
    return {
      score: result.score,
      comparative: result.comparative,
      positive: result.positive || [],
      negative: result.negative || []
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Fallback to simple word-based sentiment analysis
    const words = content.toLowerCase().split(/\s+/);
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'unhappy', 'dissatisfied', 'problem', 'issue', 'error'];
    
    let score = 0;
    const positive: string[] = [];
    const negative: string[] = [];
    
    words.forEach(word => {
      if (positiveWords.includes(word)) {
        score += 1;
        positive.push(word);
      } else if (negativeWords.includes(word)) {
        score -= 1;
        negative.push(word);
      }
    });
    
    return {
      score: Math.max(-5, Math.min(5, score)), // Clamp between -5 and 5
      comparative: words.length > 0 ? score / words.length : 0,
      positive,
      negative
    };
  }
}

/**
 * Find similar posts based on content similarity
 */
export function findSimilarPosts(
  posts: Array<{
    uid: string;
    content: string;
    userName: string;
    source: string;
    createdAt: number;
  }>,
  similarityThreshold: number = 0.7
): PostSimilarityGroup[] {
  try {
    const groups: PostSimilarityGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < posts.length; i++) {
      if (processed.has(posts[i].uid)) continue;

      const group: PostSimilarityGroup = {
        posts: [posts[i]],
        similarity: 1,
        commonWords: []
      };

      processed.add(posts[i].uid);

      for (let j = i + 1; j < posts.length; j++) {
        if (processed.has(posts[j].uid)) continue;

        try {
          // Use the string-similarity-js package
          const similarity = stringSimilarity(posts[i].content, posts[j].content);
          
          if (similarity >= similarityThreshold) {
            group.posts.push(posts[j]);
            processed.add(posts[j].uid);
            
            // Find common words (simplified approach)
            const words1 = posts[i].content.toLowerCase().split(/\s+/);
            const words2 = posts[j].content.toLowerCase().split(/\s+/);
            const common = words1.filter(word => words2.includes(word) && word.length > 3);
            group.commonWords = Array.from(new Set([...group.commonWords, ...common]));
          }
        } catch (error) {
          console.warn('Error calculating similarity between posts:', error);
          // Enhanced fallback similarity calculation
          const content1 = posts[i].content.toLowerCase();
          const content2 = posts[j].content.toLowerCase();
          const words1 = content1.split(/\s+/).filter(word => word.length > 2);
          const words2 = content2.split(/\s+/).filter(word => word.length > 2);
          
          // Calculate Jaccard similarity as fallback
          const intersection = words1.filter(word => words2.includes(word));
          const union = Array.from(new Set([...words1, ...words2]));
          const similarity = union.length > 0 ? intersection.length / union.length : 0;
          
          if (similarity >= similarityThreshold) {
            group.posts.push(posts[j]);
            processed.add(posts[j].uid);
            group.commonWords = Array.from(new Set([...group.commonWords, ...intersection]));
          }
        }
      }

      if (group.posts.length > 1) {
        groups.push(group);
      }
    }

    return groups.sort((a, b) => b.posts.length - a.posts.length);
  } catch (error) {
    console.error('Error in findSimilarPosts:', error);
    return [];
  }
}

/**
 * Calculate overall sentiment statistics from posts
 */
export function calculateSentimentStats(posts: Array<{ content: string }>): {
  averageScore: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  distribution: { positive: number; neutral: number; negative: number };
} {
  try {
    let totalScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    posts.forEach(post => {
      if (post.content) {
        try {
          const analysis = analyzePostSentiment(post.content);
          totalScore += analysis.score;
          
          if (analysis.score > 0) positiveCount++;
          else if (analysis.score < 0) negativeCount++;
          else neutralCount++;
        } catch (error) {
          console.warn('Error analyzing post content:', error);
          neutralCount++; // Count as neutral if analysis fails
        }
      }
    });

    const total = posts.length;
    const averageScore = total > 0 ? Math.round((totalScore / total) * 10) / 10 : 0;

    return {
      averageScore,
      positiveCount,
      negativeCount,
      neutralCount,
      distribution: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount
      }
    };
  } catch (error) {
    console.error('Error in calculateSentimentStats:', error);
    return {
      averageScore: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      distribution: {
        positive: 0,
        neutral: 0,
        negative: 0
      }
    };
  }
}

/**
 * Group posts by source/platform
 */
export function groupPostsBySource(posts: Array<{ source: string; content: string }>): {
  [key: string]: Array<{ source: string; content: string }>;
} {
  try {
    const groups: { [key: string]: Array<{ source: string; content: string }> } = {};
    
    posts.forEach(post => {
      const source = post.source?.toLowerCase() || 'other';
      let normalizedSource = 'other';
      
      if (source.includes('twitter')) normalizedSource = 'twitter';
      else if (source.includes('facebook')) normalizedSource = 'facebook';
      else if (source.includes('instagram')) normalizedSource = 'instagram';
      else if (source.includes('linkedin')) normalizedSource = 'linkedin';
      
      if (!groups[normalizedSource]) {
        groups[normalizedSource] = [];
      }
      
      groups[normalizedSource].push(post);
    });
    
    return groups;
  } catch (error) {
    console.error('Error in groupPostsBySource:', error);
    return {
      twitter: [],
      facebook: [],
      instagram: [],
      linkedin: [],
      other: []
    };
  }
}
