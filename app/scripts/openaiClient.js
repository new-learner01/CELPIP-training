// Manage key in temporary session storage only
export function getApiKey() {
  let key = sessionStorage.getItem('gemini_session_key');
  if (!key) {
    key = window.prompt("Enter your Google Gemini API key to continue:");
    if (key && key.trim()) {
      sessionStorage.setItem('gemini_session_key', key.trim());
    }
  }
  return key ? key.trim() : '';
}

export function setApiKey(key) {
  if (key) {
    sessionStorage.setItem('gemini_session_key', key.trim());
  }
}

export function clearApiKey() {
  sessionStorage.removeItem('gemini_session_key');
}

/**
 * 1. AI Text Generation & Evaluation (Google Gemini Free Tier)
 */
export async function generateChatCompletion(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key is required. Please refresh and enter your Gemini API key.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Extract system message and user/assistant messages
  let systemText = '';
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemText += msg.content + '\n';
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  // Gemini requires at least one user content item
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Start practice task' }] });
  }

  const requestBody = { contents };
  if (systemText.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: systemText.trim() }]
    };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API request failed with status ${res.status}`);
  }

  const data = await res.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return replyText;
}

/**
 * 2. Listening Section Audio (Native Web Speech Synthesis)
 */
export function playListeningAudio(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis is not supported on this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.93;
  utterance.lang = 'en-CA'; // Falls back to en-US if Canadian voice isn't installed
  window.speechSynthesis.speak(utterance);
}

/**
 * 3. Speaking Section Audio Recording & Transcription (Native Web Speech API)
 */
export function startVoiceRecording(onInterimResult, onFinalResult) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Browser voice recognition requires Google Chrome, Microsoft Edge, or Safari.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    if (onInterimResult) onInterimResult(transcript);
  };

  if (onFinalResult) {
    recognition.onend = () => onFinalResult();
  }

  recognition.start();
  return recognition;
}

/**
 * 4. Image Fallback for Speaking Tasks 3, 4, and 8
 * Returns high-resolution public images rather than generating via paid DALL-E
 */
const SCENE_COLLECTION = [
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80'
];

export async function generateSceneImage() {
  const randomIndex = Math.floor(Math.random() * SCENE_COLLECTION.length);
  return SCENE_COLLECTION[randomIndex];
}