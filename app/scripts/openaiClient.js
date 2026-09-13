/**
 * Session-based Gemini Client
 * Exports exact function signatures expected by the CELPIP app.
 */

export function getApiKey() {
  let key = sessionStorage.getItem('gemini_session_key');
  if (!key) {
    key = window.prompt("Enter your Google Gemini API Key for this session:\n(Never stored in code or repository)");
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

export function hasApiKey() {
  const key = sessionStorage.getItem('gemini_session_key');
  return Boolean(key && key.trim().length > 0);
}

// Helper to sanitize markdown fences from JSON responses
function cleanJSONResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Chat completion returning parsed JSON (used by writingSection, speakingSection, etc.)
 */
export async function chatCompletionJSON(messages, options = {}) {
  const textResponse = await chatCompletion(messages, {
    ...options,
    jsonMode: true
  });

  const cleaned = cleanJSONResponse(textResponse);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON response:', cleaned);
    throw new Error('AI returned an invalid JSON format. Please try again.');
  }
}

/**
 * Standard chat completion using Gemini 1.5 Flash
 */
export async function chatCompletion(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key is required. Please refresh and enter your Gemini API key.');
  }

  const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){apiKey}`;

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

  if (options.jsonMode) {
    systemText += '\nCRITICAL: Respond ONLY with valid, raw JSON. Do not include extra conversational text.';
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Generate task content' }] });
  }

  const requestBody = { contents };
  if (systemText.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: systemText.trim() }]
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API Error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Audio Playback for Listening Section (Web Speech API)
 */
export function playListeningAudio(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.93;
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}

/**
 * Audio Recording / Transcription for Speaking Section (Web Speech API)
 */
export function startVoiceRecording(onInterimResult, onFinalResult) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Voice recognition requires Google Chrome, Microsoft Edge, or Safari.');
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
 * Image generation fallback for speaking tasks (Unsplash scenes)
 */
const SCENE_COLLECTION = [
  '[https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80)',
  '[https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80)',
  '[https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80)',
  '[https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80)'
];

export async function generateImage() {
  const randomIndex = Math.floor(Math.random() * SCENE_COLLECTION.length);
  return SCENE_COLLECTION[randomIndex];
}