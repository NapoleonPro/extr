// Popup Controller
// File: src/popup/popup.ts

console.log('Popup loaded!');

const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;

let isTranscribing = false;

// Check if content script is loaded
async function ensureContentScriptLoaded(tabId: number): Promise<boolean> {
  try {
    // Try to ping content script
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
    // Content script not loaded, need to inject
    console.log('Content script not loaded, injecting...');
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      
      // Wait a bit for script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      return false;
    }
  }
}

// Start transcription
startBtn?.addEventListener('click', async () => {
  console.log('Start clicked!');
  
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) {
      console.error('No active tab');
      alert('Error: No active tab found');
      return;
    }

    // Ensure content script is loaded
    const isLoaded = await ensureContentScriptLoaded(tab.id);
    
    if (!isLoaded) {
      alert('Error: Cannot load extension on this page. Try a regular webpage (not chrome:// or extension pages)');
      return;
    }

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'start' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError.message);
        alert('Error: ' + chrome.runtime.lastError.message);
        return;
      }

      console.log('Response:', response);
      isTranscribing = true;
      updateButtons();
    });

  } catch (error) {
    console.error('Error starting transcription:', error);
    alert('Error: ' + error);
  }
});

// Stop transcription
stopBtn?.addEventListener('click', async () => {
  console.log('Stop clicked!');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'stop' }, (response) => {
      console.log('Response:', response);
      isTranscribing = false;
      updateButtons();
    });

  } catch (error) {
    console.error('Error stopping transcription:', error);
  }
});

function updateButtons() {
  if (isTranscribing) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}