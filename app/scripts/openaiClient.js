/**
 * Session-based Gemini & Browser-Native Client
 * Contains all exports required across main.js and all test sections.
 */

// 1. Session Key & Model Management
let currentModel = 'gemini-1.5-flash';

export function getModel() {
  return currentModel;
}

export function setModel(modelName) {
  if (modelName) currentModel = modelName;
}

export function getApiKey() {
  let key = sessionStorage.getItem('gemini_session_key');
  if (!key) {
    key = window.prompt("Enter your Google Gemini API Key for this practice session:\n(Never saved to code or git)");
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

export function removeApiKey() {
  sessionStorage.removeItem('gemini_session_key');
}

export function clearApiKey() {
  removeApiKey();
}

export function hasApiKey() {
  const key = sessionStorage.getItem('gemini_session_key');
  return Boolean(key && key.trim().length > 0);
}

// Utility to clean markdown fences from LLM JSON responses
function cleanJSON(rawText) {
  let text = rawText.trim();
  if (text.startsWith('```json')) {
    text = text.slice(7);
  } else if (text.startsWith('```')) {
    text = text.slice(3);
  }
  if (text.endsWith('```')) {
    text = text.slice(0, -3);
  }
  return text.trim();
}

// 2. Chat Completion returning JSON (used by writingSection & speakingSection)
export async function chatCompletionJSON(messages, options = {}) {
  const rawText = await chatCompletion(messages, { ...options, jsonMode: true });
  const cleaned = cleanJSON(rawText);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON:', cleaned);
    throw new Error('AI returned an unexpected format. Please retry.');
  }
}

// 3. Chat Completion (Gemini 1.5 Flash)
export async function chatCompletion(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please reload and enter your key.');
  }

  const model = currentModel || 'gemini-1.5-flash';
  const url = `[https://generativelanguage.googleapis.com/v1beta/models/$](https://generativelanguage.googleapis.com/v1beta/models/$){model}:generateContent?key=${apiKey}`;

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
    systemText += '\nRespond strictly with valid JSON only. Do not wrap in markdown fences or include conversational text.';
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Generate practice content' }] });
  }

  const body = { contents };
  if (systemText.trim()) {
    body.systemInstruction = {
      parts: [{ text: systemText.trim() }]
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API call failed (${res.status})`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// 4. Audio Transcription (speakingSection import)
export async function transcribeAudio(audioBlob) {
  return "Candidate speaking response recorded. Ready for rubric evaluation.";
}

// 5. Speech Generation (listeningSection imports)
export async function textToSpeech(text) {
  playListeningAudio(text);
  return "";
}

export async function generateSpeech(text) {
  return textToSpeech(text);
}

export function playListeningAudio(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.93;
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}

// 6. Voice Recording Helper
export function startVoiceRecording(onInterim, onDone) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Voice recording requires Google Chrome, Edge, or Safari.');
    return null;
  }

  const rec = new SpeechRec();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  rec.onresult = (evt) => {
    let transcript = '';
    for (let i = 0; i < evt.results.length; ++i) {
      transcript += evt.results[i][0].transcript;
    }
    if (onInterim) onInterim(transcript);
  };

  if (onDone) rec.onend = onDone;
  rec.start();
  return rec;
}

// 7. Image Generation (speakingSection import)
const SCENES = [
  '[https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=80)',
  '[https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80)',
  '[https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80)',
  '[https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80)'
];

export async function generateImage() {
  return SCENES[Math.floor(Math.random() * SCENES.length)];
}
