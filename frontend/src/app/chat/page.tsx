'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { User, Model, ChatMessage as ChatMessageType, MessageRole } from '@/types'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

interface Message {
  id?: number
  role: MessageRole
  content: string
  sources?: any[]
  isStreaming?: boolean
}

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAuth()
    return () => {
      // Cleanup WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    loadModels()
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Auth check failed:', error)
      toast.error('Session expired. Please login again.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadModels = async () => {
    if (!user) return

    try {
      const response = await api.get('/api/models')
      setModels(response.data)
      if (response.data.length > 0) {
        setSelectedModel(response.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
      toast.error('Failed to load models')
    }
  }

  const connectWebSocket = () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/api/chat/ws?token=${token}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'user_message') {
        setSessionId(data.session_id)
      } else if (data.type === 'sources') {
        // Update last assistant message with sources
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === MessageRole.ASSISTANT) {
            newMessages[newMessages.length - 1].sources = data.sources
          }
          return newMessages
        })
      } else if (data.type === 'stream_start') {
        setMessages(prev => [...prev, {
          role: MessageRole.ASSISTANT,
          content: '',
          isStreaming: true
        }])
      } else if (data.type === 'stream_chunk') {
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].isStreaming) {
            newMessages[newMessages.length - 1].content += data.content
          }
          return newMessages
        })
      } else if (data.type === 'stream_end') {
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1].isStreaming = false
          }
          return newMessages
        })
        setSending(false)
      } else if (data.type === 'error') {
        toast.error(data.error)
        setSending(false)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      toast.error('Connection error')
      setSending(false)
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
    }

    wsRef.current = ws
  }

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    // Add user message to UI
    setMessages(prev => [...prev, {
      role: MessageRole.USER,
      content: userMessage
    }])

    // Connect WebSocket if not connected
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket()
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Send message via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: userMessage,
        model_id: selectedModel,
        session_id: sessionId,
        top_k: 5
      }))
    } else {
      toast.error('Connection not ready. Please try again.')
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedModel) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/csv', 'text/plain']
    const allowedExtensions = ['.pdf', '.csv', '.txt']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('Only PDF, CSV, and TXT files are supported')
      return
    }

    // Validate file size (250MB limit)
    const maxSize = 250 * 1024 * 1024 // 250MB in bytes
    if (file.size > maxSize) {
      toast.error('File size must be less than 250MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('model_id', selectedModel.toString())

      const response = await api.post('/api/chat/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        params: {
          model_id: selectedModel
        }
      })

      toast.success(response.data.message || 'File uploaded successfully')

      // Add a system message to chat
      setMessages(prev => [...prev, {
        role: MessageRole.ASSISTANT,
        content: `📎 File "${file.name}" uploaded and is being processed. You can start asking questions about it once processing is complete (usually takes a few seconds to a minute depending on file size).`
      }])
    } catch (error: any) {
      console.error('File upload error:', error)
      toast.error(error.response?.data?.detail || 'Failed to upload file')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    toast.success('Logged out successfully')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Chat
            </h1>
            {models.length > 0 && (
              <select
                value={selectedModel || ''}
                onChange={(e) => setSelectedModel(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {models.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No models available. Contact an administrator.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start a conversation with the AI
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
              Ask questions about your documents
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              💡 Tip: Use the 📎 button to upload files (PDF, CSV, TXT) and ask questions about them
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-3 rounded-lg ${
                    message.role === MessageRole.USER
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {message.role === MessageRole.ASSISTANT ? (
                    <>
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            Sources:
                          </p>
                          <div className="space-y-1">
                            {message.sources.map((source, idx) => (
                              <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                📄 {source.document_name}
                                {source.page && ` (Page ${source.page})`}
                                {source.similarity_score && (
                                  <span className="ml-2 text-gray-400">
                                    ({(source.similarity_score * 100).toFixed(0)}% match)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={models.length === 0 || uploading || sending}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Upload a file (PDF, CSV, or TXT)"
            >
              {uploading ? '⏳' : '📎'}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={models.length === 0 ? 'No models available' : 'Ask a question...'}
              disabled={models.length === 0 || sending}
              rows={2}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || models.length === 0 || sending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press Enter to send, Shift+Enter for new line
            </p>
            {uploading && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Uploading file...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
