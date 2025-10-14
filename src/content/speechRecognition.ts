// Speech Recognition Handler
// File: src/content/speechRecognition.ts

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class TranscriptRecognition {
  private recognition: any;
  private isListening: boolean = false;
  private transcriptCallback: (text: string, isFinal: boolean, confidence: number) => void;

  constructor(callback: (text: string, isFinal: boolean, confidence: number) => void) {
    this.transcriptCallback = callback;
    this.initRecognition();
  }

  private initRecognition() {
    // Check if Speech Recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    
    // Configuration
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = true; // Get partial results
    this.recognition.lang = 'id-ID'; // Bahasa Indonesia (ganti 'en-US' untuk English)
    this.recognition.maxAlternatives = 1;

    // Event Handlers
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      // Auto-restart on network error
      if (event.error === 'network') {
        console.log('Network error, restarting...');
        setTimeout(() => this.start(), 1000);
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // Auto-restart if still supposed to be listening
      if (this.isListening) {
        console.log('Auto-restarting recognition...');
        this.recognition.start();
      }
    };

    console.log('Speech Recognition initialized');
  }

  private handleResult(event: SpeechRecognitionEvent) {
    // Get the latest result
    const result = event.results[event.resultIndex];
    const transcript = result[0].transcript;
    const confidence = result[0].confidence;
    const isFinal = result.isFinal;

    // Send to callback
    this.transcriptCallback(transcript, isFinal, confidence);

    // Log for debugging
    console.log(`[${isFinal ? 'FINAL' : 'INTERIM'}] ${transcript} (confidence: ${confidence?.toFixed(2) || 'N/A'})`);
  }

  public start() {
    if (!this.recognition) {
      console.error('Speech Recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.log('Already listening');
      return;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('Started listening...');
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  }

  public stop() {
    if (!this.recognition || !this.isListening) {
      return;
    }

    this.isListening = false;
    this.recognition.stop();
    console.log('Stopped listening');
  }

  public isActive(): boolean {
    return this.isListening;
  }
}