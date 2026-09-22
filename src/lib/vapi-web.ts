import "@tanstack/react-start/client-only";

import Vapi from "@vapi-ai/web";

export type NagiWebCallStatus =
  | "idle"
  | "connecting"
  | "active"
  | "ending"
  | "ended";

export type NagiWebCallEvent = {
  type: string;
  [key: string]: unknown;
};

export type NagiWebCallClientOptions = {
  publicKey: string;
  assistant: Record<string, unknown>;
  onStatus?: (status: NagiWebCallStatus) => void;
  onEvent?: (event: NagiWebCallEvent) => void;
  onError?: (error: unknown) => void;
};

export class NagiWebCallClient {
  private readonly vapi: Vapi;
  private readonly options: NagiWebCallClientOptions;
  private status: NagiWebCallStatus = "idle";

  constructor(options: NagiWebCallClientOptions) {
    this.options = options;
    this.vapi = new Vapi(options.publicKey);

    this.vapi.on("call-start", () => {
      this.setStatus("active");
      this.options.onEvent?.({ type: "call-start" });
    });

    this.vapi.on("call-end", () => {
      this.setStatus("ended");
      this.options.onEvent?.({ type: "call-end" });
    });

    this.vapi.on("message", (message: unknown) => {
      this.options.onEvent?.((message ?? {}) as NagiWebCallEvent);
    });

    this.vapi.on("error", (error: unknown) => {
      this.options.onError?.(error);
      this.options.onEvent?.({ type: "error", error });
    });
  }

  getStatus() {
    return this.status;
  }

  async start(): Promise<void> {
    if (this.status === "connecting" || this.status === "active") return;
    this.setStatus("connecting");

    try {
      await this.vapi.start(this.options.assistant);
    } catch (error) {
      this.setStatus("idle");
      this.options.onError?.(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.status !== "active" && this.status !== "connecting") return;
    this.setStatus("ending");

    try {
      await this.vapi.stop();
    } catch (error) {
      this.options.onError?.(error);
      throw error;
    }
  }

  private setStatus(status: NagiWebCallStatus) {
    this.status = status;
    this.options.onStatus?.(status);
  }
}

export function createNagiWebCallClient(options: NagiWebCallClientOptions) {
  return new NagiWebCallClient(options);
}
