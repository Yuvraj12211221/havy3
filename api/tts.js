// HuggingFace TTS has been replaced by browser Web Speech Synthesis (free, multi-voice).
// This file is kept as a stub so the Vercel serverless route doesn't 404.
export default function handler(req, res) {
  return res.status(410).json({
    error: "HuggingFace TTS backend removed. All TTS is now handled client-side via Web Speech Synthesis API.",
  });
}