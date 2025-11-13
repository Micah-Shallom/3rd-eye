"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Play, Pause, Volume2 } from "lucide-react"

interface PDFReaderComponentProps {
  onSpeak: (text: string) => Promise<void>
  geminiApiKey: string
}

export default function PDFReaderComponent({ onSpeak, geminiApiKey }: PDFReaderComponentProps) {
  const [pdfText, setPdfText] = useState("")
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)
  const [isReadingPdf, setIsReadingPdf] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [pdfWords, setPdfWords] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfReadingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const processWithGemini = async (text: string): Promise<string> => {
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
                    text: `Please clean up and improve the readability of this PDF text content. Remove any formatting artifacts, fix spacing issues, and organize it into proper paragraphs. Make it suitable for text-to-speech reading:\n\n${text}`,
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
      return data.candidates?.[0]?.content?.parts?.[0]?.text || text
    } catch (error) {
      console.error("[v0] Gemini text processing error:", error)
      return text // Return original text if Gemini fails
    }
  }

  const handlePdfUpload = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      await onSpeak("Please select a valid PDF file")
      return
    }

    setIsProcessingPdf(true)
    await onSpeak("Processing PDF document with AI, please wait")

    try {
      const pdfjsLib = await import("pdfjs-dist")

      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.mjs`

      const arrayBuffer = await file.arrayBuffer()

      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        disableAutoFetch: false,
        disableStream: false,
        disableRange: false,
        stopAtErrors: false,
        verbosity: 0,
        cMapUrl: "https://unpkg.com/pdfjs-dist@latest/cmaps/",
        cMapPacked: true,
      }).promise

      let fullText = ""

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        })

        let pageText = ""
        let lastY = null

        for (const item of textContent.items) {
          if (item.str) {
            if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
              pageText += "\n"
            }
            pageText += item.str + " "
            lastY = item.transform[5]
          }
        }

        fullText += pageText.trim() + "\n\n"
      }

      fullText = fullText
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n\n")
        .trim()

      const processedText = await processWithGemini(fullText)

      setPdfText(processedText)
      const words = processedText.split(/\s+/).filter((word) => word.trim())
      setPdfWords(words)
      setCurrentWordIndex(0)

      await onSpeak(
        `PDF processed successfully with AI enhancement. The document contains ${pdf.numPages} pages with ${words.length} words. Say "read PDF" to start reading with word highlighting.`,
      )
    } catch (error) {
      console.error("[v0] PDF processing error:", error)

      try {
        console.log("[v0] Attempting alternative worker URL...")
        const pdfjsLib = await import("pdfjs-dist")

        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.mjs`

        const arrayBuffer = await file.arrayBuffer()

        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
          disableAutoFetch: false,
          disableStream: false,
          verbosity: 0,
        }).promise

        let fullText = ""

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
          })

          let pageText = ""
          let lastY = null

          for (const item of textContent.items) {
            if (item.str) {
              if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                pageText += "\n"
              }
              pageText += item.str + " "
              lastY = item.transform[5]
            }
          }

          fullText += pageText.trim() + "\n\n"
        }

        fullText = fullText
          .replace(/\s+/g, " ")
          .replace(/\n\s*\n/g, "\n\n")
          .trim()

        const processedText = await processWithGemini(fullText)

        setPdfText(processedText)
        const words = processedText.split(/\s+/).filter((word) => word.trim())
        setPdfWords(words)
        setCurrentWordIndex(0)

        await onSpeak(
          `PDF processed successfully using alternative method with AI enhancement. The document contains ${pdf.numPages} pages with ${words.length} words. Say "read PDF" to start reading with word highlighting.`,
        )
      } catch (fallbackError) {
        console.error("[v0] Alternative PDF processing also failed:", fallbackError)

        await onSpeak(
          "Unable to process this PDF file. The PDF may be password protected, corrupted, or contain only images. Please try a different PDF file with readable text content.",
        )
      }
    } finally {
      setIsProcessingPdf(false)
    }
  }

  const startPdfReading = async () => {
    if (!pdfText || !pdfWords.length) return

    setIsReadingPdf(true)
    setCurrentWordIndex(0)

    const wordsPerMinute = 150
    const msPerWord = (60 / wordsPerMinute) * 1000

    pdfReadingIntervalRef.current = setInterval(() => {
      setCurrentWordIndex((prevIndex) => {
        if (prevIndex >= pdfWords.length - 1) {
          stopPdfReading()
          return prevIndex
        }
        return prevIndex + 1
      })
    }, msPerWord)

    await onSpeak(pdfText)
  }

  const stopPdfReading = () => {
    setIsReadingPdf(false)
    if (pdfReadingIntervalRef.current) {
      clearInterval(pdfReadingIntervalRef.current)
      pdfReadingIntervalRef.current = null
    }
  }

  const renderPdfTextWithHighlight = () => {
    if (!pdfWords.length) return pdfText

    return pdfWords.map((word, index) => (
      <span
        key={index}
        className={`${index === currentWordIndex && isReadingPdf ? "bg-primary text-primary-foreground px-1 rounded-md animate-pulse shadow-sm" : ""}`}
      >
        {word}{" "}
      </span>
    ))
  }

  useEffect(() => {
    return () => {
      if (pdfReadingIntervalRef.current) {
        clearInterval(pdfReadingIntervalRef.current)
      }
    }
  }, [])

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          PDF Reader
          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
            AI Enhanced
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-primary hover:bg-primary/90 transition-all"
          disabled={isProcessingPdf}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isProcessingPdf ? "Processing PDF..." : "Upload PDF Document"}
        </Button>

        {pdfText && (
          <div className="space-y-3">
            <Badge variant="secondary" className="bg-secondary/50">
              PDF Content ({pdfWords.length} words):
            </Badge>
            <div className="min-h-[200px] bg-background/50 p-4 rounded-md border text-sm leading-relaxed max-h-[400px] overflow-y-auto font-mono">
              {pdfWords.length > 0 ? renderPdfTextWithHighlight() : pdfText}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={isReadingPdf ? stopPdfReading : startPdfReading}
                className="flex-1 bg-transparent"
              >
                {isReadingPdf ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop Reading
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Read with Highlighting
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => onSpeak(pdfText.substring(0, 1000))} className="flex-1">
                <Volume2 className="w-4 h-4 mr-2" />
                Read Preview
              </Button>
            </div>
            {isReadingPdf && (
              <div className="text-sm text-muted-foreground bg-primary/10 p-3 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span>Reading progress:</span>
                  <span className="font-medium">
                    {currentWordIndex + 1} / {pdfWords.length} words
                  </span>
                </div>
                <div className="w-full bg-secondary/30 rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentWordIndex + 1) / pdfWords.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-1">AI-Enhanced PDF Reading:</p>
          <ul className="text-xs space-y-1">
            <li>• Text is processed with AI for better readability</li>
            <li>• Supports word-by-word highlighting during reading</li>
            <li>• Works with text-based PDFs (not scanned images)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
