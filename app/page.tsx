'use client'

import { useState, useEffect, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  uploadAndTrainDocument,
  getDocuments,
  deleteDocuments,
  SUPPORTED_FILE_TYPES
} from '@/lib/ragKnowledgeBase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Send,
  Phone,
  PhoneOff,
  Mic,
  Upload,
  Trash2,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const RAG_ID = '698bcb1767a82d6d27bdde86'
const VOICE_AGENT_ID = '698bcb2b826fb6a1a0ca007a'
const CHAT_AGENT_ID = '698bcb2b826fb6a1a0ca007a'

// Theme colors from Emerald theme
const THEME_VARS = {
  '--background': '160 35% 96%',
  '--foreground': '160 35% 8%',
  '--card': '160 30% 99%',
  '--card-foreground': '160 35% 8%',
  '--popover': '160 30% 99%',
  '--popover-foreground': '160 35% 8%',
  '--primary': '160 85% 35%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '160 30% 93%',
  '--secondary-foreground': '160 35% 12%',
  '--muted': '160 25% 90%',
  '--muted-foreground': '160 25% 40%',
  '--accent': '45 95% 50%',
  '--accent-foreground': '160 35% 8%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '160 28% 88%',
  '--input': '160 25% 85%',
  '--ring': '160 85% 35%',
  '--radius': '0.875rem'
} as React.CSSProperties

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
  channel: 'chat' | 'voice'
}

interface ConversationRecord {
  id: string
  date: string
  channel: 'chat' | 'voice'
  customer: string
  summary: string
  messages: ChatMessage[]
}

