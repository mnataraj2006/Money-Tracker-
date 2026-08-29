/**
 * Robust Zero-Cost High-Accuracy Web Speech Recognition Service
 * Configures ta-IN / en-IN, continuous listening, silence handling, and single-source event.results reconstruction.
 */

class SpeechRecognitionService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    this.recognition = null;
    this.isListening = false;

    if (this.isSupported) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      try {
        this.recognition.maxAlternatives = 3;
      } catch (e) {
        // Safe fallback if maxAlternatives isn't writable in Android WebView
        this.recognition.maxAlternatives = 1;
      }
    }
  }

  /**
   * Start high-accuracy voice recognition
   * @param {Object} options
   * @param {string} options.language - 'ta', 'en', 'auto'
   * @param {function} options.onResult - Callback (transcript, isFinal)
   * @param {function} options.onError - Callback (errorMessage)
   * @param {function} options.onEnd - Callback ()
   */
  startListening({ language = 'ta', onResult, onError, onEnd }) {
    if (!this.isSupported) {
      if (onError) onError('Speech recognition is not supported on this browser/device.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    // Explicit locale configuration
    if (language === 'en') {
      this.recognition.lang = 'en-IN';
    } else {
      // Default to Tamil (ta-IN)
      this.recognition.lang = 'ta-IN';
    }

    let silenceTimer = null;

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
        }
      }, 4500); // 4.5 second buffer for natural pauses
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      resetSilenceTimer();
    };

    this.recognition.onresult = (event) => {
      resetSilenceTimer();

      let finalTranscript = '';
      let interimTranscript = '';

      // Single source of truth reconstruction from event.results
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentText = (finalTranscript + interimTranscript).trim();
      const lastIdx = event.results.length - 1;
      const isFinal = lastIdx >= 0 ? event.results[lastIdx].isFinal : false;

      if (onResult && currentText) {
        onResult(currentText, isFinal);
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (silenceTimer) clearTimeout(silenceTimer);

      let errorMsg = 'Voice recognition error occurred.';
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        errorMsg = 'Microphone permission denied. Please allow microphone access in device settings.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Please speak into your microphone.';
      } else if (event.error === 'audio-capture') {
        errorMsg = 'No microphone was found on your device.';
      } else if (event.error === 'network') {
        errorMsg = 'Network connection required for speech recognition.';
      } else if (event.error === 'aborted') {
        return; // Normal user abort
      }

      if (onError) onError(errorMsg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (silenceTimer) clearTimeout(silenceTimer);
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      if (onError) onError('Failed to access microphone. Please try again.');
      return false;
    }
  }

  /**
   * Stop listening session
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechRecognitionService();
