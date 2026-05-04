import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20260504100000_ai_persistence_schema.sql',
);
const SQL = readFileSync(MIGRATION_PATH, 'utf8');

const TABLES = [
  'public.ai_agent_runs',
  'public.ai_cost_estimates',
  'public.ai_eval_snapshots',
  'public.ai_redaction_events',
];

const FORBIDDEN_COLUMNS = [
  'raw_input',
  'raw_output',
  'prompt',
  'completion',
  'api_key',
  'request_body',
  'response_body',
  'stack_trace',
];

describe('AI-004 migration — forbidden columns absent', () => {
  for (const col of FORBIDDEN_COLUMNS) {
    it(`does not declare a column named "${col}"`, () => {
      // Match "<col> <type>" or "<col>:" — i.e., any column declaration
      // We're conservative: any whole-word occurrence inside the SQL,
      // in lower-case, fails the test (comments aside). Comments may
      // mention the names defensively, so we require column-position match.
      const re = new RegExp(`^\\s*${col}\\s+\\w`, 'mi');
      assert.equal(
        re.test(SQL),
        false,
        `forbidden column "${col}" appears as a column declaration`,
      );
    });
  }
});

describe('AI-004 migration — required tables exist', () => {
  for (const table of TABLES) {
    it(`creates table ${table}`, () => {
      const re = new RegExp(`create\\s+table\\s+${table.replace('.', '\\.')}\\b`, 'i');
      assert.equal(re.test(SQL), true, `missing CREATE TABLE for ${table}`);
    });
  }
});

describe('AI-004 migration — RLS enabled on all 4 tables', () => {
  for (const table of TABLES) {
    it(`enables RLS on ${table}`, () => {
      const re = new RegExp(
        `alter\\s+table\\s+${table.replace('.', '\\.')}\\s+enable\\s+row\\s+level\\s+security`,
        'i',
      );
      assert.equal(re.test(SQL), true, `missing RLS enable for ${table}`);
    });
  }

  it('does NOT create permissive ALL/SELECT policies for anon/authenticated', () => {
    // Defensive: we require zero CREATE POLICY in this migration.
    assert.equal(
      /create\s+policy/i.test(SQL),
      false,
      'AI-004 must not declare any policy — service_role only',
    );
  });
});

describe('AI-004 migration — primary indexes exist', () => {
  const REQUIRED_INDEXES = [
    'ai_agent_runs_trace_id_idx',
    'ai_agent_runs_agent_created_idx',
    'ai_agent_runs_task_created_idx',
    'ai_agent_runs_status_created_idx',
    'ai_agent_runs_provider_model_created_idx',
    'ai_cost_estimates_run_idx',
    'ai_eval_snapshots_suite_created_idx',
    'ai_eval_snapshots_git_sha_idx',
    'ai_redaction_events_run_idx',
    'ai_redaction_events_trace_idx',
  ];

  for (const idx of REQUIRED_INDEXES) {
    it(`creates index ${idx}`, () => {
      const re = new RegExp(`create\\s+index\\s+${idx}\\b`, 'i');
      assert.equal(re.test(SQL), true, `missing CREATE INDEX ${idx}`);
    });
  }
});

describe('AI-004 migration — append-only enforcement signals', () => {
  it('uses ON DELETE RESTRICT for child FKs (audit integrity)', () => {
    assert.equal(/on\s+delete\s+restrict/i.test(SQL), true);
  });

  it('uses CHECK constraint on status enum values', () => {
    assert.equal(
      /status\s+text\s+not\s+null\s+check\s*\(\s*status\s+in\s*\(\s*'success'\s*,\s*'error'\s*,\s*'blocked'\s*\)\s*\)/i.test(
        SQL,
      ),
      true,
    );
  });

  it('uses CHECK constraint on execution_mode enum values', () => {
    assert.equal(
      /execution_mode\s+text\s+not\s+null\s+check\s*\(\s*execution_mode\s+in\s*\(\s*'mock'\s*,\s*'real'\s*\)\s*\)/i.test(
        SQL,
      ),
      true,
    );
  });
});
