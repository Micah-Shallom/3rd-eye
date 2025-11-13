"use client"

import type React from "react"

import { useState, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Volume2 } from "lucide-react"

interface ObjectDetectionComponentProps {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  onSpeak: (text: string) => Promise<void>
  geminiApiKey?: string
}

const ObjectDetectionComponent = forwardRef<any, ObjectDetectionComponentProps>(
  ({ videoRef, canvasRef, onSpeak, geminiApiKey }, ref) => {
    const [objectDetectionResult, setObjectDetectionResult] = useState<string[]>([])
    const [isDetecting, setIsDetecting] = useState(false)
    const [detectionDescription, setDetectionDescription] = useState<string>("")

    useImperativeHandle(ref, () => ({
      detectObjects,
    }))

    const detectObjects = async () => {
      if (!geminiApiKey) {
        await onSpeak("AI API key is not configured. Please check your settings.")
        return
      }

      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current
        const video = videoRef.current
        const context = canvas.getContext("2d")

        if (context) {
          setIsDetecting(true)
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0)

          await onSpeak("Analyzing objects with AI Vision")

          try {
            const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8)
            const base64Image = imageDataUrl.split(",")[1]

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
                          text: "Analyze this image and identify all objects you can see. For each object, provide: 1) The object name, 2) A confidence level (high/medium/low), 3) A brief description of its location or characteristics. Format your response as a detailed description followed by a bulleted list of objects. Be specific and helpful for someone who cannot see the image.",
                        },
                        {
                          inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image,
                          },
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 1024,
                  },
                }),
              },
            )

            if (!response.ok) {
              throw new Error(`Gemini API error: ${response.status}`)
            }

            const data = await response.json()
            const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

            console.log("[v0] Gemini Vision analysis:", analysisText)

            const lines = analysisText.split("\n").filter((line: string) => line.trim())
            const objectLines = lines.filter(
              (line: string) =>
                line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*"),
            )

            // Extract main description (first few lines before bullet points)
            const descriptionLines = lines.slice(
              0,
              lines.findIndex(
                (line) => line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*"),
              ),
            )
            const description = descriptionLines.join(" ").trim()

            // Extract object names from bullet points
            const detectedObjects = objectLines
              .map((line: string) => {
                // Remove bullet points and extract object name
                const cleaned = line.replace(/^[•\-*]\s*/, "").trim()
                // Take first part before any description or confidence info
                const objectName = cleaned.split(/[:\-(]/)[0].trim()
                return objectName
              })
              .filter((obj: string) => obj.length > 0)
              .slice(0, 8) // Limit to 8 objects for better UX

            setObjectDetectionResult(detectedObjects)
            setDetectionDescription(description)

            if (detectedObjects.length > 0) {
              const fullDescription = description
                ? `${description}. Objects detected: ${detectedObjects.join(", ")}`
                : `I can see: ${detectedObjects.join(", ")}`
              await onSpeak(fullDescription)
            } else {
              await onSpeak(
                "I can see the image but couldn't identify specific objects clearly. Try adjusting the camera angle or lighting.",
              )
            }
          } catch (error) {
            console.error("[v0] Gemini Vision error:", error)
            await onSpeak(
              "Error analyzing the image with AI Vision. Please check your internet connection and try again.",
            )
          } finally {
            setIsDetecting(false)
          }
        }
      }
    }

    return (
      <Card className="bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Object Detection
            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
              AI Vision
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative rounded-xl overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full bg-muted" style={{ maxHeight: "300px" }} />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <Button
            onClick={detectObjects}
            className="w-full bg-primary hover:bg-primary/90 transition-all"
            disabled={isDetecting}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isDetecting ? "Analyzing with AI..." : "Detect Objects"}
          </Button>

          {(objectDetectionResult.length > 0 || detectionDescription) && (
            <div className="space-y-3">
              {detectionDescription && (
                <div className="bg-secondary/20 p-3 rounded-lg">
                  <Badge variant="secondary" className="bg-secondary/50 mb-2">
                    Scene Description:
                  </Badge>
                  <p className="text-sm text-foreground">{detectionDescription}</p>
                </div>
              )}

              {objectDetectionResult.length > 0 && (
                <>
                  <Badge variant="secondary" className="bg-secondary/50">
                    Objects Detected:
                  </Badge>
                  <div className="flex flex-wrap gap-2">
                    {objectDetectionResult.map((object, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/10 border-primary/30 text-xs">
                        {object}
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  const fullDescription = detectionDescription
                    ? `${detectionDescription}. Objects detected: ${objectDetectionResult.join(", ")}`
                    : `I can see: ${objectDetectionResult.join(", ")}`
                  onSpeak(fullDescription)
                }}
                className="w-full"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Repeat Analysis
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-medium mb-1">AI Vision Tips:</p>
            <ul className="text-xs space-y-1">
              <li>• Works best with clear, well-lit images</li>
              <li>• Can identify complex scenes and relationships</li>
              <li>• Provides detailed descriptions beyond just object names</li>
              <li>• Hold camera steady for best results</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  },
)

ObjectDetectionComponent.displayName = "ObjectDetectionComponent"

export default ObjectDetectionComponent
