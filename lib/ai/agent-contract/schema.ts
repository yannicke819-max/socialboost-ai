/**
 * Zod schemas for runtime contract validation.
 *
 * Used by tests and by callers that want to assert a contract instance
 * conforms to the envelope shape (e.g. before persisting to a future DB).
 */

import { z } from 'zod';

const ExecutionModeSchema = z.enum(['mock', 'real']);
const ProviderIdSchema = z.enum(['mock', 'anthropic']);
const TaskTypeSchema = z.enum(['offer_brain']);
const ConfidenceSchema = z.enum(['low', 'medium', 'high']);
const ValidationStatusSchema = z.enum(['pending', 'valid', 'invalid', 'failed']);

const CostEstimateSchema = z
  .object({
    provider: ProviderIdSchema,
    model: z.string().min(1),
    task_type: TaskTypeSchema,
    estimated_input_tokens: z.number().int().min(0),
    estimated_output_tokens: z.number().int().min(0),
    estimated_total_tokens: z.number().int().min(0),
    estimated_cost_credits: z.number().int().min(0),
    estimated_cost_eur: z.number().min(0).optional(),
    confidence: ConfidenceSchema,
    requires_confirmation: z.boolean(),
    premium_operation: z.boolean(),
    blocked_by_budget: z.boolean(),
    notes: z.array(z.string()),
  })
  .strict();

const GateAuditSchema = z
  .object({
    is_ci: z.boolean(),
    is_test_env: z.boolean(),
    router_allow_real: z.boolean(),
    agent_allow_real: z.boolean(),
    api_key_present: z.boolean(),
    eval_allow_real: z.boolean(),
    is_eval_context: z.boolean(),
  })
  .strict();

const TokenEstimateSchema = z
  .object({
    input: z.number().int().min(0),
    output: z.number().int().min(0),
  })
  .strict();

const ExecutionTraceSchema = z
  .object({
    trace_id: z.string().min(1),
    agent_id: z.string().min(1),
    task_type: TaskTypeSchema,
    provider: ProviderIdSchema,
    model: z.string().min(1),
    mode: ExecutionModeSchema,
    started_at: z.string().min(1),
    completed_at: z.string().optional(),
    latency_ms: z.number().int().min(0).optional(),
    input_hash: z.string().min(1),
    output_hash: z.string().optional(),
    input_field_count: z.number().int().min(0),
    input_size_bytes: z.number().int().min(0),
    language: z.string().optional(),
    token_estimate: TokenEstimateSchema.optional(),
    cost_estimate: CostEstimateSchema.optional(),
    validation_status: ValidationStatusSchema,
    error_code: z.string().optional(),
    warnings: z.array(z.string()),
  })
  .strict();

const AgentExecutionErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    recoverable: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const AgentModelRequestSchema = z
  .object({
    provider: ProviderIdSchema,
    model: z.string().min(1),
    estimated_input_tokens: z.number().int().min(0),
    estimated_output_tokens: z.number().int().min(0),
    estimated_total_tokens: z.number().int().min(0),
    estimated_cost_credits: z.number().int().min(0),
    gate_allowed: z.boolean(),
    blocked_reason: z.string().optional(),
    gate_audit: GateAuditSchema,
  })
  .strict();

export const AgentExecutionContractSchema = z
  .object({
    agent_id: z.string().min(1),
    agent_version: z.string().min(1),
    contract_version: z.string().min(1),
    input_schema_version: z.string().min(1),
    output_schema_version: z.string().min(1),
    task_type: TaskTypeSchema,

    // input/output are agent-specific. We validate envelope structure only,
    // not the inner payloads (those are validated by the agent's own schemas).
    input: z.unknown(),
    output: z.unknown().optional(),

    execution_mode: ExecutionModeSchema,
    model_request: AgentModelRequestSchema,
    cost_estimate: CostEstimateSchema,
    trace: ExecutionTraceSchema,

    warnings: z.array(z.string()),
    errors: z.array(AgentExecutionErrorSchema),

    started_at: z.string().min(1),
    completed_at: z.string().optional(),
  })
  .strict();
