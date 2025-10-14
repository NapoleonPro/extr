// Main Content Script
// File: src/content/content.ts

import { TranscriptRecognition } from './speechRecognition';

console.log('Content script loaded!');

let recognition: TranscriptRecognition | null = null;
let transcriptOverlay: HTMLDivElement | null = null;

// Create overlay UI for displaying transcript
function createOverlay() {
  if (transcriptOverlay) return;

  transcriptOverlay = document.createElement('div');
  transcriptOverlay.id = 'transcript-overlay';
  transcriptOverlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 16px;
    max-width: 80%;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    display: none;
  `;

  // Status indicator
  const statusDiv = document.createElement('div');
  statusDiv.id = 'transcript-status';
  statusDiv.style.cssText = `
    font-size: 12px;
    color: #4CAF50;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  statusDiv.innerHTML = `
    <span style="display: inline-block; width: 8px; height: 8px; background: #4CAF50; border-radius: 50%; animation: pulse 1.5s infinite;"></span>
    Listening...
  `;

  // Transcript text
  const textDiv = document.createElement('div');
  textDiv.id = 'transcript-text';
  textDiv.style.cssText = `
    line-height: 1.5;
    min-height: 24px;
  `;
  textDiv.textContent = 'Say something...';

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);

  transcriptOverlay.appendChild(statusDiv);
  transcriptOverlay.appendChild(textDiv);
  document.body.appendChild(transcriptOverlay);

  console.log('Overlay created');
}

function updateTranscript(text: string, isFinal: boolean, confidence: number) {
  if (!transcriptOverlay) return;

  const textDiv = document.getElementById('transcript-text');
  if (!textDiv) return;

  // Color based on confidence
  let color = '#ffffff';
  if (confidence < 0.5) {
    color = '#ff9800'; // Orange for low confidence
  } else if (confidence < 0.7) {
    color = '#ffeb3b'; // Yellow for medium confidence
  }

  // Display text
  if (isFinal) {
    // Final result - append to existing text
    const finalText = `<span style="color: ${color};">${text}</span> `;
    textDiv.innerHTML += finalText;
    
    // Auto-scroll if too long
    if (textDiv.textContent && textDiv.textContent.length > 200) {
      const words = textDiv.textContent.split(' ');
      textDiv.textContent = '...' + words.slice(-30).join(' ');
    }
  } else {
    // Interim result - show in gray
    const existingFinal = textDiv.querySelector('span:last-of-type')?.previousSibling?.textContent || '';
    textDiv.innerHTML = textDiv.innerHTML.split('<span style="color: #888;">')[0] + 
      `<span style="color: #888;">${text}</span>`;
  }
}

function showOverlay() {
  if (transcriptOverlay) {
    transcriptOverlay.style.display = 'block';
  }
}

function hideOverlay() {
  if (transcriptOverlay) {
    transcriptOverlay.style.display = 'none';
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  // Ping handler - check if content script is ready
  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'Content script ready' });
    return true;
  }

  // Start transcription
  if (message.action === 'start') {
    if (!recognition) {
      createOverlay();
      recognition = new TranscriptRecognition((text, isFinal, confidence) => {
        updateTranscript(text, isFinal, confidence);
      });
    }
    
    recognition.start();
    showOverlay();
    sendResponse({ success: true, message: 'Started' });
  }

  // Stop transcription
  if (message.action === 'stop') {
    if (recognition) {
      recognition.stop();
      hideOverlay();
    }
    sendResponse({ success: true, message: 'Stopped' });
  }

  return true; // Keep message channel open for async response
});