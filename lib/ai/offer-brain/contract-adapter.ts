/**
 * Offer Brain — AgentExecutionContract adapter.
 *
 * Thin wrapper around `runOfferBrain` that produces an AgentExecutionContract
 * envelope. Behavior of the underlying agent is UNCHANGED — this adapter only
 * adds metadata (routing decision, cost estimate, redacted trace).
 *
 * Used by:
 *   - Eval harness (optional path through the contract — does not change
 *     existing eval behavior).
 *   - Future routes / orchestrators that want the contract envelope.
 *
 * NOT used by:
 *   - app/api/ai/offer-brain/route.ts — still calls runOfferBrain directly,
 *     keeping the 404-by-default behavior and zero runtime change in prod.
 */

import {
  AGENT_CONTRACT_VERSION,
  type AgentExecutionContract,
  type AgentExecutionError,
  type AgentModelRequest,
} from '../agent-contract/types';
import { route as routeModel } from '../model-router/router';
import type { RouteContext } from '../model-router/types';
import { startTrace, completeTrace } from '../tracing/tracer';
import {
  OfferBrainInputSchema,
  type OfferBrainInput,
  type OfferBrief,
  SCHEMA_VERSION,
} from './schema';
import { runOfferBrain } from './agent';
import { isOfferBrainAgentError } from './errors';
import type { ZodError } from 'zod';

const AGENT_ID = 'offer-brain';

/**
 * Redact a ZodError into a structural-only summary.
 *
 * Outputs only counts, schema field names (which come from the schema, not from
 * input), and Zod issue codes (a closed enum like 'invalid_type', 'too_small').
 * Never includes:
 *   - issue.message (could be customized to embed input values via .refine)
 *   - issue.path beyond top-level field name
 *   - any input value
 */
function redactZodIssues(err: ZodError): {
  field_count: number;
  form_error_count: number;
  field_error_counts: Record<string, number>;
  issue_codes: string[];
} {
  const flat = err.flatten();
  const field_error_counts: Record<string, number> = {};
  for (const [field, msgs] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(msgs)) field_error_counts[field] = msgs.length;
  }
  const codes = new Set<string>();
  for (const issue of err.issues) {
    if (typeof issue.code === 'string') codes.add(issue.code);
  }
  return {
    field_count: Object.keys(field_error_counts).length,
    form_error_count: flat.formErrors.length,
    field_error_counts,
    issue_codes: Array.from(codes).sort(),
  };
}

export interface RunViaContractOptions {
  /** Eval context flag — if true, eval gating applies (EVAL_USE_REAL_MODEL). */
  is_eval?: boolean;
  /** Caller insists on real-mode execution. If gates fail, contract reports allowed=false. */
  prefer_real?: boolean;
}

