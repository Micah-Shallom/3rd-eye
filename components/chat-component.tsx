"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Mic, Send, Volume2 } from "lucide-react"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatComponentProps {
  onSpeak: (text: string) => Promise<void>
  geminiApiKey: string
  isListening: boolean
  onStartListening: () => void
  onStopListening: () => void
  onVoiceInput: (input: string) => void
}

export default function ChatComponent({
  onSpeak,
  geminiApiKey,
  isListening,
  onStartListening,
  onStopListening,
  onVoiceInput,
}: ChatComponentProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isConversationalMode, setIsConversationalMode] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const getConversationalResponse = async (userInput: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are thirdeye, an AI assistant designed specifically to help visually impaired users. You are helpful, empathetic, and provide clear, concise responses. You can help with:
- Text recognition and reading
- Object detection and identification
- Navigation and directions
- PDF document reading
- General questions and assistance

User question: ${userInput}

Respond in a helpful, conversational manner. Keep responses concise but informative.`,
                  },
                ],
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm here to help you with thirdeye. What would you like to know?"
      )
    } catch (error) {
      console.error("[v0] Gemini chat error:", error)
      return "I'm here to help you navigate and understand your surroundings with thirdeye. How can I assist you?"
    }
  }

  const handleConversationalChat = async (userInput: string) => {
    if (!userInput.trim()) return

    setIsProcessing(true)
    const userMessage: ChatMessage = {
      role: "user",
      content: userInput,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMessage])

    try {
      const response = await getConversationalResponse(userInput)

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, assistantMessage])
      await onSpeak(assistantMessage.content)
    } catch (error) {
      console.error("Conversational chat error:", error)
      const fallbackMessage: ChatMessage = {
        role: "assistant",
        content: "I'm here to help you navigate and understand your surroundings with thirdeye.",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, fallbackMessage])
      await onSpeak(fallbackMessage.content)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isProcessing) return

    if (isConversationalMode) {
      await handleConversationalChat(chatInput)
    } else {
      const userMessage: ChatMessage = {
        role: "user",
        content: chatInput,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, userMessage])

      const responses = [
        "I'm here to help you navigate and understand your surroundings with thirdeye.",
        "How can I assist you with your visual needs today?",
        "I can help you read text, identify objects, find directions, read PDFs, or answer questions.",
        "What would you like to explore next?",
        "thirdeye is designed to be your eyes when you need them most.",
      ]

      setTimeout(async () => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date(),
          },
        ])
        await onSpeak(responses[Math.floor(Math.random() * responses.length)])
      }, 1000)
    }

    setChatInput("")
  }

  const toggleConversationalMode = async () => {
    const newMode = !isConversationalMode
    setIsConversationalMode(newMode)

    if (newMode) {
      onStartListening()
      await onSpeak("Conversational mode activated. I'm listening!")
    } else {
      onStopListening()
      await onSpeak("Conversational mode deactivated.")
    }
  }

  const clearChat = () => {
    setChatMessages([])
  }

  // Handle voice input from parent component
  useEffect(() => {
    if (isConversationalMode) {
      onVoiceInput = handleConversationalChat
    }
  }, [isConversationalMode])

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            AI Assistant
            {isConversationalMode && (
              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary animate-pulse">
                Voice Chat Active
              </Badge>
            )}
          </div>
          {chatMessages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs">
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {chatMessages.length === 0 && (
            <div className="text-center text-muted-foreground p-4">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Start a conversation with thirdeye AI</p>
            </div>
          )}
          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg transition-all ${
                message.role === "user" ? "bg-primary text-primary-foreground ml-4" : "bg-secondary/50 mr-4"
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="flex-1">{message.content}</p>
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSpeak(message.content)}
                    className="ml-2 h-6 w-6 p-0"
                  >
                    <Volume2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
          {isProcessing && (
            <div className="bg-secondary/50 mr-4 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">thirdeye is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Mode Toggle */}
        <div className="flex gap-2 mb-2">
          <Button
            variant={isConversationalMode ? "default" : "outline"}
            size="sm"
            onClick={toggleConversationalMode}
            className="flex items-center gap-2"
          >
            <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
            {isConversationalMode ? "Voice Chat On" : "Voice Chat Off"}
          </Button>
          {isListening && (
            <Badge variant="secondary" className="animate-pulse">
              Listening...
            </Badge>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleChatSubmit()}
            className="flex-1 bg-background/50"
            disabled={isProcessing}
          />
          <Button onClick={handleChatSubmit} disabled={isProcessing} className="bg-primary hover:bg-primary/90">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Messages */}
        {isConversationalMode && (
          <div className="text-sm text-muted-foreground bg-primary/10 p-2 rounded-lg">
            🎤 Voice chat is active - I'm listening for your questions and will respond naturally!
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-1">AI Assistant Features:</p>
          <ul className="text-xs space-y-1">
            <li>• Ask questions about thirdeye features</li>
            <li>• Get help with navigation and accessibility</li>
            <li>• Voice conversation mode available</li>
            <li>• Powered by AI for intelligent responses</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
