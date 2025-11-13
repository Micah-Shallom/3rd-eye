"use client"

import { useRef, useEffect, useState } from "react"

interface VoiceCommandSystemProps {
  onVoiceCommand: (command: string) => void
  isListening: boolean
  onListeningChange: (listening: boolean) => void
  onSpeak: (text: string) => Promise<void>
  activeTab: string
}

export default function VoiceCommandSystem({
  onVoiceCommand,
  isListening,
  onListeningChange,
  onSpeak,
  activeTab,
}: VoiceCommandSystemProps) {
  const recognitionRef = useRef<any>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition

      if (SpeechRecognition) {
        setIsSupported(true)
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

          if (event.error === "no-speech") {
            console.log("[v0] No speech detected, continuing to listen...")
          } else if (event.error === "audio-capture") {
            console.error("[v0] Microphone access error")
            onSpeak("Microphone access denied. Please check your browser permissions and try again.")
          } else if (event.error === "not-allowed") {
            console.error("[v0] Speech recognition not allowed")
            onSpeak("Speech recognition permission denied. Please allow microphone access in your browser settings.")
          } else if (event.error === "network") {
            console.error("[v0] Network error in speech recognition")
            onSpeak("Network error occurred. Please check your internet connection.")
          }

          onListeningChange(false)
        }

        recognitionRef.current.onend = () => {
          console.log("[v0] Speech recognition ended")
          onListeningChange(false)
        }

        recognitionRef.current.onstart = () => {
          console.log("[v0] Speech recognition started")
          onListeningChange(true)
        }
      } else {
        setIsSupported(false)
        console.warn("[v0] Speech recognition not supported in this browser")
      }
    }
  }, [])

  const handleVoiceCommand = async (command: string) => {
    // Feature-specific voice commands
    if (
      activeTab === "ocr" &&
      (command.includes("capture") || command.includes("take picture") || command.includes("scan"))
    ) {
      onVoiceCommand("capture_image")
      return
    }

    if (
      activeTab === "object-detection" &&
      (command.includes("detect") || command.includes("identify") || command.includes("analyze"))
    ) {
      onVoiceCommand("detect_objects")
      return
    }

    if (activeTab === "pdf-reader") {
      if (command.includes("upload") || command.includes("select file")) {
        onVoiceCommand("upload_pdf")
        return
      }
      if (command.includes("read pdf") || command.includes("start reading")) {
        onVoiceCommand("start_reading")
        return
      }
      if (command.includes("stop reading") || command.includes("pause reading")) {
        onVoiceCommand("stop_reading")
        return
      }
    }

    if (activeTab === "navigation") {
      if (command.includes("get location") || command.includes("current location")) {
        onVoiceCommand("get_location")
        return
      }
      if (command.includes("find restaurants") || command.includes("nearby restaurants")) {
        onVoiceCommand("find_restaurants")
        return
      }
      if (command.includes("find gas stations") || command.includes("nearby gas")) {
        onVoiceCommand("find_gas_stations")
        return
      }
      if (command.includes("find hospitals") || command.includes("nearby hospitals")) {
        onVoiceCommand("find_hospitals")
        return
      }
      if (command.includes("find pharmacies") || command.includes("nearby pharmacies")) {
        onVoiceCommand("find_pharmacies")
        return
      }
    }

    // General navigation commands
    onVoiceCommand(command)
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening && isSupported) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error("[v0] Error starting speech recognition:", error)
        onSpeak("Unable to start voice recognition. Please try again.")
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  return null
}

export { VoiceCommandSystem }
