export interface Project {
  id: string;
  name: string;
  location: string;
  date: Date;
  inspector: string;
  createdAt: Date;
  updatedAt: Date;
  notes: Note[];
  aiSummary?: string;
}

export interface Note {
  id: string;
  type: 'photo' | 'video' | 'text';
  content: string;
  transcription?: string;
  timestamp: Date;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}