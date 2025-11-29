// Popup Controller with Model Warm-up
// File: src/popup/popup.ts

console.log('Popup loaded!');

const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const statusIndicator = document.getElementById('statusIndicator') as HTMLDivElement;

let isTranscribing = false;
let isWarmingUp = false;

// 🚀 WARM-UP MODEL ON POPUP OPEN
async function warmUpModelInBackground() {
  if (isWarmingUp) return;
  
  isWarmingUp = true;
  console.log('🔥 Triggering model warm-up...');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'warmUp' });
    console.log('Warm-up response:', response);
  } catch (error) {
    console.warn('Warm-up failed:', error);
  } finally {
    isWarmingUp = false;
  }
}

// Warm-up model immediately when popup opens
warmUpModelInBackground();

async function ensureContentScriptLoaded(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    console.log('Content script ping response:', response);
    return true;
  } catch (error) {
    console.log('Content script not loaded, injecting...');
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      return true;
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      return false;
    }
  }
}

function updateUI(transcribing: boolean) {
  isTranscribing = transcribing;
  
  if (transcribing) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusIndicator.classList.add('active');
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusIndicator.classList.remove('active');
  }
}

startBtn?.addEventListener('click', async () => {
  console.log('Start clicked!');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) {
      alert('❌ Error: No active tab found');
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      alert('❌ Cannot run on browser internal pages.\nPlease navigate to a regular webpage.');
      return;
    }

    const isLoaded = await ensureContentScriptLoaded(tab.id);
    
    if (!isLoaded) {
      alert('❌ Failed to load extension on this page.\nTry refreshing the page or using a different website.');
      return;
    }

    const useSystemAudio = true;

    console.log('Starting transcription with audio source: system');

    chrome.tabs.sendMessage(
      tab.id, 
      { 
        action: 'start',
        useSystemAudio: useSystemAudio
      }, 
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError.message);
          alert('❌ Error: ' + chrome.runtime.lastError.message);
          return;
        }

        console.log('Start response:', response);
        
        if (response?.success) {
          updateUI(true);
          
          if (useSystemAudio) {
            alert('✅ Started! The transcription will appear at the bottom of the page.');
          }
        } else {
          alert('❌ Failed to start: ' + (response?.message || 'Unknown error'));
        }
      }
    );

  } catch (error) {
    console.error('Error starting transcription:', error);
    alert('❌ Error: ' + error);
  }
});

stopBtn?.addEventListener('click', async () => {
  console.log('Stop clicked!');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'stop' }, (response) => {
      console.log('Stop response:', response);
      updateUI(false);
    });

  } catch (error) {
    console.error('Error stopping transcription:', error);
    updateUI(false);
  }
});

updateUI(false);