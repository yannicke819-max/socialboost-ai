/**
 * Structured errors for Offer Brain.
 * Used as discriminated union — never throw raw Errors at the agent boundary.
 */

export type OfferBrainErrorCode =
  | 'invalid_input'
  | 'output_validation'
  | 'model_error'
  | 'budget_exceeded'
  | 'aborted'
  | 'rate_limit'
  | 'content_policy'
  | 'mock_failure'
  | 'misconfigured';

export interface OfferBrainError {
  code: OfferBrainErrorCode;
  message: string;
  recoverable: boolean;
  details?: unknown;
}

export class OfferBrainAgentError extends Error {
  readonly code: OfferBrainErrorCode;
  readonly recoverable: boolean;
  readonly details?: unknown;

  constructor(payload: OfferBrainError) {
    super(payload.message);
    this.name = 'OfferBrainAgentError';
    this.code = payload.code;
    this.recoverable = payload.recoverable;
    this.details = payload.details;
  }

  toJSON(): OfferBrainError {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      details: this.details,
    };
  }
}

export function isOfferBrainAgentError(value: unknown): value is OfferBrainAgentError {
  return value instanceof OfferBrainAgentError;
}
