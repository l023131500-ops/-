import OpenAI from "openai";

let _client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return _client;
}

// קבועים לתמלול
export const WHISPER_MODEL = "whisper-1";
export const EDITOR_MODEL = "gpt-4o";
export const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

