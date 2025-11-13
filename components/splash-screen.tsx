"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, MicOff } from "lucide-react"

interface SplashScreenProps {
  onComplete: (userName: string) => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stage, setStage] = useState(0)
  const [userName, setUserName] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [recognitionRef, setRecognitionRef] = useState<any>(null)

  const speakGreeting = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance("Hello, thirdeye wants to know your name")
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 500)
    const timer2 = setTimeout(() => setStage(2), 1500)
    const timer3 = setTimeout(() => setStage(3), 2500)
    const timer4 = setTimeout(() => {
      setStage(4)
      setTimeout(() => speakGreeting(), 500) // Slight delay before speaking
    }, 4000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && stage >= 4) {
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = "en-US"

        recognition.onresult = (event: any) => {
          const name = event.results[0][0].transcript.trim()
          setUserName(name)
          setIsListening(false)
        }

        recognition.onerror = () => {
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        setRecognitionRef(recognition)
      }
    }
  }, [stage])

  const startListening = () => {
    if (recognitionRef && !isListening) {
      recognitionRef.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef && isListening) {
      recognitionRef.stop()
      setIsListening(false)
    }
  }

  const handleContinue = () => {
    if (userName.trim()) {
      onComplete(userName.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-secondary via-background to-primary/10 flex items-center justify-center z-50">
      <div className="text-center space-y-6 px-8 max-w-md pt-8">
        {/* Logo */}
        <div className={`transition-all duration-1000 ${stage >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          <div className="relative mx-auto w-40 h-40 animate-float">
            <Image
              src="/thirdeye-logo.png"
              alt="ThirdEye Logo"
              fill
              className="object-contain animate-pulse-glow rounded-full border-2 border-[#56066c]"
            />
          </div>
        </div>

        {/* Title */}
        <div
          className={`transition-all duration-1000 delay-500 ${stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            3rdEye
          </h1>
        </div>

        {/* Slogan */}
        <div
          className={`transition-all duration-1000 delay-1000 ${stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <p className="text-2xl text-muted-foreground font-medium">Seeing beyond limits...</p>
        </div>

        {/* Loading indicator */}
        <div
          className={`transition-all duration-1000 delay-1500 ${stage >= 3 && stage < 4 ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">Initializing your visual assistant...</p>
        </div>

        <div
          className={`transition-all duration-1000 ${stage >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">What's your name?</h2>
            <p className="text-muted-foreground">I'd love to know what to call you!</p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter your name..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && handleContinue()}
                />
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="icon"
                  onClick={isListening ? stopListening : startListening}
                  className={isListening ? "animate-pulse" : ""}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
              </div>

              <Button onClick={handleContinue} disabled={!userName.trim()} className="w-full">
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
