declare module 'multilang-sentiment' {
  interface SentimentResult {
    score: number;
    comparative: number;
    positive: string[];
    negative: string[];
    tokens: string[];
    words: string[];
  }

  function sentiment(text: string, language?: string): SentimentResult;
  export = sentiment;
}


