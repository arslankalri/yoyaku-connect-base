# Smoother NAGI web calls

## Goal
Make browser test calls feel faster and more natural while preserving the linked Vapi assistant, NAGI tools, booking safeguards, and call history.

## Changes
- Tune Vapi turn detection so NAGI responds promptly after a completed thought without cutting off pauses or phone-number dictation.
- Tune interruption handling so callers can correct NAGI naturally while short acknowledgements do not stop playback.
- Strengthen the voice-only prompt: shorter spoken turns, no repeated details, one question at a time, immediate language mirroring, and no filler before tool results.
- Apply the same conversation tuning to both linked-assistant and transient-assistant web calls; retain the linked assistant's configured voice and multilingual behavior.
- Add focused tests for the generated web-call configuration and run the existing Vapi tests.

## Technical details
- Changes stay in the authenticated web-call configuration and shared voice prompt.
- No database, booking logic, inbound phone flow, Vapi assistant identity, or voice provider changes.
