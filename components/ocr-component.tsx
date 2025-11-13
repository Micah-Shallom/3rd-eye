"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Camera, Sparkles, Volume2 } from "lucide-react"

interface OCRComponentProps {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  onSpeak: (text: string) => Promise<void>
  geminiApiKey: string
}

export default function OCRComponent({ videoRef, canvasRef, onSpeak, geminiApiKey }: OCRComponentProps) {
  const [ocrResult, setOcrResult] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const processImageWithGeminiOCR = async (imageBlob: Blob): Promise<string> => {
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          resolve(base64String.split(",")[1])
        }
        reader.readAsDataURL(imageBlob)
      })

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
                    text: "Extract and return only the text content from this image. If there's no readable text, respond with 'No text found'.",
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64,
                    },
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
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No text found"
    } catch (error) {
      console.error("[v0] Gemini OCR Error:", error)
      throw error
    }
  }

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        canvas.toBlob(async (blob) => {
          if (blob) {
            await processImageWithOCR(blob)
          }
        })
      }
    }
  }

  const processImageWithOCR = async (imageBlob: Blob) => {
    try {
      setIsProcessing(true)
      await onSpeak("Processing image with AI, please wait")

      const text = await processImageWithGeminiOCR(imageBlob)
      setOcrResult(text)

      if (text.trim() && text !== "No text found") {
        await onSpeak(`Text detected: ${text}`)
      } else {
        await onSpeak("No text found in the image")
      }
    } catch (error) {
      console.error("[v0] Gemini OCR Error:", error)
      await onSpeak("Error processing image with AI OCR")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Text Recognition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-xl overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full bg-muted" style={{ maxHeight: "300px" }} />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <Button
          onClick={captureImage}
          disabled={isProcessing}
          className="w-full bg-primary hover:bg-primary/90 transition-all"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isProcessing ? "Processing..." : "Capture & Read Text"}
        </Button>

        {ocrResult && (
          <div className="space-y-3">
            <Badge variant="secondary" className="bg-secondary/50">
              Detected Text:
            </Badge>
            <Textarea
              value={ocrResult}
              readOnly
              className="min-h-[100px] bg-background/50"
              placeholder="Captured text will appear here..."
            />
            <Button variant="outline" onClick={() => onSpeak(ocrResult)} className="w-full">
              <Volume2 className="w-4 h-4 mr-2" />
              Read Aloud
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
