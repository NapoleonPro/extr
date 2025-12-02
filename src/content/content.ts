// Content Script - Draggable & Resizable Overlay
// File: src/content/content.ts

import { TranscriptRecognition } from './speechRecognition';

console.log('Tab Audio Capture content script loaded!');

let recognition: TranscriptRecognition | null = null;
let transcriptOverlay: HTMLDivElement | null = null;

let lastProcessedText = '';
let displayedTexts = new Set<string>();
let transcriptBuffer: Array<{text: string, timestamp: number}> = [];
const BUFFER_CLEANUP_INTERVAL = 30000;

// Drag & Resize state
let isDragging = false;
let isResizing = false;
let dragStartX = 0;
let dragStartY = 0;
let overlayStartX = 0;
let overlayStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartX = 0;
let resizeStartY = 0;

// Auto-clear state
let lastAudioTimestamp = Date.now();
let autoClearTimer: number | null = null;
const AUTO_CLEAR_DELAY = 4000; // 4 detik tanpa suara

function createOverlay() {
  if (transcriptOverlay) return;

  transcriptOverlay = document.createElement('div');
  transcriptOverlay.id = 'transcript-overlay';
  transcriptOverlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #f7f7f7;
    color: #535353;
    padding: 0;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 16px;
    width: 600px;
    height: 250px;
    z-index: 999999;
    box-shadow: 0 8px 0 #535353, 0 8px 32px rgba(0, 0, 0, 0.3);
    display: none;
    border: 3px solid #535353;
    resize: none;
  `;

  // Header (draggable area)
  const headerDiv = document.createElement('div');
  headerDiv.id = 'transcript-header';
  headerDiv.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 3px solid #535353;
    cursor: move;
    user-select: none;
    background: white;
    border-radius: 4px 4px 0 0;
  `;

  const statusDiv = document.createElement('div');
  statusDiv.id = 'transcript-status';
  statusDiv.style.cssText = `
    font-size: 11px;
    color: #535353;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  statusDiv.innerHTML = `
    <span style="display: inline-block; width: 8px; height: 8px; background: #535353; border-radius: 50%;"></span>
    <span id="status-text">LISTENING</span>
  `;

  const controlsDiv = document.createElement('div');
  controlsDiv.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  // Stop button
  const stopButton = document.createElement('button');
  stopButton.id = 'overlay-stop-btn';
  stopButton.textContent = '⏹ STOP';
  stopButton.style.cssText = `
    padding: 6px 14px;
    background: white;
    color: #535353;
    border: 2px solid #535353;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 3px 0 #535353;
    position: relative;
    top: 0;
    transition: all 0.1s;
  `;
  
  stopButton.addEventListener('mouseenter', () => {
    stopButton.style.background = '#f0f0f0';
  });
  
  stopButton.addEventListener('mouseleave', () => {
    stopButton.style.background = 'white';
  });
  
  stopButton.addEventListener('mousedown', () => {
    stopButton.style.top = '3px';
    stopButton.style.boxShadow = '0 0 0 #535353';
  });
  
  stopButton.addEventListener('mouseup', () => {
    stopButton.style.top = '0';
    stopButton.style.boxShadow = '0 3px 0 #535353';
  });
  
  stopButton.addEventListener('click', () => {
    if (recognition) {
      recognition.stop();
      hideOverlay();
      resetBuffer();
      stopAutoClearTimer();
    }
  });

  const audioSourceDiv = document.createElement('div');
  audioSourceDiv.id = 'audio-source';
  audioSourceDiv.style.cssText = `
    font-size: 10px;
    color: #787878;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  // audioSourceDiv.innerHTML = `<span>🦖</span`;

  controlsDiv.appendChild(audioSourceDiv);
  controlsDiv.appendChild(stopButton);
  headerDiv.appendChild(statusDiv);
  headerDiv.appendChild(controlsDiv);

  // Content area (scrollable)
  const contentDiv = document.createElement('div');
  contentDiv.id = 'transcript-content';
  contentDiv.style.cssText = `
    padding: 16px 20px;
    overflow-y: auto;
    height: calc(100% - 100px);
  `;

  const textDiv = document.createElement('div');
  textDiv.id = 'transcript-text';
  textDiv.style.cssText = `
    line-height: 1.7;
    min-height: 32px;
    color: #535353;
    letter-spacing: 0.3px;
  `;
  textDiv.innerHTML = `<span style="color: #787878; font-style: italic;">Waiting for audio...</span>`;

  const interimDiv = document.createElement('div');
  interimDiv.id = 'interim-text';
  interimDiv.style.cssText = `
    margin-top: 8px;
    padding: 8px;
    background: rgba(83, 83, 83, 0.05);
    border-radius: 4px;
    border-left: 3px solid #787878;
    font-style: italic;
    color: #787878;
    font-size: 14px;
    display: none;
  `;

  contentDiv.appendChild(textDiv);
  contentDiv.appendChild(interimDiv);

  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'resize-handle';
  resizeHandle.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: repeating-linear-gradient(
      135deg,
      #535353,
      #535353 2px,
      transparent 2px,
      transparent 4px
    );
    border-radius: 0 0 4px 0;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    #transcript-content::-webkit-scrollbar {
      width: 8px;
    }
    
    #transcript-content::-webkit-scrollbar-track {
      background: rgba(83, 83, 83, 0.1);
      border-radius: 4px;
    }
    
    #transcript-content::-webkit-scrollbar-thumb {
      background: #535353;
      border-radius: 4px;
    }
    
    .transcript-segment {
      animation: fadeIn 0.3s ease-out;
      margin-bottom: 8px;
    }
    
    .repaired-text {
      background: rgba(83, 83, 83, 0.1);
      padding: 2px 6px;
      border-radius: 3px;
      border-bottom: 2px solid #535353;
    }
    
    .low-confidence {
      color: #787878;
    }
    
    .medium-confidence {
      color: #535353;
    }
    
    #transcript-overlay.dragging {
      cursor: move !important;
      box-shadow: 0 12px 0 #535353, 0 12px 40px rgba(0, 0, 0, 0.4);
    }
    
    #transcript-overlay.resizing {
      cursor: nwse-resize !important;
    }
  `;
  document.head.appendChild(style);

  transcriptOverlay.appendChild(headerDiv);
  transcriptOverlay.appendChild(contentDiv);
  transcriptOverlay.appendChild(resizeHandle);
  document.body.appendChild(transcriptOverlay);

  // Setup drag & resize
  setupDragAndResize(headerDiv, resizeHandle);

  console.log('Enhanced draggable & resizable overlay created');
  startBufferCleanup();
}

function setupDragAndResize(header: HTMLElement, resizeHandle: HTMLElement) {
  if (!transcriptOverlay) return;

  // DRAG functionality
  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('#resize-handle')) return;
    if ((e.target as HTMLElement).closest('#overlay-stop-btn')) return;
    
    isDragging = true;
    transcriptOverlay!.classList.add('dragging');
    
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = transcriptOverlay!.getBoundingClientRect();
    overlayStartX = rect.left;
    overlayStartY = rect.top;
    
    // Remove transform for absolute positioning
    transcriptOverlay!.style.transform = 'none';
    transcriptOverlay!.style.left = `${overlayStartX}px`;
    transcriptOverlay!.style.top = `${overlayStartY}px`;
    
    e.preventDefault();
  });

  // RESIZE functionality
  resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
    isResizing = true;
    transcriptOverlay!.classList.add('resizing');
    
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    
    const rect = transcriptOverlay!.getBoundingClientRect();
    resizeStartWidth = rect.width;
    resizeStartHeight = rect.height;
    
    e.preventDefault();
    e.stopPropagation();
  });

  // Global mouse move
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (isDragging && transcriptOverlay) {
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      
      let newX = overlayStartX + deltaX;
      let newY = overlayStartY + deltaY;
      
      // Boundary constraints
      const maxX = window.innerWidth - transcriptOverlay.offsetWidth;
      const maxY = window.innerHeight - transcriptOverlay.offsetHeight;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      transcriptOverlay.style.left = `${newX}px`;
      transcriptOverlay.style.top = `${newY}px`;
    }
    
    if (isResizing && transcriptOverlay) {
      const deltaX = e.clientX - resizeStartX;
      const deltaY = e.clientY - resizeStartY;
      
      let newWidth = resizeStartWidth + deltaX;
      let newHeight = resizeStartHeight + deltaY;
      
      // Min/max constraints
      newWidth = Math.max(300, Math.min(newWidth, window.innerWidth - 40));
      newHeight = Math.max(150, Math.min(newHeight, window.innerHeight - 40));
      
      transcriptOverlay.style.width = `${newWidth}px`;
      transcriptOverlay.style.height = `${newHeight}px`;
    }
  });

  // Global mouse up
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      transcriptOverlay?.classList.remove('dragging');
    }
    
    if (isResizing) {
      isResizing = false;
      transcriptOverlay?.classList.remove('resizing');
    }
  });
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
      statusText.textContent = 'PROCESSING...';
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
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )
    ]) as any;

    if (statusText) {
      statusText.textContent = 'LISTENING';
    }

    if (response && response.success) {
      return {
        text: response.repairedText,
        wasRepaired: response.wasRepaired
      };
    }
    
    return { text, wasRepaired: false };

  } catch (error) {
    console.warn('AI Repair timeout/error:', error);
    
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = 'LISTENING';
    }
    
    return { text, wasRepaired: false };
  }
}

function showInterim(text: string) {
  const interimDiv = document.getElementById('interim-text');
  if (!interimDiv) return;
  
  if (text && text.length > 2) {
    interimDiv.textContent = `"${text}..."`;
    interimDiv.style.display = 'block';
  }
}

function hideInterim() {
  const interimDiv = document.getElementById('interim-text');
  if (interimDiv) {
    interimDiv.style.display = 'none';
  }
}

// AUTO-CLEAR: Hapus transkrip lama setelah beberapa detik tanpa suara
function resetAutoClearTimer() {
  // Clear existing timer
  if (autoClearTimer !== null) {
    clearTimeout(autoClearTimer);
  }
  
  // Update timestamp
  lastAudioTimestamp = Date.now();
  
  // Set new timer
  autoClearTimer = window.setTimeout(() => {
    const textDiv = document.getElementById('transcript-text');
    if (!textDiv) return;
    
    const timeSinceLastAudio = Date.now() - lastAudioTimestamp;
    
    // Jika sudah lebih dari AUTO_CLEAR_DELAY tanpa suara baru
    if (timeSinceLastAudio >= AUTO_CLEAR_DELAY) {
      console.log('🧹 Auto-clearing old transcripts (no audio for 4s)');
      
      // Fade out effect
      textDiv.style.transition = 'opacity 0.5s ease-out';
      textDiv.style.opacity = '0';
      
      setTimeout(() => {
        textDiv.innerHTML = '<span style="color: #787878; font-style: italic;">Waiting for audio...</span>';
        textDiv.style.opacity = '1';
        
        // Reset buffers
        lastProcessedText = '';
        displayedTexts.clear();
      }, 500);
    }
  }, AUTO_CLEAR_DELAY);
}

// Stop auto-clear timer
function stopAutoClearTimer() {
  if (autoClearTimer !== null) {
    clearTimeout(autoClearTimer);
    autoClearTimer = null;
  }
}

async function updateTranscript(text: string, isFinal: boolean, confidence: number) {
  if (!transcriptOverlay) return;

  // ⏱️ Reset timer setiap ada audio baru (interim atau final)
  resetAutoClearTimer();

  if (!isFinal) {
    showInterim(text);
    return;
  }

  hideInterim();

  const textDiv = document.getElementById('transcript-text');
  const contentDiv = document.getElementById('transcript-content');
  if (!textDiv || !contentDiv) return;

  if (isTextAlreadyDisplayed(text)) {
    console.log('⏭️ Skipping duplicate text:', text);
    return;
  }

  if (textDiv.innerHTML.includes('Waiting for audio')) {
    textDiv.innerHTML = '';
  }
  
  const tempId = `temp-${Date.now()}`;
  const tempSegment = `<span class="transcript-segment" id="${tempId}">${text}</span> `;
  textDiv.innerHTML += tempSegment;
  contentDiv.scrollTop = contentDiv.scrollHeight;

  repairTextWithAI(text, confidence).then(repairResult => {
    const repairedText = repairResult.text;
    const wasRepaired = repairResult.wasRepaired;

    let confidenceClass = '';
    if (confidence < 0.5) {
      confidenceClass = 'low-confidence';
    } else if (confidence < 0.7) {
      confidenceClass = 'medium-confidence';
    }

    const repairClass = wasRepaired ? 'repaired-text' : '';

    const finalSegment = `<span class="transcript-segment ${confidenceClass} ${repairClass}">${repairedText}</span> `;
    
    const tempEl = document.getElementById(tempId);
    if (tempEl) {
      tempEl.remove();
    }
    
    textDiv.innerHTML += finalSegment;

    lastProcessedText = repairedText;
    displayedTexts.add(repairedText.toLowerCase().trim());
    transcriptBuffer.push({
      text: repairedText,
      timestamp: Date.now()
    });

    contentDiv.scrollTop = contentDiv.scrollHeight;

    const segments = textDiv.querySelectorAll('.transcript-segment');
    if (segments.length > 10) {
      for (let i = 0; i < segments.length - 10; i++) {
        segments[i].remove();
      }
    }

    console.log(`✅ Displayed: "${text}" → "${repairedText}" (conf: ${confidence.toFixed(2)}, repaired: ${wasRepaired})`);
  });
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
  stopAutoClearTimer(); // ⏱️ Stop timer saat reset
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(' Message received:', message);

  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'Tab audio content script ready' });
    return true;
  }

  if (message.action === 'start') {
    (async () => {
      try {
        createOverlay();
        resetBuffer();
        
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
      stopAutoClearTimer(); // ⏱️ Stop timer saat stop
    }
    sendResponse({ success: true, message: 'Stopped' });
    return true;
  }

  return true;
});