// Main App Controller
class VisualAidApp {
  constructor() {
    this.currentTab = "ocr"
    this.isVoiceEnabled = false
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.initializeVoiceCommands()
    this.checkPermissions()
    this.announceWelcome()
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabName = e.currentTarget.dataset.tab
        this.switchTab(tabName)
      })
    })

    // Keyboard navigation for accessibility
    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        // Handle tab navigation
        this.handleKeyboardNavigation(e)
      }
    })
  }

  switchTab(tabName) {
    // Remove active class from all tabs and panels
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"))

    // Add active class to selected tab and panel
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")
    document.getElementById(`${tabName}Panel`).classList.add("active")

    this.currentTab = tabName

    // Announce tab change for screen readers
    this.announceTabChange(tabName)

    // Initialize tab-specific functionality
    this.initializeTab(tabName)
  }

  initializeTab(tabName) {
    switch (tabName) {
      case "ocr":
        if (window.ocrModule) {
          window.ocrModule.initialize()
        }
        break
      case "navigation":
        if (window.navigationModule) {
          window.navigationModule.initialize()
        }
        break
      case "chat":
        if (window.chatModule) {
          window.chatModule.initialize()
        }
        break
    }
  }

  initializeVoiceCommands() {
    if (window.voiceModule) {
      window.voiceModule.initialize()
      this.isVoiceEnabled = true
      this.updateVoiceStatus("Voice Ready")
    }
  }

  async checkPermissions() {
    try {
      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: "camera" })

      // Check microphone permission
      const micPermission = await navigator.permissions.query({ name: "microphone" })

      // Check geolocation permission
      const locationPermission = await navigator.permissions.query({ name: "geolocation" })

      console.log("Permissions:", {
        camera: cameraPermission.state,
        microphone: micPermission.state,
        geolocation: locationPermission.state,
      })
    } catch (error) {
      console.log("Permission check not supported:", error)
    }
  }

  updateVoiceStatus(status) {
    const statusText = document.querySelector(".status-text")
    const statusIndicator = document.querySelector(".status-indicator")

    if (statusText) {
      statusText.textContent = status
    }

    if (statusIndicator) {
      statusIndicator.style.background = status.includes("Ready") ? "#4CAF50" : "#FF5722"
    }
  }

  showLoading(show = true) {
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) {
      overlay.classList.toggle("show", show)
    }
  }

  showVoiceFeedback(text, duration = 2000) {
    const feedback = document.getElementById("voiceFeedback")
    const feedbackText = document.getElementById("feedbackText")

    if (feedback && feedbackText) {
      feedbackText.textContent = text
      feedback.classList.add("show")

      setTimeout(() => {
        feedback.classList.remove("show")
      }, duration)
    }
  }

  announceWelcome() {
    const welcomeMessage =
      "Welcome to Visual Aid Assistant. You can use voice commands to navigate. Say 'go to OCR' for text recognition, 'go to navigation' for maps, or 'go to chat' for voice assistant."
    this.speak(welcomeMessage)
  }

  announceTabChange(tabName) {
    const messages = {
      ocr: "OCR tab selected. Use camera to capture and read text.",
      navigation: "Navigation tab selected. Find routes and get directions.",
      chat: "Chat tab selected. Voice assistant ready for questions.",
    }

    this.speak(messages[tabName] || `${tabName} tab selected`)
  }

  speak(text) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      utterance.volume = 0.8

      // Use a clear, natural voice if available
      const voices = speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.lang.startsWith("en"),
      )

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      speechSynthesis.speak(utterance)
    }
  }

  handleKeyboardNavigation(e) {
    // Implement keyboard navigation for accessibility
    const focusableElements = document.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )

    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement)

    if (e.shiftKey && currentIndex === 0) {
      // Focus last element
      focusableElements[focusableElements.length - 1].focus()
      e.preventDefault()
    } else if (!e.shiftKey && currentIndex === focusableElements.length - 1) {
      // Focus first element
      focusableElements[0].focus()
      e.preventDefault()
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new VisualAidApp()
})

// Service Worker registration for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}
