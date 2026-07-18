import type { GeneratedConcept, LogoBrief } from "@/types/logo";

export type GenerateRequest = {
  brief: LogoBrief;
  count: number;
  seed?: string;
};

export type RefineRequest = {
  brief: LogoBrief;
  concept: GeneratedConcept;
  instruction: string;
};

export type ProviderErrorCode =
  | "missing_credentials"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "invalid_request";

export class ProviderError extends Error {
  code: ProviderErrorCode;
  retryable: boolean;

  constructor(code: ProviderErrorCode, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export interface ImageProvider {
  readonly name: string;
  generateConcepts(request: GenerateRequest): Promise<GeneratedConcept[]>;
  refineConcept(request: RefineRequest): Promise<GeneratedConcept>;
}
