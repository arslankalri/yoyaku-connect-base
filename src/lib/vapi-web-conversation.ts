export const WEB_VOICE_INSTRUCTIONS = `

LIVE VOICE DELIVERY
- STAFF HELP: Before you ever say a staff member will help, you MUST call the transfer_to_human tool with the caller's name (if given), what they need, and why you could not do it yourself. Only after the tool returns, tell the caller staff has been notified.
- Speak in short, natural turns: usually one or two sentences, then listen.
- Respond as soon as the caller finishes a complete thought. Do not add filler before answering or before using a tool.
- If the caller interrupts or corrects you, stop speaking, acknowledge the correction briefly, and continue with the corrected detail.
- Treat short acknowledgements such as "はい", "うん", "そうです", "okay", and "yes" as listening cues unless they answer your question.
- Match the caller's latest language immediately. Use natural Japanese for Japanese and natural English for English; never carry Japanese pronunciation guidance into English.
- Ask only one missing detail at a time. Never repeat information the caller has already provided.
- Read phone numbers, dates, times, names, and prices clearly at a calm pace. Confirm a phone number only after the caller finishes giving all digits.
- When a tool is needed, wait quietly for its verified result. Do not narrate internal work or claim success early.`;

export const WEB_CALL_TURN_TAKING = {
  startSpeakingPlan: {
    waitSeconds: 0.25,
    smartEndpointingPlan: { provider: "vapi" },
  },
  stopSpeakingPlan: {
    numWords: 0,
    voiceSeconds: 0.18,
    backoffSeconds: 0.45,
    acknowledgementPhrases: [
      "はい",
      "うん",
      "ええ",
      "そうです",
      "わかりました",
      "okay",
      "ok",
      "yes",
      "yeah",
      "right",
      "mm-hmm",
    ],
    interruptionPhrases: [
      "待って",
      "違います",
      "訂正",
      "いいえ",
      "stop",
      "wait",
      "no",
      "actually",
    ],
  },
  backgroundSpeechDenoisingPlan: {
    smartDenoisingPlan: { enabled: true },
  },
} as const;

export function webVoicePrompt(basePrompt: string) {
  return `${basePrompt.trim()}${WEB_VOICE_INSTRUCTIONS}`;
}