/**
 * Sample posts data structure for chat sessions
 * Posts are stored in the chat sessions table with source and content fields
 * This demonstrates how user posts from social media should be stored
 */

export interface SamplePost {
  uid: string;
  data: {
    content: string;
    source: string;
    userName: string;
    userId: string;
    createdAt: number;
    sentiment?: {
      score: number;
      comparative: number;
      positive: string[];
      negative: string[];
    };
    metadata?: {
      language: string;
      hashtags: string[];
      mentions: string[];
      urls: string[];
    };
  };
}

export const samplePosts: SamplePost[] = [
  {
    uid: "post-1",
    data: {
      content: "I'm having trouble with the new update. The app keeps crashing when I try to upload files. Anyone else experiencing this?",
      source: "twitter",
      userName: "john_doe",
      userId: "user-1",
      createdAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
      sentiment: {
        score: -2,
        comparative: -0.2,
        positive: [],
        negative: ["trouble", "crashing"]
      },
      metadata: {
        language: "en",
        hashtags: ["#appupdate", "#bugreport"],
        mentions: [],
        urls: []
      }
    }
  },
  {
    uid: "post-2",
    data: {
      content: "The new update is amazing! Much faster performance and the new features are really useful. Great job team!",
      source: "facebook",
      userName: "jane_smith",
      userId: "user-2",
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      sentiment: {
        score: 4,
        comparative: 0.4,
        positive: ["amazing", "faster", "useful", "great"],
        negative: []
      },
      metadata: {
        language: "en",
        hashtags: ["#update", "#performance"],
        mentions: [],
        urls: []
      }
    }
  },
  {
    uid: "post-3",
    data: {
      content: "Having issues with file upload. App crashes every time. Need help ASAP!",
      source: "twitter",
      userName: "tech_user",
      userId: "user-3",
      createdAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
      sentiment: {
        score: -3,
        comparative: -0.3,
        positive: [],
        negative: ["issues", "crashes", "ASAP"]
      },
      metadata: {
        language: "en",
        hashtags: ["#help", "#bug"],
        mentions: [],
        urls: []
      }
    }
  },
  {
    uid: "post-4",
    data: {
      content: "Love the new interface! So much cleaner and easier to navigate. The dark mode is perfect.",
      source: "instagram",
      userName: "design_lover",
      userId: "user-4",
      createdAt: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
      sentiment: {
        score: 3,
        comparative: 0.3,
        positive: ["love", "cleaner", "easier", "perfect"],
        negative: []
      },
      metadata: {
        language: "en",
        hashtags: ["#interface", "#darkmode"],
        mentions: [],
        urls: []
      }
    }
  },
  {
    uid: "post-5",
    data: {
      content: "Can't seem to get the file upload working. Tried everything but still getting errors. Any suggestions?",
      source: "linkedin",
      userName: "professional_user",
      userId: "user-5",
      createdAt: Date.now() - 18 * 60 * 60 * 1000, // 18 hours ago
      sentiment: {
        score: -1,
        comparative: -0.1,
        positive: [],
        negative: ["can't", "errors"]
      },
      metadata: {
        language: "en",
        hashtags: ["#fileupload", "#help"],
        mentions: [],
        urls: []
      }
    }
  }
];

/**
 * Chat sessions table schema for reference
 * Posts are stored as chat sessions with source and content fields
 */
export const chatSessionsTableSchema = {
  name: "chat",
  fields: {
    content: { type: "string", required: false }, // For posts
    source: { type: "string", required: false }, // Social media platform
    userName: { type: "string", required: false },
    userId: { type: "string", required: true },
    createdAt: { type: "number", required: true },
    // Other chat session fields...
    sentiment: {
      type: "object",
      fields: {
        score: { type: "number" },
        comparative: { type: "number" },
        positive: { type: "array", items: { type: "string" } },
        negative: { type: "array", items: { type: "string" } }
      }
    },
    metadata: {
      type: "object",
      fields: {
        language: { type: "string" },
        hashtags: { type: "array", items: { type: "string" } },
        mentions: { type: "array", items: { type: "string" } },
        urls: { type: "array", items: { type: "string" } }
      }
    }
  }
};
