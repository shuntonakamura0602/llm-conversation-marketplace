export type Message = { role: "user" | "assistant"; content: string };
export type Author = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  attributes?: string;
};
export type Conversation = {
  id: string;
  title: string;
  description: string;
  user_id: string;
  llm: string;
  messages: Message[];
  free_message_count?: number | null;
  total_message_count?: number | null;
  tags: string[];
  summary: string[];
  created_at: string;
  published: boolean;
  estimated_reading_minutes: number;
  view_count: number;
  users: Author;
};
