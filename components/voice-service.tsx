"use client"

import { useEffect, useRef } from "react"

interface VoiceServiceProps {
  onVoiceCommand: (command: string) => void
}

export function VoiceService({ onVoiceCommand }: VoiceServiceProps) {
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join("")

          if (event.results[event.results.length - 1].isFinal) {
            onVoiceCommand(transcript.toLowerCase().trim())
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
        }
      }
    }
  }, [onVoiceCommand])

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  return { startListening, stopListening }
}

export class ElevenLabsService {
  private apiKey: string
  private geminiApiKey: string
  private isSpeaking = false
  private speechQueue: string[] = []

  constructor(apiKey: string, geminiApiKey?: string) {
    this.apiKey = apiKey
    this.geminiApiKey = geminiApiKey || ""
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  public stopSpeaking(): void {
    this.speechQueue = []
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel()
    }
    this.isSpeaking = false
  }

  async getConversationalResponse(userInput: string): Promise<string> {
    let response: string

    try {
      response = await this.getGeminiResponse(userInput)
    } catch (error) {
      console.warn("[v0] Gemini API failed, using contextual response:", error)
      response = this.generateContextualResponse(userInput)
    }

    // Use ElevenLabs TTS
    await this.speak(response)

    return response
  }

  async processImageWithGeminiOCR(imageBlob: Blob): Promise<string> {
    try {
      const base64Image = await this.blobToBase64(imageBlob)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
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
                    text: "Extract and read all text from this image. If there's no text, respond with 'No text found'. Be accurate and preserve formatting where possible.",
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64Image.split(",")[1],
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              topK: 32,
              topP: 1,
              maxOutputTokens: 1024,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Gemini Vision API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.trim()
      }

      throw new Error("Invalid Gemini Vision API response format")
    } catch (error) {
      console.error("[v0] Gemini OCR error:", error)
      throw error
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private async getGeminiResponse(userInput: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
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
                  text: `You are thirdeye, a compassionate AI visual assistant for visually impaired users. Your features include:
- OCR text recognition from camera
- Object detection and identification
- PDF document reading with word highlighting
- Navigation assistance via Google Maps
- Conversational AI support

Respond to this user input in a helpful, encouraging, and accessible way. Keep responses concise (1-2 sentences) and actionable. Focus on how thirdeye can help them.

User input: "${userInput}"`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 150,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text.trim()
    }

    throw new Error("Invalid Gemini API response format")
  }

  private generateContextualResponse(userInput: string): string {
    const input = userInput.toLowerCase()

    if (input.includes("hello") || input.includes("hi") || input.includes("hey")) {
      return "Hello! I'm thirdeye, your visual assistant. I'm here to help you see beyond limits. What would you like to do today?"
    }

    if (input.includes("help") || input.includes("what can you do") || input.includes("features")) {
      return "I can help you with text recognition using OCR, object detection with AI, navigation assistance, PDF document reading with highlighting, and answer questions about your surroundings. Which feature interests you?"
    }

    if (
      input.includes("ocr") ||
      input.includes("text") ||
      input.includes("read text") ||
      input.includes("camera text")
    ) {
      return "Great choice! I can read any text through your camera. Point your device at text like signs, documents, or books, then say 'capture' and I'll read it aloud for you."
    }

    if (
      input.includes("object") ||
      input.includes("detect") ||
      input.includes("identify") ||
      input.includes("what do you see")
    ) {
      return "I can identify objects around you using advanced AI. Point your camera at objects and I'll tell you what I can see with confidence levels. It works best with good lighting."
    }

    if (
      input.includes("navigate") ||
      input.includes("direction") ||
      input.includes("maps") ||
      input.includes("go to")
    ) {
      return "I can help you get anywhere! Just tell me your destination and I'll open Google Maps with turn-by-turn directions. Where would you like to go?"
    }

    if (
      input.includes("pdf") ||
      input.includes("document") ||
      input.includes("file") ||
      input.includes("read document")
    ) {
      return "I can read PDF documents with synchronized word highlighting! Upload any PDF and I'll extract the text and read it aloud, highlighting each word as I speak. Very helpful for studying or reviewing documents."
    }

    if (input.includes("thank") || input.includes("thanks") || input.includes("appreciate")) {
      return "You're very welcome! I'm always here to help you navigate and understand your world. Feel free to ask me anything or try any of my features."
    }

    if (input.includes("how does") || input.includes("how do") || input.includes("explain")) {
      return "thirdeye uses advanced AI and machine learning to process visual information. I combine OCR for text, COCO-SSD for object detection, and natural speech synthesis. Everything is designed with accessibility in mind."
    }

    if (input.includes("difficult") || input.includes("hard") || input.includes("struggle")) {
      return "I understand it can be challenging, but remember - you're not alone. thirdeye is here to be your digital eyes and help you see beyond any limits. Together, we can overcome any visual challenge."
    }

    return this.getFallbackResponse(userInput)
  }

