export enum Platform {
  Instagram = 'Instagram',
  Twitter = 'Twitter/X',
  LinkedIn = 'LinkedIn',
  TikTok = 'TikTok',
  General = 'General'
}

export enum Tone {
  Casual = 'Casual',
  Professional = 'Professional',
  Funny = 'Funny',
  Inspirational = 'Inspirational',
  Persuasive = 'Persuasive'
}

export enum Length {
  Short = 'Short',
  Medium = 'Medium',
  Long = 'Long'
}

export enum ContentFormat {
  Caption = 'Caption',
  Post = 'Post', // Image + Text
  Video = 'Video' // Video + Text
}

export interface GenerationRequest {
  prompt: string;
  platform: Platform;
  tone: Tone;
  length: Length;
  format: ContentFormat;
}

export interface GeneratedContent {
  caption: string;
  hashtags: string[];
  emojis: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface AppState {
  prompt: string;
  platform: Platform;
  tone: Tone;
  length: Length;
  format: ContentFormat;
  result: GeneratedContent | null;
  loading: boolean;
  loadingMessage?: string;
  error: string | null;
}