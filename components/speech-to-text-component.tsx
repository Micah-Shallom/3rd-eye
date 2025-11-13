"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Download, Trash2, FileText } from "lucide-react"

interface SpeechToTextComponentProps {
  onSpeak: (text: string) => void
  geminiApiKey: string
}

export interface SpeechToTextComponentRef {
  startRecording: () => void
  stopRecording: () => void
}

const SpeechToTextComponent = forwardRef<SpeechToTextComponentRef, SpeechToTextComponentProps>(
  ({ onSpeak, geminiApiKey }, ref) => {
    const [isRecording, setIsRecording] = useState(false)
    const [transcribedText, setTranscribedText] = useState("")
    const [documentTitle, setDocumentTitle] = useState("My Document")
    const [isProcessing, setIsProcessing] = useState(false)
    const [wordCount, setWordCount] = useState(0)

    const recognitionRef = useRef<any>(null)
    const interimTextRef = useRef("")

    useEffect(() => {
      if (typeof window !== "undefined") {
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
          const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
          recognitionRef.current = new SpeechRecognition()
          recognitionRef.current.continuous = true
          recognitionRef.current.interimResults = true
          recognitionRef.current.lang = "en-US"

          recognitionRef.current.onresult = (event: any) => {
            let interimTranscript = ""
            let finalTranscript = ""

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                finalTranscript += transcript + " "
              } else {
                interimTranscript += transcript
              }
            }

            if (finalTranscript) {
              setTranscribedText((prev) => prev + finalTranscript)
              interimTextRef.current = ""
            } else {
              interimTextRef.current = interimTranscript
            }
          }

          recognitionRef.current.onerror = (event: any) => {
            console.log("[v0] Speech recognition error:", event.error)
            setIsRecording(false)
            onSpeak("Speech recognition error occurred. Please try again.")
          }

          recognitionRef.current.onend = () => {
            console.log("[v0] Speech recognition ended")
            setIsRecording(false)
          }

          recognitionRef.current.onstart = () => {
            console.log("[v0] Speech recognition started")
            setIsRecording(true)
          }
        }
      }
    }, [onSpeak])

    useEffect(() => {
      const words = transcribedText
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0)
      setWordCount(words.length)
    }, [transcribedText])

    const startRecording = async () => {
      if (recognitionRef.current && !isRecording) {
        try {
          recognitionRef.current.start()
          await onSpeak("Recording started. Begin speaking and I'll transcribe everything you say.")
        } catch (error) {
          console.error("[v0] Error starting recording:", error)
          await onSpeak("Unable to start recording. Please check your microphone permissions.")
        }
      }
    }

    const stopRecording = async () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop()
        await onSpeak("Recording stopped. Your text has been transcribed.")
      }
    }

    const enhanceTextWithGemini = async () => {
      if (!transcribedText.trim()) {
        await onSpeak("No text to enhance. Please record some speech first.")
        return
      }

      console.log("[v0] Starting text enhancement with Gemini API")
      console.log("[v0] API Key available:", !!geminiApiKey)
      console.log("[v0] Text to enhance:", transcribedText.substring(0, 100) + "...")

      setIsProcessing(true)
      try {
        const apiUrl =
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + geminiApiKey
        console.log("[v0] Making request to:", apiUrl.substring(0, 80) + "...")

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: `Please improve and format the following transcribed text for better readability, correct grammar, add proper punctuation, and organize it into paragraphs where appropriate. Keep the original meaning and content intact:\n\n${transcribedText}`,
                },
              ],
            },
          ],
        }

        console.log("[v0] Request body prepared")

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        console.log("[v0] Response status:", response.status)
        console.log("[v0] Response ok:", response.ok)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Response data structure:", Object.keys(data))
          console.log("[v0] Candidates available:", !!data.candidates)

          if (data.candidates && data.candidates[0]) {
            console.log("[v0] First candidate structure:", Object.keys(data.candidates[0]))
            if (data.candidates[0].content) {
              console.log("[v0] Content structure:", Object.keys(data.candidates[0].content))
            }
          }

          const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text || transcribedText
          console.log("[v0] Enhanced text length:", enhancedText.length)
          console.log("[v0] Enhanced text preview:", enhancedText.substring(0, 100) + "...")

          setTranscribedText(enhancedText)
          await onSpeak("Text has been enhanced and formatted for better readability.")
        } else {
          const errorText = await response.text()
          console.log("[v0] Error response:", errorText)
          await onSpeak("Unable to enhance text. The original transcription is still available.")
        }
      } catch (error) {
        console.error("[v0] Error enhancing text:", error)
        await onSpeak("Error enhancing text. The original transcription is still available.")
      } finally {
        setIsProcessing(false)
      }
    }

    const clearText = async () => {
      setTranscribedText("")
      interimTextRef.current = ""
      await onSpeak("Text cleared. Ready for new recording.")
    }

    const downloadAsWord = async () => {
      if (!transcribedText.trim()) {
        await onSpeak("No text to download. Please record some speech first.")
        return
      }

      try {
        // Create a simple HTML document that can be opened by Word
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${documentTitle}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 1in; }
              h1 { font-size: 16pt; font-weight: bold; margin-bottom: 12pt; }
              p { margin-bottom: 12pt; text-align: justify; }
            </style>
          </head>
          <body>
            <h1>${documentTitle}</h1>
            ${transcribedText
              .split("\n")
              .map((paragraph) => (paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ""))
              .join("")}
          </body>
          </html>
        `

        const blob = new Blob([htmlContent], { type: "application/msword" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${documentTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.doc`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        await onSpeak(`Document "${documentTitle}" has been downloaded successfully.`)
      } catch (error) {
        console.error("[v0] Error downloading document:", error)
        await onSpeak("Error downloading document. Please try again.")
      }
    }

    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording,
    }))

    return (
      <div className="space-y-4">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5" />
              Speech to Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Title</label>
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Enter document title..."
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                className={`flex-1 ${isRecording ? "animate-pulse" : ""}`}
              >
                {isRecording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>

              <Button
                onClick={enhanceTextWithGemini}
                disabled={!transcribedText.trim() || isProcessing}
                variant="outline"
              >
                {isProcessing ? "Enhancing..." : "Enhance"}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Transcribed Text</label>
                <span className="text-xs text-muted-foreground">{wordCount} words</span>
              </div>
              <Textarea
                value={transcribedText + (isRecording ? interimTextRef.current : "")}
                onChange={(e) => setTranscribedText(e.target.value)}
                placeholder="Your speech will appear here as you talk..."
                className="min-h-[200px] resize-none"
                rows={8}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadAsWord} disabled={!transcribedText.trim()} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Word Doc
              </Button>

              <Button onClick={clearText} disabled={!transcribedText.trim()} variant="outline">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Click "Start Recording" and begin speaking</p>
              <p>• Use "Enhance" to improve grammar and formatting with AI</p>
              <p>• Download creates a Word-compatible document</p>
              <p>• You can edit the text manually before downloading</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  },
)

SpeechToTextComponent.displayName = "SpeechToTextComponent"

export default SpeechToTextComponent
