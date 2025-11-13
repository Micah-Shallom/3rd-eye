"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Navigation, MessageCircle, Mic, MicOff, Volume2, VolumeX, Eye, FileText } from "lucide-react"
import { SplashScreen } from "@/components/splash-screen"
import { ElevenLabsService } from "@/components/voice-service"
import OCRComponent from "@/components/ocr-component"
import ObjectDetectionComponent from "@/components/object-detection-component"
import PDFReaderComponent from "@/components/pdf-reader-component"
import NavigationComponent from "@/components/navigation-component"
import ChatComponent from "@/components/chat-component"
import VoiceCommandSystem from "@/components/voice-command-system"
import Image from "next/image"
import SpeechToTextComponent from "@/components/speech-to-text-component"

export default function ThirdEyeApp() {
  const [showSplash, setShowSplash] = useState(true)
  const [userName, setUserName] = useState("")
  const [activeTab, setActiveTab] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recognitionRef = useRef<any>(null)
  const geminiTTSRef = useRef<ElevenLabsService | null>(null)
  const ocrComponentRef = useRef<any>(null)
  const objectDetectionComponentRef = useRef<any>(null)
  const pdfReaderComponentRef = useRef<any>(null)
  const navigationComponentRef = useRef<any>(null)
  const speechToTextComponentRef = useRef<any>(null)

  const GEMINI_API_KEY = ""
  const ELEVENLABS_API_KEY = ""

  useEffect(() => {
    if (typeof window !== "undefined") {
      geminiTTSRef.current = new ElevenLabsService(ELEVENLABS_API_KEY, GEMINI_API_KEY)

      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event: any) => {
          const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim()
          console.log("[v0] Voice command received:", command)
          handleVoiceCommand(command)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.log("[v0] Speech recognition error:", event.error)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          console.log("[v0] Speech recognition ended")
          setIsListening(false)
        }

        recognitionRef.current.onstart = () => {
          console.log("[v0] Speech recognition started")
          setIsListening(true)
        }
      }
    }
  }, [])

  const speak = async (text: string) => {
    if (geminiTTSRef.current) {
      setIsSpeaking(true)
      await geminiTTSRef.current.speak(text)
      setIsSpeaking(false)
    }
  }

  const handleSplashComplete = async (name: string) => {
    setUserName(name)
    setShowSplash(false)
    await speak(
      `Hello ${name}, welcome to thirdeye. I'm truly glad you're here. Life can feel overwhelming sometimes—but I'm here to lighten things for you. Whether you'd like help reading text, identifying objects, navigating your world, exploring a PDF, or just having a friendly chat, I'm right here with you. How can I assist you today?`,
    )
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("[v0] Camera access error:", error)
      await speak("Camera access denied. Please allow camera permissions and refresh the page.")
    }
  }

  const handleVoiceCommand = async (command: string) => {
    console.log("[v0] Voice command received:", command)

    if ((command.includes("capture") || command.includes("scan")) && activeTab === "ocr") {
      if (ocrComponentRef.current?.captureImage) {
        ocrComponentRef.current.captureImage()
      }
      return
    }

    if ((command.includes("detect") || command.includes("analyze")) && activeTab === "object-detection") {
      if (objectDetectionComponentRef.current?.detectObjects) {
        objectDetectionComponentRef.current.detectObjects()
      }
      return
    }

    if (command === "detect_objects" && activeTab === "object-detection") {
      if (objectDetectionComponentRef.current?.detectObjects) {
        objectDetectionComponentRef.current.detectObjects()
      }
      return
    }

    if (command === "upload_pdf" && activeTab === "pdf-reader") {
      if (pdfReaderComponentRef.current?.triggerFileUpload) {
        pdfReaderComponentRef.current.triggerFileUpload()
      }
      return
    }

    if (command === "start_reading" && activeTab === "pdf-reader") {
      if (pdfReaderComponentRef.current?.startReading) {
        pdfReaderComponentRef.current.startReading()
      }
      return
    }

    if (command === "stop_reading" && activeTab === "pdf-reader") {
      if (pdfReaderComponentRef.current?.stopReading) {
        pdfReaderComponentRef.current.stopReading()
      }
      return
    }

    if (command === "get_location" && activeTab === "navigation") {
      if (navigationComponentRef.current?.getCurrentLocation) {
        navigationComponentRef.current.getCurrentLocation()
      }
      return
    }

    if (command.startsWith("find_") && activeTab === "navigation") {
      const placeType = command.replace("find_", "").replace("_", " ")
      if (navigationComponentRef.current?.findNearbyPlaces) {
        navigationComponentRef.current.findNearbyPlaces(placeType)
      }
      return
    }

    if (
      command.includes("switch to speech") ||
      command.includes("go to dictation") ||
      command.includes("open speech to text")
    ) {
      setActiveTab("speech-to-text")
      await speak("Switching to speech-to-text mode. I'll transcribe everything you say into a document.")
    } else if (command.includes("switch to ocr") || command.includes("go to text") || command.includes("open camera")) {
      setActiveTab("ocr")
      await speak("Switching to text recognition mode. Point your camera at text and say capture to read it aloud.")
    } else if (
      command.includes("switch to object") ||
      command.includes("go to detection") ||
      command.includes("open objects")
    ) {
      setActiveTab("object-detection")
      await speak("Switching to object detection mode. Point your camera at objects and say detect to identify them.")
    } else if (
      command.includes("switch to navigation") ||
      command.includes("go to maps") ||
      command.includes("open navigation")
    ) {
      setActiveTab("navigation")
      await speak("Switching to navigation mode. Tell me where you want to go.")
    } else if (
      command.includes("switch to chat") ||
      command.includes("go to assistant") ||
      command.includes("open chat")
    ) {
      setActiveTab("chat")
      await speak("Switching to conversational chat mode. I'm listening - how can I help you today?")
    } else if (
      command.includes("switch to pdf") ||
      command.includes("go to document") ||
      command.includes("open reader")
    ) {
      setActiveTab("pdf-reader")
      await speak("Switching to PDF reader mode. Upload a PDF document and I'll read it aloud for you.")
    }

    if (
      (command.includes("start recording") || command.includes("begin dictation")) &&
      activeTab === "speech-to-text"
    ) {
      if (speechToTextComponentRef.current?.startRecording) {
        speechToTextComponentRef.current.startRecording()
      }
      return
    }

    if ((command.includes("stop recording") || command.includes("end dictation")) && activeTab === "speech-to-text") {
      if (speechToTextComponentRef.current?.stopRecording) {
        speechToTextComponentRef.current.stopRecording()
      }
      return
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  useEffect(() => {
    if ((activeTab === "ocr" || activeTab === "object-detection") && !showSplash) {
      startCamera()
    }
  }, [activeTab, showSplash])

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="relative w-12 h-12">
                <Image src="/thirdeye-logo.png" alt="3rdEye" fill className="object-contain" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                3rdEye
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {userName ? `Hello ${userName}! Seeing beyond limits...` : "Seeing beyond limits..."}
            </p>

            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant={isListening ? "default" : "outline"}
                size="sm"
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-2 transition-all ${isListening ? "animate-pulse-glow" : ""}`}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {isListening ? "Listening" : "Voice"}
              </Button>
              <Button
                variant={isSpeaking ? "default" : "outline"}
                size="sm"
                onClick={() => speak("Voice test")}
                className="flex items-center gap-2"
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isSpeaking ? "Speaking" : "Test Voice"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={activeTab === "ocr" ? "default" : "outline"}
            onClick={() => setActiveTab("ocr")}
            className="flex flex-col items-center gap-2 h-20 transition-all hover:scale-105"
          >
            <Camera className="w-6 h-6" />
            <span className="text-sm font-medium">OCR</span>
          </Button>
          <Button
            variant={activeTab === "object-detection" ? "default" : "outline"}
            onClick={() => setActiveTab("object-detection")}
            className="flex flex-col items-center gap-2 h-20 transition-all hover:scale-105"
          >
            <Eye className="w-6 h-6" />
            <span className="text-sm font-medium">Objects</span>
          </Button>
          <Button
            variant={activeTab === "pdf-reader" ? "default" : "outline"}
            onClick={() => setActiveTab("pdf-reader")}
            className="flex flex-col items-center gap-2 h-20 transition-all hover:scale-105"
          >
            <FileText className="w-6 h-6" />
            <span className="text-sm font-medium">PDF Reader</span>
          </Button>
          <Button
            variant={activeTab === "navigation" ? "default" : "outline"}
            onClick={() => setActiveTab("navigation")}
            className="flex flex-col items-center gap-2 h-20 transition-all hover:scale-105"
          >
            <Navigation className="w-6 h-6" />
            <span className="text-sm font-medium">Navigate</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={activeTab === "chat" ? "default" : "outline"}
            onClick={() => setActiveTab("chat")}
            className="flex flex-col items-center gap-2 h-20 transition-all hover:scale-105"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-medium">Chat</span>
          </Button>
          <Button
            variant={activeTab === "speech-to-text" ? "default" : "outline"}
            onClick={() => setActiveTab("speech-to-text")}
            className="flex flex-col items-center gap-2 h-20 transition-all hover:scale-105"
          >
            <Mic className="w-6 h-6" />
            <span className="text-sm font-medium">Dictation</span>
          </Button>
        </div>

        {activeTab === "ocr" && (
          <OCRComponent
            ref={ocrComponentRef}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onSpeak={speak}
            geminiApiKey={GEMINI_API_KEY}
          />
        )}

        {activeTab === "object-detection" && (
          <ObjectDetectionComponent
            ref={objectDetectionComponentRef}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onSpeak={speak}
            geminiApiKey={GEMINI_API_KEY}
          />
        )}

        {activeTab === "pdf-reader" && (
          <PDFReaderComponent ref={pdfReaderComponentRef} onSpeak={speak} geminiApiKey={GEMINI_API_KEY} />
        )}

        {activeTab === "navigation" && (
          <NavigationComponent ref={navigationComponentRef} onSpeak={speak} geminiApiKey={GEMINI_API_KEY} />
        )}

        {activeTab === "chat" && (
          <ChatComponent
            onSpeak={speak}
            geminiApiKey={GEMINI_API_KEY}
            isListening={isListening}
            onStartListening={startListening}
            onStopListening={stopListening}
            onVoiceInput={handleVoiceCommand}
          />
        )}

        {activeTab === "speech-to-text" && (
          <SpeechToTextComponent ref={speechToTextComponentRef} onSpeak={speak} geminiApiKey={GEMINI_API_KEY} />
        )}

        <VoiceCommandSystem
          onVoiceCommand={handleVoiceCommand}
          isListening={isListening}
          onListeningChange={setIsListening}
          onSpeak={speak}
          activeTab={activeTab}
        />

        <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="font-medium text-foreground">Voice Commands:</div>
              <div>• "Switch to OCR" - Open text recognition</div>
              <div>• "Switch to objects" - Open object detection</div>
              <div>• "Switch to PDF" - Open document reader</div>
              <div>• "Switch to navigation" - Open maps</div>
              <div>• "Switch to chat" - Open AI assistant</div>
              <div>• "Switch to speech" - Open speech-to-text dictation</div>
              <div>• "Capture" or "scan" - Take picture in OCR mode</div>
              <div>• "Detect" or "analyze" - Identify objects in detection mode</div>
              <div>• "Start recording" - Begin dictation in speech mode</div>
              <div>• "Stop recording" - End dictation in speech mode</div>
              <div>• "Upload" - Select PDF file in document mode</div>
              <div>• "Read PDF" - Start reading with highlighting</div>
              <div>• "Get location" - Find current position</div>
              <div>• "Find restaurants" - Search nearby places</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