export async function runOfferBrainViaContract(
  rawInput: unknown,
  opts: RunViaContractOptions = {},
): Promise<AgentExecutionContract<OfferBrainInput, OfferBrief>> {
  const started_at = new Date().toISOString();

  // 1. Validate input shape (envelope-level — internal Zod is run again by runOfferBrain)
  const parse = OfferBrainInputSchema.safeParse(rawInput);

  // 2. Compute routing + cost estimate
  const routeCtx: RouteContext = {
    task_type: 'offer_brain',
    is_eval: opts.is_eval,
    prefer_real: opts.prefer_real,
    raw_input: parse.success ? parse.data : rawInput,
  };
  const routing = routeModel(routeCtx);

  const modelRequest: AgentModelRequest = {
    provider: routing.selected_provider,
    model: routing.selected_model,
    estimated_input_tokens: routing.estimated_cost.estimated_input_tokens,
    estimated_output_tokens: routing.estimated_cost.estimated_output_tokens,
    estimated_total_tokens: routing.estimated_cost.estimated_total_tokens,
    estimated_cost_credits: routing.estimated_cost.estimated_cost_credits,
    gate_allowed: routing.allowed,
    blocked_reason: routing.blocked_reason,
    gate_audit: routing.gate_audit,
  };

  // 3. Build initial trace
  const language =
    parse.success && parse.data.locale ? parse.data.locale : undefined;
  let trace = startTrace({
    agent_id: AGENT_ID,
    task_type: 'offer_brain',
    provider: routing.selected_provider,
    model: routing.selected_model,
    mode: routing.execution_mode,
    raw_input: rawInput,
    language,
    token_estimate: {
      input: routing.estimated_cost.estimated_input_tokens,
      output: routing.estimated_cost.estimated_output_tokens,
    },
    cost_estimate: routing.estimated_cost,
  });

  const errors: AgentExecutionError[] = [];
  const warnings: string[] = [];

  // 4. Input validation failure → return contract with error and no execution
  if (!parse.success) {
    errors.push({
      code: 'invalid_input',
      message: 'Input validation failed against OfferBrainInputSchema.',
      recoverable: false,
      details: redactZodIssues(parse.error),
    });
    trace = completeTrace(trace, {
      validation_status: 'invalid',
      error_code: 'invalid_input',
    });
    return {
      agent_id: AGENT_ID,
      agent_version: SCHEMA_VERSION,
      contract_version: AGENT_CONTRACT_VERSION,
      input_schema_version: SCHEMA_VERSION,
      output_schema_version: SCHEMA_VERSION,
      task_type: 'offer_brain',
      input: rawInput as OfferBrainInput,
      execution_mode: routing.execution_mode,
      model_request: modelRequest,
      cost_estimate: routing.estimated_cost,
      trace,
      warnings,
      errors,
      started_at,
      completed_at: trace.completed_at,
    };
  }

  // 5. If real was preferred but blocked, surface a structured warning + force mock
  const forceMock = routing.execution_mode === 'mock';
  if (opts.prefer_real && !routing.allowed) {
    warnings.push(
      `prefer_real_blocked:${routing.blocked_reason ?? 'unknown'} — falling back to mock`,
    );
  }

  // 6. Execute the agent through its existing entry point — NO behavior change.
  try {
    const result = await runOfferBrain(parse.data, { forceMock });
    trace = completeTrace(trace, {
      output: result.output,
      validation_status: 'valid',
      token_estimate: {
        input: result.metadata.tokens_in ?? routing.estimated_cost.estimated_input_tokens,
        output: result.metadata.tokens_out ?? routing.estimated_cost.estimated_output_tokens,
      },
      cost_estimate: routing.estimated_cost,
    });

    return {
      agent_id: AGENT_ID,
      agent_version: SCHEMA_VERSION,
      contract_version: AGENT_CONTRACT_VERSION,
      input_schema_version: SCHEMA_VERSION,
      output_schema_version: SCHEMA_VERSION,
      task_type: 'offer_brain',
      input: parse.data,
      output: result.output,
      execution_mode: result.metadata.source === 'anthropic' ? 'real' : 'mock',
      model_request: {
        ...modelRequest,
        provider: result.metadata.source,
        model: result.metadata.model ?? modelRequest.model,
      },
      cost_estimate: routing.estimated_cost,
      trace,
      warnings,
      errors,
      started_at,
      completed_at: trace.completed_at,
    };
  } catch (err) {
    const errCode = isOfferBrainAgentError(err) ? err.code : 'model_error';
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    errors.push({
      code: errCode,
      message: errMessage,
      recoverable: isOfferBrainAgentError(err) ? err.recoverable : false,
    });
    trace = completeTrace(trace, {
      validation_status: 'failed',
      error_code: errCode,
    });
    return {
      agent_id: AGENT_ID,
      agent_version: SCHEMA_VERSION,
      contract_version: AGENT_CONTRACT_VERSION,
      input_schema_version: SCHEMA_VERSION,
      output_schema_version: SCHEMA_VERSION,
      task_type: 'offer_brain',
      input: parse.data,
      execution_mode: routing.execution_mode,
      model_request: modelRequest,
      cost_estimate: routing.estimated_cost,
      trace,
      warnings,
      errors,
      started_at,
      completed_at: trace.completed_at,
    };
  }
}
