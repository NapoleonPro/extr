console.log('Background service worker with IndoBERT AI loaded!');

const HUGGINGFACE_API_KEY = ''; 

// IndoBERT model b indo 
const MODEL_NAME = 'indobenchmark/indobert-base-p1';

interface RepairRequest {
  text: string;
  confidence: number;
  requestId: string;
}

interface RepairResponse {
  repairedText: string;
  success: boolean;
  wasRepaired: boolean;
  originalText: string;
}

// Cache untuk hasil repair
const repairCache = new Map<string, string>();

// Flag untuk warm-up status
let modelWarmedUp = false;

// Extended Indonesian dictionary
const indonesianDictionary: { [key: string]: string } = {
  'aplikas': 'aplikasi',
  'progrem': 'program',
  'komputr': 'komputer',
  'kompter': 'komputer',
  'sistim': 'sistem',
  'teknolgi': 'teknologi',
  'teknologi': 'teknologi',
  'infrstruktur': 'infrastruktur',
  'dta': 'data',
  'databse': 'database',
  'dtabase': 'database',
  'jaringn': 'jaringan',
  'servr': 'server',
  'aplkasi': 'aplikasi',
  'prgrm': 'program',
  'softwer': 'software',
  'hardwer': 'hardware',
  'netwrk': 'network',
  'intrnet': 'internet',
  'websit': 'website',
  'emeil': 'email',
  'pasword': 'password',
  'akun': 'akun',
  'pengguna': 'pengguna',
  'pngguna': 'pengguna',
  'dokumen': 'dokumen',
  'dokumnt': 'dokumen',
  'file': 'file',
  'folder': 'folder',
  'direktori': 'direktori',
  'penyimpanan': 'penyimpanan',
  'pnyimpanan': 'penyimpanan',
  // Common words
  'saya': 'saya',
  'anda': 'anda',
  'kita': 'kita',
  'mereka': 'mereka',
  'bagaimana': 'bagaimana',
  'kapan': 'kapan',
  'dimana': 'dimana',
  'mengapa': 'mengapa',
  'siapa': 'siapa'
};

// 🚀 WARM-UP MODEL ON EXTENSION START
async function warmUpModel() {
  if (modelWarmedUp || !HUGGINGFACE_API_KEY) {
    return;
  }
  
  console.log('🔥 Warming up IndoBERT model...');
  
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: 'Halo, ini adalah test [MASK] untuk warm-up model.',
          options: { 
            wait_for_model: true,
            use_cache: true
          }
        })
      }
    );
    
    if (response.ok) {
      modelWarmedUp = true;
      console.log('✅ Model warmed up successfully!');
    } else {
      console.warn('⚠️ Model warm-up failed, will try on first use');
    }
  } catch (error) {
    console.warn('⚠️ Model warm-up error:', error);
  }
}

// Run warm-up on extension load
if (HUGGINGFACE_API_KEY) {
  warmUpModel();
} else {
  console.warn('⚠️ No HuggingFace API key set, AI repair will be disabled');
}

// Quick dictionary-based repair
function quickRepair(text: string): { repaired: string; wasRepaired: boolean } {
  const words = text.toLowerCase().split(' ');
  let wasRepaired = false;
  
  const repairedWords = words.map(word => {
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    
    if (indonesianDictionary[cleanWord]) {
      wasRepaired = true;
      return word.replace(cleanWord, indonesianDictionary[cleanWord]);
    }
    
    return word;
  });
  
  const repaired = repairedWords.join(' ');
  
  return {
    repaired: repaired.charAt(0).toUpperCase() + repaired.slice(1),
    wasRepaired
  };
}

