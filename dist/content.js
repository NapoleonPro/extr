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
// Main Content Script
// File: src/content/content.ts

console.log('Content script loaded!');
let recognition = null;
let transcriptOverlay = null;
// Create overlay UI for displaying transcript
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
function updateTranscript(text, isFinal, confidence) {
    if (!transcriptOverlay)
        return;
    const textDiv = document.getElementById('transcript-text');
    if (!textDiv)
        return;
    // Color based on confidence
    let color = '#ffffff';
    if (confidence < 0.5) {
        color = '#ff9800'; // Orange for low confidence
    }
    else if (confidence < 0.7) {
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
    }
    else {
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
    if (message.action === 'start') {
        if (!recognition) {
            createOverlay();
            recognition = new _speechRecognition__WEBPACK_IMPORTED_MODULE_0__.TranscriptRecognition((text, isFinal, confidence) => {
                updateTranscript(text, isFinal, confidence);
            });
        }
        recognition.start();
        showOverlay();
        sendResponse({ success: true, message: 'Started' });
    }
    if (message.action === 'stop') {
        if (recognition) {
            recognition.stop();
            hideOverlay();
        }
        sendResponse({ success: true, message: 'Stopped' });
    }
    return true; // Keep message channel open for async response
});

})();

/******/ })()
;
//# sourceMappingURL=content.js.map