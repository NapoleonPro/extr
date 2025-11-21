/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!****************************!*\
  !*** ./src/popup/popup.ts ***!
  \****************************/

// Simplified Popup Controller - System Audio Only
// File: src/popup/popup.ts
console.log('Popup loaded!');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusIndicator = document.getElementById('statusIndicator');
let isTranscribing = false;
// Check if content script is loaded
async function ensureContentScriptLoaded(tabId) {
    try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        console.log('Content script ping response:', response);
        return true;
    }
    catch (error) {
        console.log('Content script not loaded, injecting...');
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            return true;
        }
        catch (injectError) {
            console.error('Failed to inject content script:', injectError);
            return false;
        }
    }
}
// Update UI state
function updateUI(transcribing) {
    isTranscribing = transcribing;
    if (transcribing) {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusIndicator.classList.add('active');
    }
    else {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusIndicator.classList.remove('active');
    }
}
// Start transcription
startBtn?.addEventListener('click', async () => {
    console.log('Start clicked!');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) {
            alert('❌ Error: No active tab found');
            return;
        }
        // Check if it's a restricted page
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
            alert('❌ Cannot run on browser internal pages.\nPlease navigate to a regular webpage.');
            return;
        }
        // Ensure content script is loaded
        const isLoaded = await ensureContentScriptLoaded(tab.id);
        if (!isLoaded) {
            alert('❌ Failed to load extension on this page.\nTry refreshing the page or using a different website.');
            return;
        }
        // Hardcoded to system audio as per UI
        const useSystemAudio = true;
        console.log('Starting transcription with audio source: system');
        // Send start message
        chrome.tabs.sendMessage(tab.id, {
            action: 'start',
            useSystemAudio: useSystemAudio
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError.message);
                alert('❌ Error: ' + chrome.runtime.lastError.message);
                return;
            }
            console.log('Start response:', response);
            if (response?.success) {
                updateUI(true);
                // Show success notification
                if (useSystemAudio) {
                    alert('✅ Started! Please select the tab/window to capture audio from.');
                }
            }
            else {
                alert('❌ Failed to start: ' + (response?.message || 'Unknown error'));
            }
        });
    }
    catch (error) {
        console.error('Error starting transcription:', error);
        alert('❌ Error: ' + error);
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
            console.log('Stop response:', response);
            updateUI(false);
        });
    }
    catch (error) {
        console.error('Error stopping transcription:', error);
        updateUI(false);
    }
});
// Initialize UI
updateUI(false);

/******/ })()
;
//# sourceMappingURL=popup.js.map