// Advanced repair using HuggingFace IndoBERT API
async function repairWithIndoBERT(text: string, confidence: number): Promise<RepairResponse> {
  const originalText = text;
  
  // Step 1: Quick dictionary repair first (INSTANT)
  const quickResult = quickRepair(text);
  
  if (quickResult.wasRepaired) {
    console.log(`✅ Quick repaired: "${text}" → "${quickResult.repaired}"`);
    return {
      repairedText: quickResult.repaired,
      success: true,
      wasRepaired: true,
      originalText
    };
  }
  
  // Step 2: Skip API jika confidence tinggi (>0.8)
  if (confidence > 0.8) {
    return {
      repairedText: text,
      success: true,
      wasRepaired: false,
      originalText
    };
  }
  
  // Step 3: Check cache
  if (repairCache.has(text)) {
    const cached = repairCache.get(text)!;
    console.log(`📦 Cache hit: "${text}"`);
    return {
      repairedText: cached,
      success: true,
      wasRepaired: cached !== text,
      originalText
    };
  }
  
  // Step 4: Skip untuk text pendek
  if (text.split(' ').length <= 2) {
    return {
      repairedText: text,
      success: true,
      wasRepaired: false,
      originalText
    };
  }
  
  // Step 5: Skip jika API key tidak ada
  if (!HUGGINGFACE_API_KEY) {
    console.warn('⚠️ No API key, skipping AI repair');
    return {
      repairedText: text,
      success: false,
      wasRepaired: false,
      originalText
    };
  }
  
  // Step 6: Use HuggingFace API dengan timeout PENDEK (1.5 detik)
  try {
    console.log(`🤖 Calling IndoBERT API for: "${text}" (conf: ${confidence.toFixed(2)})`);
    
    const words = text.split(' ');
    let repairedText = text;
    let anyRepaired = false;
    
    // Cari kata dengan confidence paling rendah
    let lowestConfWord = '';
    let lowestConfIndex = -1;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (word.length < 3 || /\d/.test(word)) {
        lowestConfWord = word;
        lowestConfIndex = i;
        break;
      }
    }
    
    if (lowestConfIndex === -1) {
      return {
        repairedText: text,
        success: true,
        wasRepaired: false,
        originalText
      };
    }
    
    const maskedWords = [...words];
    maskedWords[lowestConfIndex] = '[MASK]';
    const maskedSentence = maskedWords.join(' ');
    
    // Call API dengan timeout LEBIH PENDEK (1.5 detik)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // ← 1.5 detik timeout
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: maskedSentence,
          options: { 
            wait_for_model: false, // ← JANGAN TUNGGU, langsung error jika model cold
            use_cache: true
          }
        }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const results = await response.json();
      
      if (Array.isArray(results) && results.length > 0) {
        const topPrediction = results[0];
        const suggestedWord = topPrediction.token_str?.trim();
        const score = topPrediction.score;
        
        if (
          suggestedWord && 
          suggestedWord.toLowerCase() !== lowestConfWord.toLowerCase() &&
          score > 0.1 &&
          suggestedWord.length > 1
        ) {
          console.log(`  ✨ Repaired: "${lowestConfWord}" → "${suggestedWord}" (score: ${score.toFixed(3)})`);
          words[lowestConfIndex] = suggestedWord;
          anyRepaired = true;
        }
      }
    }
    
    repairedText = words.join(' ');
    repairedText = repairedText.charAt(0).toUpperCase() + repairedText.slice(1);
    
    // Cache result
    repairCache.set(text, repairedText);
    
    if (repairCache.size > 100) {
      const firstKey = repairCache.keys().next().value;
      if (firstKey) {
        repairCache.delete(firstKey);
      }
    }
    
    console.log(`${anyRepaired ? '✅' : '➡️'} Final: "${repairedText}"`);
    
    return {
      repairedText,
      success: true,
      wasRepaired: anyRepaired,
      originalText
    };
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('⏱️ API timeout, using original text');
    } else {
      console.error('❌ API error:', error);
    }
    
    return {
      repairedText: text,
      success: false,
      wasRepaired: false,
      originalText
    };
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'repairText') {
    const { text, confidence, requestId } = request as RepairRequest;
    
    console.log(`📨 Repair request [${requestId}]: "${text}" (conf: ${confidence?.toFixed(2) || 'N/A'})`);
    
    repairWithIndoBERT(text, confidence)
      .then(result => {
        console.log(`📤 Sending response [${requestId}]:`, result);
        sendResponse(result);
      })
      .catch(error => {
        console.error(`❌ Repair failed [${requestId}]:`, error);
        sendResponse({
          repairedText: text,
          success: false,
          wasRepaired: false,
          originalText: text
        } as RepairResponse);
      });
    
    return true;
  }
  
  if (request.action === 'ping') {
    sendResponse({ 
      status: 'ok', 
      message: 'Background service ready',
      model: MODEL_NAME,
      modelWarmedUp: modelWarmedUp,
      hasCacheEntries: repairCache.size
    });
    return true;
  }
  
  if (request.action === 'clearCache') {
    repairCache.clear();
    sendResponse({ 
      success: true, 
      message: 'Cache cleared' 
    });
    return true;
  }
  
  // 🚀 MANUAL WARM-UP TRIGGER
  if (request.action === 'warmUp') {
    warmUpModel().then(() => {
      sendResponse({
        success: true,
        warmedUp: modelWarmedUp
      });
    });
    return true;
  }
});

console.log('✅ IndoBERT AI Background Service initialized');
console.log('📚 Dictionary entries:', Object.keys(indonesianDictionary).length);
console.log('🤖 Model:', MODEL_NAME);
console.log('🔑 API Key configured:', HUGGINGFACE_API_KEY ? 'Yes' : 'No');