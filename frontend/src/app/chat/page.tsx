'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { User, Model, ChatMessage as ChatMessageType, MessageRole } from '@/types'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Paperclip, Loader2, FileText, Bot, Sparkles } from 'lucide-react'

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

    setMessages(prev => [...prev, {
      role: MessageRole.USER,
      content: userMessage
    }])

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket()
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

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

    const allowedTypes = ['application/pdf', 'text/csv', 'text/plain']
    const allowedExtensions = ['.pdf', '.csv', '.txt']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('Only PDF, CSV, and TXT files are supported')
      return
    }

    const maxSize = 250 * 1024 * 1024
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

      setMessages(prev => [...prev, {
        role: MessageRole.ASSISTANT,
        content: `📎 File "${file.name}" uploaded and is being processed. You can start asking questions about it once processing is complete.`
      }])
    } catch (error: any) {
      console.error('File upload error:', error)
      toast.error(error.response?.data?.detail || 'Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)]">
        {/* Chat Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Chat</h1>
              <p className="text-xs text-muted-foreground">
                {models.find(m => m.id === selectedModel)?.name || 'No model selected'}
              </p>
            </div>
          </div>
          {models.length > 0 && (
            <Select
              value={selectedModel?.toString() || ''}
              onValueChange={(value) => setSelectedModel(parseInt(value))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id.toString()}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            {models.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No models available. Contact an administrator.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold">Start a conversation</h2>
                  <p className="text-muted-foreground max-w-sm">
                    Ask questions about your documents or chat with the AI model.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" /> PDF
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" /> CSV
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" /> TXT
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                        message.role === MessageRole.USER
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      }`}
                    >
                      {message.role === MessageRole.ASSISTANT ? (
                        <>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                          </div>
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Sources:
                              </p>
                              <div className="space-y-1">
                                {message.sources.map((source, idx) => (
                                  <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {source.document_name}
                                    {source.page && ` (Page ${source.page})`}
                                    {source.similarity_score && (
                                      <Badge variant="outline" className="ml-1 text-xs">
                                        {(source.similarity_score * 100).toFixed(0)}%
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={models.length === 0 || uploading || sending}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={models.length === 0 ? 'No models available' : 'Type a message...'}
                disabled={models.length === 0 || sending}
                rows={1}
                className="min-h-[44px] max-h-[120px] resize-none"
              />

              <Button
                onClick={handleSend}
                disabled={!input.trim() || models.length === 0 || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
