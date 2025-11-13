"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Navigation, MapPin, Route, Compass, Mic, MicOff } from "lucide-react"

interface NavigationComponentProps {
  onSpeak: (text: string) => Promise<void>
  geminiApiKey: string
}

export default function NavigationComponent({ onSpeak, geminiApiKey }: NavigationComponentProps) {
  const [destination, setDestination] = useState("")
  const [currentLocation, setCurrentLocation] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)

  const startVoiceNavigation = async () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      await onSpeak("Voice recognition is not supported in this browser")
      return
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = async (event) => {
      const voiceInput = event.results[0][0].transcript
      await processVoiceNavigationRequest(voiceInput)
    }

    recognition.onerror = async (event) => {
      console.error("[v0] Voice recognition error:", event.error)
      setIsListening(false)
      await onSpeak("Sorry, I couldn't understand that. Please try again.")
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognition.start()
      await onSpeak("I'm listening. Tell me where you'd like to go or what you need help with.")
    } catch (error) {
      console.error("[v0] Error starting voice recognition:", error)
      await onSpeak("Unable to start voice recognition. Please try again.")
    }
  }

  const processVoiceNavigationRequest = async (voiceInput: string) => {
    setIsProcessingVoice(true)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
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
                    text: `You are thirdeye's navigation assistant. Analyze this user request and provide a helpful response. If they're asking for directions, extract the destination. If they need nearby places, identify what type. If it's a complex travel request, break it down into actionable steps.

User request: "${voiceInput}"

Respond in a helpful, conversational way and suggest specific actions I can take to help them navigate. Keep responses concise and actionable.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 200,
            },
          }),
        },
      )

      if (response.ok) {
        const data = await response.json()
        const geminiResponse =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "I can help you navigate. What would you like to do?"

        await onSpeak(geminiResponse)

        const lowerInput = voiceInput.toLowerCase()
        if (
          lowerInput.includes("go to") ||
          lowerInput.includes("navigate to") ||
          lowerInput.includes("directions to")
        ) {
          const destinationMatch = voiceInput.match(/(?:go to|navigate to|directions to)\s+(.+)/i)
          if (destinationMatch) {
            setDestination(destinationMatch[1])
            await onSpeak(`I've set your destination to ${destinationMatch[1]}. Would you like me to get directions?`)
          }
        } else if (lowerInput.includes("find") || lowerInput.includes("nearby") || lowerInput.includes("closest")) {
          // Handle nearby searches
          if (lowerInput.includes("restaurant") || lowerInput.includes("food")) {
            await findNearbyPlaces("restaurants")
          } else if (lowerInput.includes("gas") || lowerInput.includes("fuel")) {
            await findNearbyPlaces("gas stations")
          } else if (lowerInput.includes("hospital") || lowerInput.includes("medical")) {
            await findNearbyPlaces("hospitals")
          } else if (lowerInput.includes("pharmacy") || lowerInput.includes("drug store")) {
            await findNearbyPlaces("pharmacies")
          }
        }
      } else {
        await onSpeak("I can help you navigate. Please tell me where you'd like to go or what you're looking for.")
      }
    } catch (error) {
      console.error("[v0] Error processing voice navigation:", error)
      await onSpeak("I can help you navigate. Please tell me where you'd like to go or what you're looking for.")
    } finally {
      setIsProcessingVoice(false)
    }
  }

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      await onSpeak("Geolocation is not supported by this browser")
      return
    }

    setIsGettingLocation(true)
    await onSpeak("Getting your current location...")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          // Use reverse geocoding to get address
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          )
          const data = await response.json()
          const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

          setCurrentLocation(address)
          await onSpeak(`Your current location is: ${address}`)
        } catch (error) {
          const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setCurrentLocation(coords)
          await onSpeak(`Your current coordinates are: ${coords}`)
        }

        setIsGettingLocation(false)
      },
      async (error) => {
        console.error("[v0] Geolocation error:", error)
        await onSpeak("Unable to get your location. Please check location permissions.")
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    )
  }

  const getDirections = async () => {
    if (destination.trim()) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
      window.open(mapsUrl, "_blank")
      await onSpeak(`Opening directions to ${destination}`)
    } else {
      await onSpeak("Please enter a destination first")
    }
  }

  const getDirectionsFromCurrent = async () => {
    if (!currentLocation) {
      await onSpeak("Please get your current location first")
      return
    }

    if (destination.trim()) {
      const mapsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(currentLocation)}/${encodeURIComponent(destination)}`
      window.open(mapsUrl, "_blank")
      await onSpeak(`Opening directions from your current location to ${destination}`)
    } else {
      await onSpeak("Please enter a destination first")
    }
  }

  const findNearbyPlaces = async (placeType: string) => {
    if (!currentLocation) {
      await onSpeak("Please get your current location first to find nearby places")
      return
    }

    const searchQuery = `${placeType} near ${currentLocation}`
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`
    window.open(mapsUrl, "_blank")
    await onSpeak(`Searching for ${placeType} near your location`)
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          AI Navigation Assistant
          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
            Voice Enabled
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button
            onClick={startVoiceNavigation}
            disabled={isListening || isProcessingVoice}
            className="w-full bg-primary hover:bg-primary/90 transition-all"
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-2 animate-pulse" />
                Listening...
              </>
            ) : isProcessingVoice ? (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Voice Navigation
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Say things like "Navigate to the airport" or "Find nearby restaurants"
          </p>
        </div>

        {/* Current Location Section */}
        <div className="space-y-2">
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            variant="outline"
            className="w-full bg-transparent"
          >
            <MapPin className="w-4 h-4 mr-2" />
            {isGettingLocation ? "Getting Location..." : "Get Current Location"}
          </Button>

          {currentLocation && (
            <div className="p-3 bg-secondary/20 rounded-lg border">
              <Badge variant="secondary" className="mb-2">
                Current Location:
              </Badge>
              <p className="text-sm text-muted-foreground">{currentLocation}</p>
            </div>
          )}
        </div>

        {/* Destination Input */}
        <div className="space-y-2">
          <Input
            placeholder="Where would you like to go?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && getDirections()}
            className="bg-background/50"
          />

          <div className="flex gap-2">
            <Button onClick={getDirections} className="flex-1 bg-primary hover:bg-primary/90 transition-all">
              <Route className="w-4 h-4 mr-2" />
              Get Directions
            </Button>

            {currentLocation && (
              <Button onClick={getDirectionsFromCurrent} variant="outline" className="flex-1 bg-transparent">
                <Compass className="w-4 h-4 mr-2" />
                From Here
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Badge variant="secondary" className="bg-secondary/50">
            Find Nearby:
          </Badge>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => findNearbyPlaces("restaurants")} className="text-xs">
              🍽️ Restaurants
            </Button>
            <Button variant="outline" size="sm" onClick={() => findNearbyPlaces("gas stations")} className="text-xs">
              ⛽ Gas Stations
            </Button>
            <Button variant="outline" size="sm" onClick={() => findNearbyPlaces("hospitals")} className="text-xs">
              🏥 Hospitals
            </Button>
            <Button variant="outline" size="sm" onClick={() => findNearbyPlaces("pharmacies")} className="text-xs">
              💊 Pharmacies
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-1">Voice Commands:</p>
          <ul className="text-xs space-y-1">
            <li>• "Navigate to [destination]" - Set destination and get directions</li>
            <li>• "Find nearby restaurants" - Search for places near you</li>
            <li>• "Where am I?" - Get your current location</li>
            <li>• "Get directions to [place]" - Open Google Maps with directions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
