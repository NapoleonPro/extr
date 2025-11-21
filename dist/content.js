/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/content/speechRecognition.ts":
/*!******************************************!*\
  !*** ./src/content/speechRecognition.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TranscriptRecognition: () => (/* binding */ TranscriptRecognition)
/* harmony export */ });
// Speech Recognition Handler
// File: src/content/speechRecognition.ts
class TranscriptRecognition {
    constructor(callback) {
        this.isListening = false;
        this.transcriptCallback = callback;
        this.initRecognition();
    }
    initRecognition() {
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
        this.recognition.onresult = (event) => {
            this.handleResult(event);
        };
        this.recognition.onerror = (event) => {
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
    handleResult(event) {
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
    start() {
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
        }
        catch (error) {
            console.error('Error starting recognition:', error);
        }
    }
    stop() {
        if (!this.recognition || !this.isListening) {
            return;
        }
        this.isListening = false;
        this.recognition.stop();
        console.log('Stopped listening');
    }
    isActive() {
        return this.isListening;
    }
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************************!*\
  !*** ./src/content/content.ts ***!
  \********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _speechRecognition__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./speechRecognition */ "./src/content/speechRecognition.ts");
// Optimized Content Script - System Audio Focus with Smart Buffer
// File: src/content/content.ts

console.log('Optimized content script loaded!');
let recognition = null;
let transcriptOverlay = null;
let audioContext = null;
let systemAudioStream = null;
// Buffer management untuk avoid duplikasi
let lastProcessedText = '';
let displayedTexts = new Set();
let transcriptBuffer = [];
const BUFFER_CLEANUP_INTERVAL = 30000; // 30 detik
// Create enhanced overlay UI
function createOverlay() {
    if (transcriptOverlay)
        return;
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
    // Header with status
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;
    // Status indicator
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
    <span id="status-text">Listening to System Audio...</span>
  `;
    // Audio source indicator (always system audio)
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
    <span>System Audio</span>
  `;
    headerDiv.appendChild(statusDiv);
    headerDiv.appendChild(audioSourceDiv);
    // Transcript text container
    const textDiv = document.createElement('div');
    textDiv.id = 'transcript-text';
    textDiv.style.cssText = `
    line-height: 1.7;
    min-height: 32px;
    color: rgba(255, 255, 255, 0.95);
    letter-spacing: 0.3px;
  `;
    textDiv.innerHTML = `<span style="color: #999; font-style: italic;">Waiting for audio...</span>`;
    // Add animation keyframes
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
    // Start buffer cleanup timer
    startBufferCleanup();
}
// Buffer cleanup untuk hapus teks lama
function startBufferCleanup() {
    setInterval(() => {
        const now = Date.now();
        // Hapus entri lebih dari 30 detik
        transcriptBuffer = transcriptBuffer.filter(item => now - item.timestamp < BUFFER_CLEANUP_INTERVAL);
        // Limit displayedTexts set size
        if (displayedTexts.size > 50) {
            displayedTexts.clear();
        }
    }, 10000); // Check setiap 10 detik
}
// Cek apakah text sudah pernah ditampilkan atau sangat mirip
function isTextAlreadyDisplayed(newText) {
    const normalized = newText.toLowerCase().trim();
    // Exact match
    if (displayedTexts.has(normalized)) {
        return true;
    }
    // Check similarity dengan text terakhir
    if (lastProcessedText) {
        const lastNormalized = lastProcessedText.toLowerCase().trim();
        // Jika text baru adalah subset dari text lama, skip
        if (lastNormalized.includes(normalized) && normalized.length > 5) {
            return true;
        }
        // Jika sangat mirip (>80% sama)
        const similarity = calculateSimilarity(normalized, lastNormalized);
        if (similarity > 0.8) {
            return true;
        }
    }
    return false;
}
// Simple similarity calculation
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0)
        return 1.0;
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
// Levenshtein distance
function getEditDistance(str1, str2) {
    const matrix = [];
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
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[str2.length][str1.length];
}
// Context Repair dengan caching dan optimization
async function repairTextWithAI(text, confidence) {
    try {
        // Update status
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = 'Processing with AI...';
        }
        // Generate unique request ID
        const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Send to background service (dengan timeout)
        const response = await Promise.race([
            chrome.runtime.sendMessage({
                action: 'repairText',
                text: text,
                confidence: confidence,
                requestId: requestId
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000) // 3 detik timeout
            )
        ]);
        // Reset status
        if (statusText) {
            statusText.textContent = 'Listening to System Audio...';
        }
        if (response && response.success) {
            return {
                text: response.repairedText,
                wasRepaired: response.wasRepaired
            };
        }
        return { text, wasRepaired: false };
    }
    catch (error) {
        console.error('AI Repair error:', error);
        // Reset status
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = 'Listening to System Audio...';
        }
        return { text, wasRepaired: false };
    }
}
// Update transcript dengan smart buffering
async function updateTranscript(text, isFinal, confidence) {
    if (!transcriptOverlay)
        return;
    // HANYA PROSES FINAL RESULTS
    if (!isFinal) {
        return; // Skip semua interim results untuk kurangi delay
    }
    const textDiv = document.getElementById('transcript-text');
    if (!textDiv)
        return;
    // Check if text sudah pernah ditampilkan
    if (isTextAlreadyDisplayed(text)) {
        console.log('⏭️ Skipping duplicate text:', text);
        return;
    }
    // Apply AI repair (dengan quick mode)
    const repairResult = await repairTextWithAI(text, confidence);
    const repairedText = repairResult.text;
    const wasRepaired = repairResult.wasRepaired;
    // Determine confidence color
    let confidenceClass = '';
    if (confidence < 0.5) {
        confidenceClass = 'low-confidence';
    }
    else if (confidence < 0.7) {
        confidenceClass = 'medium-confidence';
    }
    // Check if text was repaired
    const repairClass = wasRepaired ? 'repaired-text' : '';
    // Create new segment
    const segment = `<span class="transcript-segment ${confidenceClass} ${repairClass}">${repairedText}</span> `;
    // Clear placeholder text if present
    if (textDiv.innerHTML.includes('Waiting for audio')) {
        textDiv.innerHTML = '';
    }
    // Append new text
    textDiv.innerHTML += segment;
    // Update buffer
    lastProcessedText = repairedText;
    displayedTexts.add(repairedText.toLowerCase().trim());
    transcriptBuffer.push({
        text: repairedText,
        timestamp: Date.now()
    });
    // Auto-scroll
    textDiv.scrollTop = textDiv.scrollHeight;
    // Limit display length (keep last 10 segments only)
    const segments = textDiv.querySelectorAll('.transcript-segment');
    if (segments.length > 10) {
        // Remove oldest segments
        for (let i = 0; i < segments.length - 10; i++) {
            segments[i].remove();
        }
    }
    console.log(`✅ Displayed: "${text}" → "${repairedText}" (confidence: ${confidence.toFixed(2)}, repaired: ${wasRepaired})`);
}
// Capture system audio (FOKUS DI SINI)
async function captureSystemAudio() {
    try {
        console.log('🔊 Requesting system audio capture...');
        // Request tab audio capture with optimized settings
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: false, // Video tidak perlu
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000 // Higher quality
            }
        });
        if (!stream.getAudioTracks().length) {
            throw new Error('No audio track in stream');
        }
        systemAudioStream = stream;
        console.log('✅ System audio captured successfully');
        return true;
    }
    catch (error) {
        console.error('❌ Failed to capture system audio:', error);
        alert('⚠️ Tidak bisa capture audio sistem.\n\nPastikan:\n1. Pilih tab/window yang ada audionya\n2. Centang "Share audio" saat diminta permission\n3. Gunakan Chrome/Edge (bukan Firefox)');
        return false;
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
function stopAllAudioCapture() {
    if (systemAudioStream) {
        systemAudioStream.getTracks().forEach(track => track.stop());
        systemAudioStream = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}
// Reset buffer
function resetBuffer() {
    lastProcessedText = '';
    displayedTexts.clear();
    transcriptBuffer = [];
}
// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message received:', message);
    // Ping handler
    if (message.action === 'ping') {
        sendResponse({ success: true, message: 'Optimized content script ready' });
        return true;
    }
    // Start transcription - SELALU PAKAI SYSTEM AUDIO
    if (message.action === 'start') {
        (async () => {
            try {
                createOverlay();
                resetBuffer(); // Clear buffer saat start
                // WAJIB capture system audio
                const captureSuccess = await captureSystemAudio();
                if (!captureSuccess) {
                    sendResponse({ success: false, message: 'Failed to capture system audio' });
                    return;
                }
                // Initialize recognition
                if (!recognition) {
                    recognition = new _speechRecognition__WEBPACK_IMPORTED_MODULE_0__.TranscriptRecognition(async (text, isFinal, confidence) => {
                        await updateTranscript(text, isFinal, confidence);
                    });
                }
                recognition.start();
                showOverlay();
                sendResponse({ success: true, message: 'Started listening to system audio' });
            }
            catch (error) {
                console.error('❌ Start error:', error);
                sendResponse({ success: false, message: String(error) });
            }
        })();
        return true;
    }
    // Stop transcription
    if (message.action === 'stop') {
        if (recognition) {
            recognition.stop();
            hideOverlay();
            stopAllAudioCapture();
            resetBuffer();
        }
        sendResponse({ success: true, message: 'Stopped' });
        return true;
    }
    return true;
});

})();

/******/ })()
;
//# sourceMappingURL=content.js.map