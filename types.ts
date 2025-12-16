export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  image?: string; // Data URL for the image
  isStreaming?: boolean;
  timestamp: number;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
}