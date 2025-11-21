/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!**************************************!*\
  !*** ./src/background/background.ts ***!
  \**************************************/

// Background Service Worker with HuggingFace IndoBERT Integration
// File: src/background/background.ts
console.log('Background service worker with IndoBERT AI loaded!');
// ⚠️ IMPORTANT: Masukkan HuggingFace API key Anda di sini
// Dapatkan dari: https://huggingface.co/settings/tokens
// JANGAN PERNAH membagikan kunci ini atau menyimpannya di dalam kode secara permanen.
const HUGGINGFACE_API_KEY = ''; // ← PASTE KUNCI ANDA DI SINI (HANYA UNTUK DEVELOPMENT)
// if (HUGGINGFACE_API_KEY === '') {
//   console.error('❌ FATAL: HuggingFace API Key belum diatur di src/background/background.ts. Silakan masukkan kunci Anda untuk melanjutkan.');
// }
// IndoBERT model for Indonesian language
const MODEL_NAME = 'indobenchmark/indobert-base-p1';
// Cache untuk hasil repair (avoid duplicate API calls)
const repairCache = new Map();
// Simple Indonesian dictionary untuk quick fix common errors
const indonesianDictionary = {
    // Common speech recognition errors in Indonesian
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
    'pnyimpanan': 'penyimpanan'
};
// Quick dictionary-based repair (instant, no API call)
function quickRepair(text) {
    const words = text.toLowerCase().split(' ');
    let wasRepaired = false;
    const repairedWords = words.map(word => {
        // Remove punctuation for matching
        const cleanWord = word.replace(/[.,!?;:]/g, '');
        if (indonesianDictionary[cleanWord]) {
            wasRepaired = true;
            // Preserve punctuation
            return word.replace(cleanWord, indonesianDictionary[cleanWord]);
        }
        return word;
    });
    const repaired = repairedWords.join(' ');
    // Capitalize first letter
    return {
        repaired: repaired.charAt(0).toUpperCase() + repaired.slice(1),
        wasRepaired
    };
}
// Advanced repair using HuggingFace IndoBERT API
async function repairWithIndoBERT(text, confidence) {
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
    // Step 2: Skip API jika confidence tinggi (SAVE TIME)
    if (confidence > 0.75) {
        return {
            repairedText: text,
            success: true,
            wasRepaired: false,
            originalText
        };
    }
    // Step 3: Check cache (INSTANT)
    if (repairCache.has(text)) {
        const cached = repairCache.get(text);
        console.log(`📦 Cache hit: "${text}"`);
        return {
            repairedText: cached,
            success: true,
            wasRepaired: cached !== text,
            originalText
        };
    }
    // Step 4: Untuk text pendek, skip API (TEXT PENDEK BIASANYA BENAR)
    if (text.split(' ').length <= 2) {
        return {
            repairedText: text,
            success: true,
            wasRepaired: false,
            originalText
        };
    }
    // Step 5: Use HuggingFace API HANYA untuk kasus yang perlu
    try {
        console.log(`🤖 Calling IndoBERT API for: "${text}" (confidence: ${confidence.toFixed(2)})`);
        const words = text.split(' ');
        let repairedText = text;
        let anyRepaired = false;
        // HANYA repair 1 kata dengan confidence paling rendah (FASTER)
        let lowestConfWord = '';
        let lowestConfIndex = -1;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            // Heuristic: kata pendek (<3 huruf) atau kata dengan typo likely
            if (word.length < 3 || /\d/.test(word)) {
                lowestConfWord = word;
                lowestConfIndex = i;
                break;
            }
        }
        // Jika tidak ada kata suspicious, return original
        if (lowestConfIndex === -1) {
            return {
                repairedText: text,
                success: true,
                wasRepaired: false,
                originalText
            };
        }
        // Repair hanya 1 kata (SINGLE API CALL = FASTER)
        const maskedWords = [...words];
        maskedWords[lowestConfIndex] = '[MASK]';
        const maskedSentence = maskedWords.join(' ');
        // Call API dengan timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 detik timeout
        const response = await fetch(`https://api-inference.huggingface.co/models/${MODEL_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: maskedSentence,
                options: {
                    wait_for_model: true,
                    use_cache: true
                }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            const results = await response.json();
            if (Array.isArray(results) && results.length > 0) {
                const topPrediction = results[0];
                const suggestedWord = topPrediction.token_str?.trim();
                const score = topPrediction.score;
                if (suggestedWord &&
                    suggestedWord.toLowerCase() !== lowestConfWord.toLowerCase() &&
                    score > 0.1 &&
                    suggestedWord.length > 1) {
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
        // Limit cache size
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
    }
    catch (error) {
        // Timeout atau network error
        if (error.name === 'AbortError') {
            console.warn('⏱️ API timeout, using original text');
        }
        else {
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
        const { text, confidence, requestId } = request;
        console.log(`📨 Repair request [${requestId}]: "${text}" (confidence: ${confidence?.toFixed(2) || 'N/A'})`);
        // Process repair asynchronously
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
            });
        });
        return true; // Keep message channel open for async response
    }
    // Health check
    if (request.action === 'ping') {
        sendResponse({
            status: 'ok',
            message: 'Background service ready',
            model: MODEL_NAME,
            hasCacheEntries: repairCache.size
        });
        return true;
    }
    // Clear cache (for debugging)
    if (request.action === 'clearCache') {
        repairCache.clear();
        sendResponse({
            success: true,
            message: 'Cache cleared'
        });
        return true;
    }
});
console.log('✅ IndoBERT AI Background Service initialized');
console.log('📚 Dictionary entries:', Object.keys(indonesianDictionary).length);
console.log('🤖 Model:', MODEL_NAME);

/******/ })()
;
//# sourceMappingURL=background.js.map