interface KnowledgeBaseDoc {
  filename: string
  uploadedAt: string
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function ChatInterface({
  messages,
  onSendMessage,
  loading,
  useSampleData
}: {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  loading: boolean
  useSampleData: boolean
}) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSendMessage(input)
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        {messages.length === 0 && !useSampleData && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Start a Conversation</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Type your customer service question below and our AI agent will assist you using our knowledge base and support tools.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border/50 backdrop-blur-lg shadow-lg'
                }`}
              >
                {renderMarkdown(msg.content)}
                <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/50 backdrop-blur-lg rounded-2xl px-4 py-3 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 bg-card/50 backdrop-blur-lg p-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 bg-background/50 border-border/50"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} className="px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

function VoiceCallPanel({ useSampleData }: { useSampleData: boolean }) {
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle')
  const [transcript, setTranscript] = useState<string[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [sessionData, setSessionData] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef(false)

  const startCall = async () => {
    setCallState('connecting')
    setTranscript([])

    try {
      const res = await fetch('https://voice-sip.studio.lyzr.ai/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: VOICE_AGENT_ID })
      })

      const data = await res.json()
      setSessionData(data)

      const sampleRate = data.audioConfig?.sampleRate ?? 24000

      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate })

      // Connect WebSocket
      const ws = new WebSocket(data.wsUrl)
      wsRef.current = ws

      ws.onopen = async () => {
        setCallState('active')
        setTranscript(prev => [...prev, 'System: Call connected'])

        // Start microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          mediaStreamRef.current = stream

          const audioContext = new AudioContext({ sampleRate })
          const source = audioContext.createMediaStreamSource(stream)
          const processor = audioContext.createScriptProcessor(4096, 1, 1)

          processor.onaudioprocess = (e) => {
            if (isMuted || !ws || ws.readyState !== WebSocket.OPEN) return

            const inputData = e.inputBuffer.getChannelData(0)
            const pcm16 = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
            }

            const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))
            ws.send(JSON.stringify({ type: 'audio', audio: base64, sampleRate }))
          }

          source.connect(processor)
          processor.connect(audioContext.destination)
        } catch (err) {
          console.error('Microphone error:', err)
          setTranscript(prev => [...prev, 'System: Microphone access denied'])
        }
      }

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data)

        if (msg.type === 'audio' && msg.audio) {
          const audioData = Uint8Array.from(atob(msg.audio), c => c.charCodeAt(0))
          audioQueueRef.current.push(audioData.buffer)
          if (!isPlayingRef.current) playNextAudio()
        } else if (msg.type === 'transcript') {
          setTranscript(prev => [...prev, `Agent: ${msg.text || ''}`])
        } else if (msg.type === 'thinking') {
          setTranscript(prev => [...prev, 'Agent: (thinking...)'])
        } else if (msg.type === 'error') {
          setTranscript(prev => [...prev, `Error: ${msg.message || 'Unknown error'}`])
        }
      }

      ws.onerror = () => {
        setTranscript(prev => [...prev, 'System: Connection error'])
        endCall()
      }

      ws.onclose = () => {
        setCallState('ended')
        setTranscript(prev => [...prev, 'System: Call ended'])
      }
    } catch (err) {
      console.error('Call start error:', err)
      setTranscript(['System: Failed to start call'])
      setCallState('idle')
    }
  }

  const playNextAudio = async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      return
    }

    isPlayingRef.current = true
    const audioData = audioQueueRef.current.shift()!

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0))
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.onended = () => playNextAudio()
      source.start()
    } catch (err) {
      console.error('Audio playback error:', err)
      playNextAudio()
    }
  }

  const endCall = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setCallState('ended')
    setTimeout(() => setCallState('idle'), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
      <Card className="w-full max-w-2xl bg-card/50 backdrop-blur-lg border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Voice Call</CardTitle>
          <CardDescription>Speak directly with our AI customer service agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
              callState === 'active' ? 'bg-primary/20 animate-pulse' : 'bg-muted'
            }`}>
              <Phone className={`w-12 h-12 ${callState === 'active' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>

            <Badge variant={
              callState === 'active' ? 'default' :
              callState === 'connecting' ? 'secondary' :
              callState === 'ended' ? 'outline' : 'secondary'
            } className="text-sm px-4 py-1">
              {callState === 'idle' && 'Ready to Call'}
              {callState === 'connecting' && 'Connecting...'}
              {callState === 'active' && 'Call in Progress'}
              {callState === 'ended' && 'Call Ended'}
            </Badge>
          </div>

          <div className="flex justify-center gap-4">
            {callState === 'idle' && (
              <Button onClick={startCall} size="lg" className="px-8">
                <Phone className="w-4 h-4 mr-2" />
                Start Call
              </Button>
            )}

            {callState === 'active' && (
              <>
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant={isMuted ? 'destructive' : 'secondary'}
                  size="lg"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button onClick={endCall} variant="destructive" size="lg">
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Call
                </Button>
              </>
            )}
          </div>

          {transcript.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Live Transcript
                </h4>
                <ScrollArea className="h-64 rounded-lg border border-border/50 bg-background/50 p-4">
                  <div className="space-y-2">
                    {transcript.map((line, i) => (
                      <p key={i} className="text-sm text-foreground/80">{line}</p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {!useSampleData && callState === 'idle' && transcript.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Click "Start Call" to begin a voice conversation with the AI agent
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Dashboard({
  conversations,
  useSampleData
}: {
  conversations: ConversationRecord[]
  useSampleData: boolean
}) {
  const [filter, setFilter] = useState<'all' | 'chat' | 'voice'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = conversations.filter(c => filter === 'all' || c.channel === filter)

  const totalChats = conversations.filter(c => c.channel === 'chat').length
  const totalVoice = conversations.filter(c => c.channel === 'voice').length

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{conversations.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Chat Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent-foreground">{totalChats}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border/50 backdrop-blur-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Voice Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalVoice}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-lg border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conversation History</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'chat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('chat')}
              >
                Chat
              </Button>
              <Button
                variant={filter === 'voice' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('voice')}
              >
                Voice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 && !useSampleData && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No conversations yet. Start a chat or voice call to see history here.</p>
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((conv) => (
              <div key={conv.id} className="border border-border/50 rounded-lg bg-background/50 overflow-hidden shadow-sm">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between"
                  onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Badge variant={conv.channel === 'chat' ? 'default' : 'secondary'}>
                      {conv.channel}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{conv.customer}</div>
                      <div className="text-xs text-muted-foreground">{conv.summary}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{conv.date}</div>
                  </div>
                  {expandedId === conv.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {expandedId === conv.id && (
                  <div className="border-t border-border/50 p-4 bg-muted/20">
                    <div className="space-y-2">
                      {conv.messages.map((msg) => (
                        <div key={msg.id} className={`text-sm ${msg.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <span className="font-medium">{msg.role === 'user' ? 'Customer' : 'Agent'}:</span> {msg.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KnowledgeBaseManager() {
  const [documents, setDocuments] = useState<KnowledgeBaseDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const docs = await getDocuments(RAG_ID)
      if (Array.isArray(docs)) {
        setDocuments(docs.map((d: any) => ({
          filename: d?.filename ?? 'Unknown',
          uploadedAt: d?.uploadedAt ?? new Date().toISOString()
        })))
      }
    } catch (err) {
      console.error('Load documents error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await uploadAndTrainDocument(RAG_ID, file)
      await loadDocuments()
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (filename: string) => {
    try {
      await deleteDocuments(RAG_ID, [filename])
      await loadDocuments()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  return (
    <Card className="bg-card/50 backdrop-blur-lg border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Knowledge Base Documents
        </CardTitle>
        <CardDescription>
          Upload documents to improve agent responses. Supported: {SUPPORTED_FILE_TYPES.join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            accept={SUPPORTED_FILE_TYPES.join(',')}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No documents uploaded yet. Upload files to enhance the knowledge base.
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.filename} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 shadow-sm">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{doc.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.filename)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const [useSampleData, setUseSampleData] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString())
    const interval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (useSampleData) {
      const sampleMessages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'I need help resetting my password. I\'ve tried the forgot password link but haven\'t received any email.',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          channel: 'chat'
        },
        {
          id: '2',
          role: 'agent',
          content: 'I\'m sorry you\'re having trouble resetting your password. Let\'s get this sorted out quickly! To assist you better, could you please provide the following information:\n\n1. The email address associated with your account.\n2. Whether you\'ve checked your spam or junk folder for the reset email.\n\nOnce I have this information, I can investigate further or escalate the issue for manual assistance if needed.',
          timestamp: new Date(Date.now() - 280000).toISOString(),
          channel: 'chat'
        },
        {
          id: '3',
          role: 'user',
          content: 'My email is john@example.com and yes, I checked spam folder.',
          timestamp: new Date(Date.now() - 240000).toISOString(),
          channel: 'chat'
        },
        {
          id: '4',
          role: 'agent',
          content: 'Thank you for confirming! I\'ve created a support ticket (#12345) and our technical team will manually send you a password reset link within the next 15 minutes. You\'ll receive it at john@example.com. Is there anything else I can help you with today?',
          timestamp: new Date(Date.now() - 220000).toISOString(),
          channel: 'chat'
        }
      ]
      setChatMessages(sampleMessages)

      const sampleConversations: ConversationRecord[] = [
        {
          id: 'conv1',
          date: new Date().toLocaleDateString(),
          channel: 'chat',
          customer: 'john@example.com',
          summary: 'Password reset issue - ticket created',
          messages: sampleMessages
        },
        {
          id: 'conv2',
          date: new Date(Date.now() - 86400000).toLocaleDateString(),
          channel: 'voice',
          customer: 'Customer #4231',
          summary: 'Billing inquiry - resolved',
          messages: [
            { id: 'v1', role: 'user', content: 'Question about my last invoice', timestamp: new Date(Date.now() - 86400000).toISOString(), channel: 'voice' },
            { id: 'v2', role: 'agent', content: 'Let me look that up for you...', timestamp: new Date(Date.now() - 86380000).toISOString(), channel: 'voice' }
          ]
        },
        {
          id: 'conv3',
          date: new Date(Date.now() - 172800000).toLocaleDateString(),
          channel: 'chat',
          customer: 'sarah@example.com',
          summary: 'Product recommendation - completed',
          messages: [
            { id: 'c1', role: 'user', content: 'Which plan is best for small teams?', timestamp: new Date(Date.now() - 172800000).toISOString(), channel: 'chat' },
            { id: 'c2', role: 'agent', content: 'For small teams, I recommend our Team Plan...', timestamp: new Date(Date.now() - 172780000).toISOString(), channel: 'chat' }
          ]
        }
      ]
      setConversations(sampleConversations)
    } else {
      setChatMessages([])
      setConversations([])
    }
  }, [useSampleData])

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      channel: 'chat'
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatLoading(true)

    try {
      const result = await callAIAgent(message, CHAT_AGENT_ID)

      if (result.success && result.response) {
        // Extract text from various possible response formats
        const responseText =
          result.response.message ||
          result.response.result?.message ||
          result.response.result?.text ||
          result.response.result?.answer ||
          (typeof result.response.result === 'string' ? result.response.result : null) ||
          JSON.stringify(result.response.result)

        if (responseText) {
          const agentMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: responseText,
            timestamp: new Date().toISOString(),
            channel: 'chat'
          }
          setChatMessages(prev => [...prev, agentMessage])

          // Add to conversation history
          const newConv: ConversationRecord = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            channel: 'chat',
            customer: 'Current User',
            summary: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
            messages: [userMessage, agentMessage]
          }
          setConversations(prev => [newConv, ...prev])
        } else {
          throw new Error('No response text found')
        }
      } else {
        throw new Error(result.error || 'Agent returned unsuccessful response')
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        channel: 'chat'
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div style={THEME_VARS} className="min-h-screen bg-gradient-to-br from-[hsl(160,40%,94%)] via-[hsl(180,35%,93%)] to-[hsl(140,40%,94%)] text-foreground">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-card/30 backdrop-blur-lg border-b border-border/50 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Omni-Channel Customer Service Hub</h1>
              <p className="text-sm text-muted-foreground">AI-powered support across chat and voice</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">{currentTime}</div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-sm">Sample Data</Label>
                <Switch
                  id="sample-toggle"
                  checked={useSampleData}
                  onCheckedChange={setUseSampleData}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <div className="bg-card/20 backdrop-blur-sm border-b border-border/50 px-6">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="chat">Chat Interface</TabsTrigger>
                <TabsTrigger value="voice">Voice Call</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="chat" className="h-full m-0">
                <ChatInterface
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  loading={chatLoading}
                  useSampleData={useSampleData}
                />
              </TabsContent>

              <TabsContent value="voice" className="h-full m-0">
                <VoiceCallPanel useSampleData={useSampleData} />
              </TabsContent>

              <TabsContent value="dashboard" className="h-full m-0 overflow-auto">
                <Dashboard conversations={conversations} useSampleData={useSampleData} />
              </TabsContent>

              <TabsContent value="knowledge" className="h-full m-0 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <KnowledgeBaseManager />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Agent Status Footer */}
        <footer className="bg-card/30 backdrop-blur-lg border-t border-border/50 px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span>Customer Service Agent Active</span>
              </div>
              <Badge variant="outline" className="text-xs">Chat + Voice Enabled</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Agent ID: {CHAT_AGENT_ID.slice(0, 8)}...</span>
              <span>•</span>
              <span>RAG KB: {RAG_ID.slice(0, 8)}...</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
