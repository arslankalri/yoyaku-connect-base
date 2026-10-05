import { describe, expect, it } from "bun:test";

import {
  WEB_CALL_TURN_TAKING,
  WEB_VOICE_INSTRUCTIONS,
  webVoicePrompt,
} from "../src/lib/vapi-web-conversation";

describe("Vapi web conversation tuning", () => {
  it("adds voice-only delivery rules without replacing the NAGI prompt", () => {
    const prompt = webVoicePrompt("NAGI BUSINESS RULES");
    expect(prompt).toContain("NAGI BUSINESS RULES");
    expect(prompt).toContain(WEB_VOICE_INSTRUCTIONS.trim());
    expect(prompt).toContain("Match the caller's latest language immediately");
  });

  it("uses responsive endpointing and interruption settings", () => {
    expect(WEB_CALL_TURN_TAKING.startSpeakingPlan.waitSeconds).toBeLessThan(0.4);
    expect(WEB_CALL_TURN_TAKING.startSpeakingPlan.smartEndpointingPlan.provider).toBe("vapi");
    expect(WEB_CALL_TURN_TAKING.stopSpeakingPlan.acknowledgementPhrases).toContain("はい");
    expect(WEB_CALL_TURN_TAKING.stopSpeakingPlan.interruptionPhrases).toContain("訂正");
    expect(
      WEB_CALL_TURN_TAKING.backgroundSpeechDenoisingPlan.smartDenoisingPlan.enabled,
    ).toBe(true);
  });
});