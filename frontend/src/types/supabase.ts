export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          avatar_url: string | null
          preferences: Json | null
          role: 'teacher' | 'student'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          avatar_url?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          avatar_url?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          text: string
          type: string
          topic: string
          difficulty: string
          answers: Json | null
          solution: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          type: string
          topic: string
          difficulty: string
          answers?: Json | null
          solution?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          type?: string
          topic?: string
          difficulty?: string
          answers?: Json | null
          solution?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export interface DbTask {
  id: string;
  user_id: string;
  text: string;
  type: string;
  topic: string;
  difficulty: string;
  solution: string | null;
  answer: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSheet {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  tasks: string[]; 
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string; role: 'teacher' | 'student';
  created_at: string;
  updated_at: string;
} 