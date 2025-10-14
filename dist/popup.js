/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!****************************!*\
  !*** ./src/popup/popup.ts ***!
  \****************************/

// Popup Controller
// File: src/popup/popup.ts
console.log('Popup loaded!');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
let isTranscribing = false;
// Start transcription
startBtn?.addEventListener('click', async () => {
    console.log('Start clicked!');
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) {
            console.error('No active tab');
            return;
        }
        // Send message to content script
        chrome.tabs.sendMessage(tab.id, { action: 'start' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError.message);
                alert('Error: Please refresh the page and try again');
                return;
            }
            console.log('Response:', response);
            isTranscribing = true;
            updateButtons();
        });
    }
    catch (error) {
        console.error('Error starting transcription:', error);
    }
});
// Stop transcription
stopBtn?.addEventListener('click', async () => {
    console.log('Stop clicked!');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id)
            return;
        chrome.tabs.sendMessage(tab.id, { action: 'stop' }, (response) => {
            console.log('Response:', response);
            isTranscribing = false;
            updateButtons();
        });
    }
    catch (error) {
        console.error('Error stopping transcription:', error);
    }
});
function updateButtons() {
    if (isTranscribing) {
        startBtn.disabled = true;
        stopBtn.disabled = false;
    }
    else {
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

/******/ })()
;
//# sourceMappingURL=popup.js.map