  private getFallbackResponse(userInput: string): string {
    const responses = [
      "I'm here to help you see beyond limits with thirdeye. What would you like to explore?",
      "That's interesting! I can assist you with text reading, object detection, navigation, or PDF reading. What sounds helpful?",
      "I'm your visual assistant, ready to help with any accessibility needs. Which feature would you like to try?",
      "thirdeye is designed to be your digital eyes. I can read text, identify objects, provide directions, or read documents. What can I help you with?",
      "I'm listening and ready to assist! Whether it's reading text, detecting objects, or navigating, I'm here for you.",
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  async speak(text: string): Promise<void> {
    if (this.isSpeaking) {
      this.speechQueue.push(text)
      return
    }

    this.isSpeaking = true

    try {
      await this.performSpeech(text)
    } finally {
      this.isSpeaking = false
      if (this.speechQueue.length > 0) {
        const nextText = this.speechQueue.shift()!
        this.speak(nextText)
      }
    }
  }

  private async performSpeech(text: string): Promise<void> {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB", {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          reject(new Error("Audio playback failed"))
        }
        audio.play().catch(reject)
      })
    } catch (error) {
      console.error("[v0] ElevenLabs TTS failed, falling back to browser TTS:", error)
      return this.fallbackToSpeechSynthesis(text)
    }
  }

  private async fallbackToSpeechSynthesis(text: string): Promise<void> {
    return new Promise((resolve) => {
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.85
        utterance.pitch = 1.0
        utterance.volume = 0.9

        const setVoiceAndSpeak = () => {
          const voices = speechSynthesis.getVoices()
          const preferredVoice =
            voices.find(
              (voice) =>
                voice.lang.includes("en") &&
                (voice.name.includes("Google") ||
                  voice.name.includes("Microsoft") ||
                  voice.name.includes("Natural") ||
                  voice.name.includes("Enhanced") ||
                  voice.name.includes("Premium")),
            ) ||
            voices.find((voice) => voice.lang.includes("en-US")) ||
            voices[0]

          if (preferredVoice) {
            utterance.voice = preferredVoice
          }

          utterance.onend = () => resolve()
          utterance.onerror = () => resolve()

          speechSynthesis.speak(utterance)
        }

        if (speechSynthesis.getVoices().length > 0) {
          setVoiceAndSpeak()
        } else {
          speechSynthesis.onvoiceschanged = setVoiceAndSpeak
        }
      } else {
        console.warn("Speech synthesis not supported")
        resolve()
      }
    })
  }

  async testVoice(): Promise<boolean> {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": this.apiKey,
        },
      })

      if (response.ok) {
        console.log("[v0] ElevenLabs TTS available")
        return true
      } else {
        throw new Error(`ElevenLabs API test failed: ${response.status}`)
      }
    } catch (error) {
      console.warn("[v0] ElevenLabs TTS not available, browser TTS will be used as fallback:", error)
      return "speechSynthesis" in window
    }
  }
}

export const GeminiTTSService = ElevenLabsService
export const BrowserTTSService = ElevenLabsService
