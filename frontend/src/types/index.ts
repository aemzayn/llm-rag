// User types
export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

// Model types
export enum LLMProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  CUSTOM = 'custom',
}

export interface Model {
  id: number
  name: string
  description?: string
  llm_provider: LLMProvider
  llm_model_name: string
  created_by: number
  created_at: string
  updated_at?: string
}

// Document types
export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Document {
  id: number
  model_id: number
  filename: string
  file_size: number
  file_type: string
  status: DocumentStatus
  error_message?: string
  uploaded_by: number
  created_at: string
  processed_at?: string
}

// Chat types
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface ChatMessage {
  id: number
  session_id: number
  user_id: number
  role: MessageRole
  content: string
  sources?: Array<{
    document_id: number
    document_name: string
    chunk_content: string
    page?: number
  }>
  created_at: string
}

export interface ChatSession {
  id: number
  user_id: number
  model_id: number
  title?: string
  created_at: string
  updated_at?: string
}

// Auth types
export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  full_name: string
}
