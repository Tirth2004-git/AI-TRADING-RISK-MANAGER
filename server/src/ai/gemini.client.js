import { GoogleGenAI, Type } from '@google/genai';
import env from '../config/env.js';

const AI_TIMEOUT_MS = 20000;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    weaknesses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    verdict: {
      type: Type.STRING,
      enum: ['ACCEPTABLE', 'NEEDS_CHANGES', 'TOO_RISKY'],
    },
  },
  required: ['summary', 'weaknesses', 'suggestions', 'verdict'],
};

function isRetryableError(err) {
  if (!err) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  const status = err.status || err.statusCode;
  if (status === 429 || (status >= 500 && status < 600)) return true;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('network') || msg.includes('econnreset');
}

async function callOnce({ ai, model, systemInstruction, prompt }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        abortSignal: controller.signal,
      },
    });
    return response.text;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateGeminiJson({
  model = env.geminiModel,
  systemInstruction,
  prompt,
}) {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

  try {
    return await callOnce({ ai, model, systemInstruction, prompt });
  } catch (err) {
    if (isRetryableError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return await callOnce({ ai, model, systemInstruction, prompt });
    }
    throw err;
  }
}
