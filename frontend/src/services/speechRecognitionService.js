/**
 * High-Reliability Speech Recognition Service for Cashly
 * Works consistently across Android WebView APK and Desktop Browsers.
 */

class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.silenceTimer = null;
    this.latestTranscript = '';
  }

  /**
   * Check if speech recognition is available in the current environment
   */
  isAvailable() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Request microphone permissions explicitly
   */
  async requestPermission() {
    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
        return { granted: true };
      }
      return { granted: true };
    } catch (err) {
      console.warn('Microphone permission request:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      return {
        granted: false,
        message: isDenied
          ? 'Microphone permission denied. Please allow microphone access in app settings.'
          : 'Could not access device microphone.'
      };
    }
  }

  /**
   * Start speech recognition session
   */
  async startListening({ language = 'ta-IN', onResult, onError, onEnd }) {
    if (this.isListening) {
      this.stopListening();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) onError('Speech recognition is not supported on this device.');
      return false;
    }

    // Request mic access first
    const perm = await this.requestPermission();
    if (!perm.granted) {
      if (onError) onError(perm.message || 'Microphone permission required');
      return false;
    }

    try {
      let targetLang = 'ta-IN';
      const cleanLang = (language || '').toLowerCase().trim();
      if (cleanLang.startsWith('en')) {
        targetLang = 'en-IN';
      } else {
        targetLang = 'ta-IN';
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = targetLang;

      try {
        this.recognition.maxAlternatives = 1;
      } catch (e) {}

      let accumulatedFinal = '';
      this.latestTranscript = '';

      const resetSilenceTimer = () => {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          if (this.isListening) {
            this.stopListening();
          }
        }, 4000);
      };

      this.recognition.onstart = () => {
        this.isListening = true;
        resetSilenceTimer();
      };

      this.recognition.onresult = (event) => {
        resetSilenceTimer();

        let interimStr = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            accumulatedFinal += (accumulatedFinal ? ' ' : '') + item[0].transcript.trim();
          } else {
            interimStr += item[0].transcript;
          }
        }

        const currentCombined = (accumulatedFinal + (interimStr ? ' ' + interimStr : '')).trim();
        const lastIdx = event.results.length - 1;
        const isFinal = lastIdx >= 0 ? event.results[lastIdx].isFinal : false;

        this.latestTranscript = currentCombined;

        if (onResult && currentCombined) {
          onResult(currentCombined, isFinal);
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);

        if (event.error === 'aborted') {
          return;
        }

        let errorMsg = 'Voice recognition error occurred.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          errorMsg = 'Microphone permission denied. Please allow microphone access.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'No speech detected. Please speak clearly.';
        } else if (event.error === 'audio-capture') {
          errorMsg = 'No microphone was found on your device.';
        } else if (event.error === 'network') {
          errorMsg = 'Network connection required for speech recognition.';
        }

        if (onError) onError(errorMsg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        if (onEnd) onEnd();
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      this.isListening = false;
      if (onError) onError('Failed to access microphone. Please try again.');
      return false;
    }
  }

  /**
   * Stop listening session
   */
  stopListening() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechRecognitionService();
