/**
 * AI-005A — Reinforced static validation of the Supabase migration.
 *
 * AI-004 already covers the structural invariants (forbidden columns absent,
 * RLS enabled, no policies, indexes, FK RESTRICT, CHECK constraints). This
 * file adds rehearsal-driven assertions:
 *   - migration filename convention (YYYYMMDDHHMMSS_*.sql)
 *   - pgcrypto extension declared (provides gen_random_uuid)
 *   - service-role-only comments present on all 4 tables
 *   - no auth.users reference (AI-004 stays decoupled from user identity)
 *   - no DROP / TRUNCATE / DELETE / UPDATE / GRANT to public/anon/authenticated
 *   - no SECURITY DEFINER (no privilege escalation surface)
 *   - all expected tables have a created_at default now()
 *
 * These checks are pure file-scan tests — no DB, no network.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations');
const AI004_FILE = '20260504100000_ai_persistence_schema.sql';
const AI004_PATH = resolve(MIGRATIONS_DIR, AI004_FILE);
const SQL = readFileSync(AI004_PATH, 'utf8');

/** Same SQL with `--` line comments stripped — for checks that target
 *  executable statements only (comments may legitimately mention names
 *  the executable code must not reference). */
const SQL_NO_COMMENTS = SQL.replace(/--[^\n]*/g, '');

const TABLES = [
  'ai_agent_runs',
  'ai_cost_estimates',
  'ai_eval_snapshots',
  'ai_redaction_events',
];

describe('AI-005A — migration file naming', () => {
  it('AI-004 migration is present in supabase/migrations/', () => {
    const files = readdirSync(MIGRATIONS_DIR);
    assert.ok(files.includes(AI004_FILE), `${AI004_FILE} missing from migrations dir`);
  });

  it('AI-004 filename follows YYYYMMDDHHMMSS_<slug>.sql convention', () => {
    assert.match(AI004_FILE, /^\d{14}_[a-z0-9_]+\.sql$/);
  });
});

describe('AI-005A — extensions and primitives', () => {
  it('declares pgcrypto extension (provides gen_random_uuid)', () => {
    assert.match(SQL, /create\s+extension\s+if\s+not\s+exists\s+"pgcrypto"/i);
  });

  it('every table uses gen_random_uuid() as default for primary key', () => {
    for (const table of TABLES) {
      const re = new RegExp(
        `create\\s+table\\s+public\\.${table}\\s*\\([^;]*?id\\s+uuid\\s+primary\\s+key\\s+default\\s+gen_random_uuid\\(\\)`,
        'is',
      );
      assert.match(SQL, re, `${table} should use gen_random_uuid() default`);
    }
  });

  it('every table has created_at timestamptz default now()', () => {
    for (const table of TABLES) {
      const re = new RegExp(
        `create\\s+table\\s+public\\.${table}\\s*\\([^;]*?created_at\\s+timestamptz\\s+not\\s+null\\s+default\\s+now\\(\\)`,
        'is',
      );
      assert.match(SQL, re, `${table} should have created_at default now()`);
    }
  });
});

describe('AI-005A — service-role-only comments', () => {
  for (const table of TABLES) {
    it(`${table} carries a "service_role only" comment`, () => {
      const re = new RegExp(
        `comment\\s+on\\s+table\\s+public\\.${table}\\s+is\\s*'[^']*service_role only`,
        'i',
      );
      assert.match(SQL, re, `${table} missing service_role only comment`);
    });
  }
});

describe('AI-005A — privilege & coupling guardrails', () => {
  it('does not reference auth.users in executable SQL (decoupled from user identity)', () => {
    assert.equal(/auth\.users/i.test(SQL_NO_COMMENTS), false);
  });

  it('does not GRANT privileges to anon, authenticated, or public', () => {
    for (const role of ['anon', 'authenticated', 'public']) {
      const re = new RegExp(`grant\\s+[^;]+\\s+to\\s+${role}\\b`, 'i');
      assert.equal(re.test(SQL_NO_COMMENTS), false, `unexpected GRANT to ${role}`);
    }
  });

  it('does not declare any SECURITY DEFINER function', () => {
    assert.equal(/security\s+definer/i.test(SQL_NO_COMMENTS), false);
  });

  it('does not DROP / TRUNCATE / DELETE / UPDATE existing rows in this migration', () => {
    // The migration should be purely additive — no destructive ops on data.
    assert.equal(/^\s*drop\s+(table|schema|database)\b/im.test(SQL), false);
    assert.equal(/^\s*truncate\b/im.test(SQL), false);
    assert.equal(/^\s*delete\s+from\b/im.test(SQL), false);
    assert.equal(/^\s*update\s+\w+\s+set\b/im.test(SQL), false);
  });
});

describe('AI-005A — RLS hard checks', () => {
  it('every AI-004 table has RLS enabled', () => {
    for (const table of TABLES) {
      const re = new RegExp(
        `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
        'i',
      );
      assert.match(SQL, re, `${table} missing RLS enable`);
    }
  });

  it('zero CREATE POLICY in this migration (service_role only)', () => {
    assert.equal(/create\s+policy/i.test(SQL), false);
  });
});
