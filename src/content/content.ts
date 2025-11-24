// Content Script - Tab Audio Capture via Background Worker
// File: src/content/content.ts

import { TranscriptRecognition } from './speechRecognition';

console.log('Tab Audio Capture content script loaded!');

let recognition: TranscriptRecognition | null = null;
let transcriptOverlay: HTMLDivElement | null = null;

// Buffer management
let lastProcessedText = '';
let displayedTexts = new Set<string>();
let transcriptBuffer: Array<{text: string, timestamp: number}> = [];
const BUFFER_CLEANUP_INTERVAL = 30000;

// Create enhanced overlay UI
function createOverlay() {
  if (transcriptOverlay) return;

  transcriptOverlay = document.createElement('div');
  transcriptOverlay.id = 'transcript-overlay';
  transcriptOverlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.92);
    color: white;
    padding: 20px 28px;
    border-radius: 16px;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 17px;
    max-width: 85%;
    max-height: 35vh;
    overflow-y: auto;
    z-index: 999999;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    display: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const statusDiv = document.createElement('div');
  statusDiv.id = 'transcript-status';
  statusDiv.style.cssText = `
    font-size: 12px;
    color: #4CAF50;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  `;
  statusDiv.innerHTML = `
    <span style="display: inline-block; width: 10px; height: 10px; background: #4CAF50; border-radius: 50%; animation: pulse 1.5s infinite;"></span>
    <span id="status-text">Listening to Tab Audio...</span>
  `;

  const audioSourceDiv = document.createElement('div');
  audioSourceDiv.id = 'audio-source';
  audioSourceDiv.style.cssText = `
    font-size: 11px;
    color: #999;
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  audioSourceDiv.innerHTML = `
    <span>🔊</span>
    <span>Tab Audio (Direct)</span>
  `;

  headerDiv.appendChild(statusDiv);
  headerDiv.appendChild(audioSourceDiv);

  const textDiv = document.createElement('div');
  textDiv.id = 'transcript-text';
  textDiv.style.cssText = `
    line-height: 1.7;
    min-height: 32px;
    color: rgba(255, 255, 255, 0.95);
    letter-spacing: 0.3px;
  `;
  textDiv.innerHTML = `<span style="color: #999; font-style: italic;">Waiting for audio...</span>`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.8); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    #transcript-overlay::-webkit-scrollbar {
      width: 6px;
    }
    
    #transcript-overlay::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    
    #transcript-overlay::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    
    .transcript-segment {
      animation: fadeIn 0.3s ease-out;
      margin-bottom: 8px;
    }
    
    .repaired-text {
      background: rgba(76, 175, 80, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      border-bottom: 2px solid #4CAF50;
    }
    
    .low-confidence {
      color: #FF9800;
    }
    
    .medium-confidence {
      color: #FFEB3B;
    }
  `;
  document.head.appendChild(style);

  transcriptOverlay.appendChild(headerDiv);
  transcriptOverlay.appendChild(textDiv);
  document.body.appendChild(transcriptOverlay);

  console.log('Enhanced overlay created');
  startBufferCleanup();
}

function startBufferCleanup() {
  setInterval(() => {
    const now = Date.now();
    transcriptBuffer = transcriptBuffer.filter(item => 
      now - item.timestamp < BUFFER_CLEANUP_INTERVAL
    );
    
    if (displayedTexts.size > 50) {
      displayedTexts.clear();
    }
  }, 10000);
}

function isTextAlreadyDisplayed(newText: string): boolean {
  const normalized = newText.toLowerCase().trim();
  
  if (displayedTexts.has(normalized)) {
    return true;
  }
  
  if (lastProcessedText) {
    const lastNormalized = lastProcessedText.toLowerCase().trim();
    
    if (lastNormalized.includes(normalized) && normalized.length > 5) {
      return true;
    }
    
    const similarity = calculateSimilarity(normalized, lastNormalized);
    if (similarity > 0.8) {
      return true;
    }
  }
  
  return false;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

async function repairTextWithAI(text: string, confidence: number): Promise<{text: string, wasRepaired: boolean}> {
  try {
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = 'Processing with AI...';
    }
    
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await Promise.race([
      chrome.runtime.sendMessage({
        action: 'repairText',
        text: text,
        confidence: confidence,
        requestId: requestId
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )
    ]) as any;

    if (statusText) {
      statusText.textContent = 'Listening to Tab Audio...';
    }

    if (response && response.success) {
      return {
        text: response.repairedText,
        wasRepaired: response.wasRepaired
      };
    }
    
    return { text, wasRepaired: false };

  } catch (error) {
    console.error('AI Repair error:', error);
    
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = 'Listening to Tab Audio...';
    }
    
    return { text, wasRepaired: false };
  }
}

async function updateTranscript(text: string, isFinal: boolean, confidence: number) {
  if (!transcriptOverlay) return;

  if (!isFinal) {
    return;
  }

  const textDiv = document.getElementById('transcript-text');
  if (!textDiv) return;

  if (isTextAlreadyDisplayed(text)) {
    console.log('⏭️ Skipping duplicate text:', text);
    return;
  }

  const repairResult = await repairTextWithAI(text, confidence);
  const repairedText = repairResult.text;
  const wasRepaired = repairResult.wasRepaired;

  let confidenceClass = '';
  if (confidence < 0.5) {
    confidenceClass = 'low-confidence';
  } else if (confidence < 0.7) {
    confidenceClass = 'medium-confidence';
  }

  const repairClass = wasRepaired ? 'repaired-text' : '';

  const segment = `<span class="transcript-segment ${confidenceClass} ${repairClass}">${repairedText}</span> `;
  
  if (textDiv.innerHTML.includes('Waiting for audio')) {
    textDiv.innerHTML = '';
  }
  
  textDiv.innerHTML += segment;

  lastProcessedText = repairedText;
  displayedTexts.add(repairedText.toLowerCase().trim());
  transcriptBuffer.push({
    text: repairedText,
    timestamp: Date.now()
  });

  textDiv.scrollTop = textDiv.scrollHeight;

  const segments = textDiv.querySelectorAll('.transcript-segment');
  if (segments.length > 10) {
    for (let i = 0; i < segments.length - 10; i++) {
      segments[i].remove();
    }
  }

  console.log(`✅ Displayed: "${text}" → "${repairedText}" (confidence: ${confidence.toFixed(2)}, repaired: ${wasRepaired})`);
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

function resetBuffer() {
  lastProcessedText = '';
  displayedTexts.clear();
  transcriptBuffer = [];
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received:', message);

  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'Tab audio content script ready' });
    return true;
  }

  if (message.action === 'start') {
    (async () => {
      try {
        createOverlay();
        resetBuffer();
        
        // Initialize recognition - Speech Recognition API akan otomatis
        // mendengar audio dari tab yang aktif (tidak perlu getDisplayMedia)
        if (!recognition) {
          recognition = new TranscriptRecognition(async (text, isFinal, confidence) => {
            await updateTranscript(text, isFinal, confidence);
          });
        }

        recognition.start();
        showOverlay();
        
        sendResponse({ success: true, message: 'Started listening to tab audio' });

      } catch (error) {
        console.error('❌ Start error:', error);
        sendResponse({ success: false, message: String(error) });
      }
    })();

    return true;
  }

  if (message.action === 'stop') {
    if (recognition) {
      recognition.stop();
      hideOverlay();
      resetBuffer();
    }
    sendResponse({ success: true, message: 'Stopped' });
    return true;
  }

  return true;
});