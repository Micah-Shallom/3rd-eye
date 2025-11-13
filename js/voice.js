// Voice Command Module
class VoiceModule {
  constructor() {
    this.isListening = false
    this.recognition = null
    this.commands = {}
    this.setupCommands()
  }

  initialize() {
    this.setupSpeechRecognition()
    this.setupVoiceCommands()
    console.log("Voice module initialized")
  }

  setupSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()

      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = "en-US"

      this.recognition.onstart = () => {
        this.isListening = true
        window.app.updateVoiceStatus("Listening...")
        console.log("Voice recognition started")
      }

      this.recognition.onend = () => {
        this.isListening = false
        window.app.updateVoiceStatus("Voice Ready")
        console.log("Voice recognition ended")
      }

      this.recognition.onresult = (event) => {
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          }
        }

        if (finalTranscript) {
          this.processVoiceCommand(finalTranscript.toLowerCase().trim())
        }
      }

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        window.app.updateVoiceStatus("Voice Error")

        // Restart recognition after error
        setTimeout(() => {
          if (!this.isListening) {
            this.startListening()
          }
        }, 1000)
      }

      // Start listening automatically
      this.startListening()
    } else {
      console.warn("Speech recognition not supported")
      window.app.updateVoiceStatus("Voice Not Supported")
    }
  }

  setupCommands() {
    this.commands = {
      // Tab navigation commands
      "go to ocr": () => window.app.switchTab("ocr"),
      "open ocr": () => window.app.switchTab("ocr"),
      "ocr tab": () => window.app.switchTab("ocr"),
      "text recognition": () => window.app.switchTab("ocr"),
      "read text": () => window.app.switchTab("ocr"),

      "go to navigation": () => window.app.switchTab("navigation"),
      "open navigation": () => window.app.switchTab("navigation"),
      "navigation tab": () => window.app.switchTab("navigation"),
      maps: () => window.app.switchTab("navigation"),
      directions: () => window.app.switchTab("navigation"),

      "go to chat": () => window.app.switchTab("chat"),
      "open chat": () => window.app.switchTab("chat"),
      "chat tab": () => window.app.switchTab("chat"),
      "voice assistant": () => window.app.switchTab("chat"),
      assistant: () => window.app.switchTab("chat"),

      // OCR commands
      "capture text": () => this.executeOCRCommand("capture"),
      "take picture": () => this.executeOCRCommand("capture"),
      "scan text": () => this.executeOCRCommand("capture"),
      "switch camera": () => this.executeOCRCommand("switch"),

      // Navigation commands
      "find route": () => this.executeNavigationCommand("route"),
      "get directions": () => this.executeNavigationCommand("route"),
      "start navigation": () => this.executeNavigationCommand("start"),
      "where am i": () => this.executeNavigationCommand("location"),

      // General commands
      help: () => this.showHelp(),
      "what can you do": () => this.showHelp(),
      commands: () => this.showHelp(),
      "stop listening": () => this.stopListening(),
      "start listening": () => this.startListening(),
    }
  }

  setupVoiceCommands() {
    // Setup Annyang if available (alternative voice recognition)
    const annyang = window.annyang // Declare the annyang variable
    if (typeof annyang !== "undefined") {
      annyang.addCommands(this.commands)
      annyang.start({ autoRestart: true, continuous: true })
      console.log("Annyang voice commands initialized")
    }
  }

  processVoiceCommand(transcript) {
    console.log("Processing voice command:", transcript)
    window.app.showVoiceFeedback(`Heard: "${transcript}"`)

    // Check for exact matches first
    if (this.commands[transcript]) {
      this.commands[transcript]()
      return
    }

    // Check for partial matches
    for (const command in this.commands) {
      if (transcript.includes(command)) {
        this.commands[command]()
        return
      }
    }

    // If no command matched, try to process as chat input
    if (window.app.currentTab === "chat" && window.chatModule) {
      window.chatModule.processVoiceInput(transcript)
    } else {
      window.app.speak("Sorry, I didn't understand that command. Say 'help' to hear available commands.")
    }
  }

  executeOCRCommand(action) {
    if (window.app.currentTab !== "ocr") {
      window.app.switchTab("ocr")
      setTimeout(() => this.executeOCRCommand(action), 500)
      return
    }

    if (window.ocrModule) {
      switch (action) {
        case "capture":
          window.ocrModule.captureAndProcess()
          break
        case "switch":
          window.ocrModule.switchCamera()
          break
      }
    }
  }

  executeNavigationCommand(action) {
    if (window.app.currentTab !== "navigation") {
      window.app.switchTab("navigation")
      setTimeout(() => this.executeNavigationCommand(action), 500)
      return
    }

    if (window.navigationModule) {
      switch (action) {
        case "route":
          window.navigationModule.findRoute()
          break
        case "start":
          window.navigationModule.startNavigation()
          break
        case "location":
          window.navigationModule.getCurrentLocation()
          break
      }
    }
  }

  showHelp() {
    const helpText = `
            Available voice commands:
            
            Navigation: Say 'go to OCR', 'go to navigation', or 'go to chat'
            
            OCR: Say 'capture text', 'take picture', or 'switch camera'
            
            Maps: Say 'find route', 'get directions', or 'where am I'
            
            Chat: Just speak naturally to ask questions
            
            General: Say 'help' for this message
        `

    window.app.speak(helpText)
    window.app.showVoiceFeedback("Help information spoken")
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start()
      } catch (error) {
        console.error("Error starting recognition:", error)
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      window.app.speak("Voice recognition stopped")
    }
  }

  // Method for other modules to trigger speech
  speak(text) {
    window.app.speak(text)
  }
}

// Initialize voice module
window.voiceModule = new VoiceModule()
