/**
 * AI-005C — Static checks on the Supabase migration workflow YAML.
 *
 * These tests are pure file-scan: no GitHub API call, no run, no network.
 * They guard the invariants of `.github/workflows/supabase-ai-migration.yml`
 * to catch accidental drift (e.g. someone adds a `push:` trigger or removes
 * the `confirm_apply` gate).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKFLOW_PATH = resolve(
  process.cwd(),
  '.github/workflows/supabase-ai-migration.yml',
);
const YAML = readFileSync(WORKFLOW_PATH, 'utf8');

describe('workflow trigger surface', () => {
  it('declares workflow_dispatch as a trigger', () => {
    assert.match(YAML, /^on:\s*\n\s+workflow_dispatch:/m);
  });

  it('does NOT declare a push trigger', () => {
    // We accept "push" appearing inside a comment or string, but the YAML key
    // `push:` directly under `on:` is forbidden. Look for the block pattern.
    assert.equal(/^on:[^]*?\n\s+push:/m.test(YAML), false);
  });

  it('does NOT declare a pull_request trigger', () => {
    assert.equal(/^on:[^]*?\n\s+pull_request:/m.test(YAML), false);
  });

  it('does NOT declare a schedule trigger', () => {
    assert.equal(/^on:[^]*?\n\s+schedule:/m.test(YAML), false);
  });
});

describe('workflow inputs', () => {
  it('declares confirm_apply input', () => {
    assert.match(YAML, /confirm_apply:\s*\n\s+description:/);
  });

  it('declares target_environment input as a choice between staging and production', () => {
    assert.match(YAML, /target_environment:[^]*?type:\s*choice[^]*?-\s*staging[^]*?-\s*production/);
  });

  it('declares expected_migration input with the AI-004 default', () => {
    assert.match(
      YAML,
      /expected_migration:[^]*?default:\s*"20260504100000_ai_persistence_schema\.sql"/,
    );
  });
});

describe('apply gate', () => {
  it('apply job is gated by confirm_apply == true', () => {
    assert.match(YAML, /if:\s*inputs\.confirm_apply\s*==\s*'true'/);
  });

  it('apply job depends on dry_run', () => {
    assert.match(YAML, /apply:[^]*?needs:\s*dry_run/);
  });

  it('apply job also requires dry_run pending_only_expected = true', () => {
    assert.match(
      YAML,
      /needs\.dry_run\.outputs\.pending_only_expected\s*==\s*'true'/,
    );
  });

  it('validate job blocks confirm_apply=true on non-main refs', () => {
    assert.match(
      YAML,
      /confirm_apply\s*==\s*'true'\s*&&\s*github\.ref\s*!=\s*'refs\/heads\/main'/,
    );
  });
});

describe('secrets handling', () => {
  it('references all three required secrets via secrets.* expressions', () => {
    for (const name of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD']) {
      const re = new RegExp(`\\$\\{\\{\\s*secrets\\.${name}\\s*\\}\\}`);
      assert.match(YAML, re, `secrets.${name} reference missing`);
    }
  });

  it('does not embed any literal sk- / sbp- token in the YAML', () => {
    assert.equal(/sbp_[A-Za-z0-9_-]{16,}/.test(YAML), false);
    assert.equal(/sk-[A-Za-z0-9_-]{16,}/.test(YAML), false);
  });

  it('declares minimal permissions (contents: read only)', () => {
    assert.match(YAML, /permissions:\s*\n\s+contents:\s*read/);
  });
});

describe('safety guardrails', () => {
  it('does not invoke supabase migration repair', () => {
    assert.equal(/supabase\s+migration\s+repair/.test(YAML), false);
  });

  it('does not invoke supabase db reset', () => {
    assert.equal(/supabase\s+db\s+reset/.test(YAML), false);
  });

  it('does not run raw psql with credentials', () => {
    assert.equal(/psql\s+(?:postgres(?:ql)?:|"postgres)/i.test(YAML), false);
  });

  it('uses concurrency control per environment', () => {
    assert.match(YAML, /concurrency:\s*\n\s+group:\s*supabase-ai-migration-/);
  });

  it('apply job binds to a GitHub environment for reviewer gates', () => {
    assert.match(YAML, /apply:[^]*?environment:\s*\n\s+name:\s*\$\{\{\s*inputs\.target_environment\s*\}\}/);
  });
});

describe('post-apply verification', () => {
  it('runs a forbidden columns scan (must be empty)', () => {
    assert.match(
      YAML,
      /raw_input[^]*?raw_output[^]*?prompt[^]*?completion[^]*?api_key[^]*?request_body[^]*?response_body[^]*?stack_trace/,
    );
  });

  it('checks RLS state on AI tables', () => {
    assert.match(YAML, /rowsecurity[^]*?ai_%/);
  });

  it('checks supabase_migrations.schema_migrations history', () => {
    assert.match(YAML, /supabase_migrations\.schema_migrations/);
  });
});
