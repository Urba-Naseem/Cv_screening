// static/voice.js

let currentLang = 'en-US';
let voiceList = [];
let isSpeaking = false;
let isListening = false;
let translationCache = {};

function loadVoices() {
    return new Promise((resolve) => {
        if (window.speechSynthesis.getVoices().length > 0) {
            voiceList = window.speechSynthesis.getVoices();
            resolve(voiceList);
        } else {
            window.speechSynthesis.onvoiceschanged = function() {
                voiceList = window.speechSynthesis.getVoices();
                resolve(voiceList);
            };
        }
    });
}

function getBestVoice(lang) {
    let voice = voiceList.find(v => v.lang === lang);
    if (voice) return voice;
    const langCode = lang.split('-')[0];
    voice = voiceList.find(v => v.lang.startsWith(langCode));
    if (voice) return voice;
    voice = voiceList.find(v => v.lang.toLowerCase().includes(langCode));
    if (voice) return voice;
    return voiceList[0] || null;
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('voiceLang', lang);
    loadVoices().then(() => {
        const voice = getBestVoice(lang);
        if (voice) {
            speakText('Language set to ' + lang, lang);
        } else {
            alert(`No voice found for ${lang}. Please choose another language.`);
        }
    });
}

async function translateText(text, targetLang) {
    if (!text || targetLang.toLowerCase().startsWith('en')) return text;
    const cacheKey = text + '|' + targetLang;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, target: targetLang })
        });
        const data = await response.json();
        const translated = data.translated || text;
        translationCache[cacheKey] = translated;
        return translated;
    } catch (e) {
        console.error('Translation error:', e);
        return text;
    }
}

async function speakText(text, lang = currentLang) {
    if (!window.speechSynthesis) {
        alert('Text-to-Speech is not supported in your browser.');
        return;
    }
    window.speechSynthesis.cancel();
    isSpeaking = false;

    const translated = await translateText(text, lang);
    if (!translated) return;

    loadVoices().then(() => {
        const utterance = new SpeechSynthesisUtterance(translated);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1;

        const voice = getBestVoice(lang);
        if (voice) utterance.voice = voice;

        utterance.onstart = function() {
            isSpeaking = true;
            updateStopButton(true);
        };
        utterance.onend = utterance.onerror = function() {
            isSpeaking = false;
            updateStopButton(false);
        };

        window.speechSynthesis.speak(utterance);
    });
}

function stopSpeaking() {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    updateStopButton(false);
}

function updateStopButton(active) {
    const btn = document.getElementById('stopBtn');
    if (!btn) return;
    if (active) {
        btn.style.display = 'inline-block';
        btn.innerHTML = '<i class="fas fa-stop-circle"></i> Stop';
    } else {
        btn.style.display = 'none';
    }
}

function startListening(callback) {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = currentLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
        micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Listening...';
        micBtn.classList.add('listening');
        micBtn.disabled = true;
    }

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.trim();
        if (micBtn) {
            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice';
            micBtn.classList.remove('listening');
            micBtn.disabled = false;
        }
        callback(transcript.toLowerCase());
    };

    recognition.onerror = function(event) {
        console.error('Speech error:', event.error);
        if (micBtn) {
            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice';
            micBtn.classList.remove('listening');
            micBtn.disabled = false;
        }
        alert(`Speech recognition error: ${event.error}. Please try again.`);
    };

    recognition.onend = function() {
        if (micBtn) {
            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice';
            micBtn.classList.remove('listening');
            micBtn.disabled = false;
        }
    };

    recognition.start();
}

let voiceCommandHandler = null;

function setVoiceCommandHandler(handler) {
    voiceCommandHandler = handler;
}

function startVoiceCommand() {
    if (!voiceCommandHandler) {
        speakText('No voice commands available on this page.');
        return;
    }

    startListening(async function(transcript) {
        // Use the original transcript – no translation
        const lower = transcript.toLowerCase();

        // Check for stop keywords (can be extended for other languages)
        if (lower.includes('stop') || lower.includes('cancel') || lower.includes('parar')) {
            stopSpeaking();
            speakText('Stopped.');
            return;
        }

        // Pass the original transcript to the command handler
        if (voiceCommandHandler) {
            voiceCommandHandler(transcript, transcript);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const saved = localStorage.getItem('voiceLang');
    if (saved) {
        currentLang = saved;
        const select = document.getElementById('langSelect');
        if (select) select.value = saved;
    }
    loadVoices().then(() => {
        console.log(`Loaded ${voiceList.length} voices.`);
        const voice = getBestVoice(currentLang);
        if (!voice) {
            console.warn(`No voice found for ${currentLang}. Switching to English.`);
            currentLang = 'en-US';
            const select = document.getElementById('langSelect');
            if (select) select.value = 'en-US';
            localStorage.setItem('voiceLang', 'en-US');
        }
    });
});