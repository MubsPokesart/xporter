export type TweetType = "tweet" | "thread" | "article";

export interface TweetData {
  source: string;
  author: string;
  name: string;
  date: string;
  type: TweetType;
  content: string;
  topics: string[];
  mentions: string[];
}

export interface ExtractRequest {
  url: string;
}

export interface ExtractResponse {
  data?: TweetData;
  markdown?: string;
  error?: string;
}
