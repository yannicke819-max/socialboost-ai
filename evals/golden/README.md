# Golden cases — per-agent expected outputs

This directory holds **golden cases** : pairings of input (typically referencing a `evals/fixtures/` entry) with expected agent outputs and minimum quality thresholds.

## Status at AI-000

**Stubs only.** Each subdirectory has a placeholder describing the format and a `.gitkeep` so the directory persists in git. Real cases get added when each agent ships :

| Agent | Golden cases land in PR |
|---|---|
| `offer-brain/` | AI-001 (Offer Brain POC) |
| `market-radar/` | AI-008 (Pipeline core) |
| `channel-strategist/` | AI-008 |
| `creative-director/` | AI-008 |
| `asset-planner/` | AI-008 |
| `critic-qa/` | AI-009 (Critic QA) |

## Golden case format (proposed)

```json
{
  "id": "offer-brain-coach-business-launch-1",
  "fixture_id": "coach-business-launch-cohorte-linkedin-900",
  "agent": "offer-brain",
  "agent_min_version": "1.0.0",
  "expected_output": { /* full structured output the agent should produce */ },
  "min_overall_score": 85,
  "must_contain": ["..."],
  "must_not_contain": ["..."],
  "rationale": "Why this case matters — what behavior it stresses"
}
```

## Threshold semantics

- `min_overall_score` : when applicable (Critic-graded outputs), the case fails if score < threshold.
- `must_contain` / `must_not_contain` : substring or regex assertions (TBD at AI-002).
- Equivalence checks : structural (Zod schema), semantic (embedding cosine vs reference) — concrete tooling at AI-002.

## CI integration

When AI-002 lands, `pnpm evals:run` walks each agent folder, executes its golden cases against the running agent, and reports :

```
agent             cases  passed  failed  avg_score  drift_vs_main
offer-brain       8      8       0       91.2       +0.3
market-radar      —      —       —       —          (skipped: optional)
critic-qa         12     11      1       82.4       -1.8
...
```

Initial CI mode : non-blocking (warning). Becomes blocking once thresholds are tuned over a few real runs.

## Anti-patterns

- ❌ Adding a golden case before the agent it tests is implemented.
- ❌ Hardcoding LLM output verbatim as `expected_output` — use loose semantic checks (embedding similarity, must-contain regex, structural Zod) instead.
- ❌ Tying golden cases to a specific provider — they should pass regardless of the underlying ModelRouter resolution (within the configured tier).
- ❌ Including PII or real customer data.
