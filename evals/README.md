# Evaluation Harness — fixtures and golden cases

This directory holds the **eval set** for the AI core. It ships at AI-000 with **fixtures** (canonical inputs) and **golden stubs** (per-agent expected outputs to be filled in as agents land in AI-001+).

## Structure

```
evals/
├── README.md            ← this file
├── fixtures/            ← canonical input cases, 15+, across 5 ICPs
│   ├── coach-business/
│   ├── consultant-strategy/
│   ├── ecommerce-fashion/
│   ├── infopreneur-formation/
│   └── saas-b2b/
└── golden/              ← per-agent golden cases (stubs at AI-000)
    ├── README.md
    ├── offer-brain/
    ├── market-radar/
    ├── channel-strategist/
    ├── creative-director/
    ├── asset-planner/
    └── critic-qa/
```

## Fixture format

Each fixture is a JSON file conforming to a single schema. The schema lives alongside as `_schema.json`. Fields :

```json
{
  "id": "coach-business-launch-cohorte-1",
  "icp": "coach-business",
  "input": {
    "offer": {
      "name": "...",
      "type": "coaching|course|product|service|audit|webinar|newsletter",
      "promise": "...",
      "audience": "...",
      "price": { "amount": 0, "currency": "EUR" },
      "proof_points": ["..."],
      "objections": ["..."],
      "cta_url": "https://...",
      "funnel_stage": "awareness|consideration|decision",
      "seasonality": "evergreen|launch|limited-time"
    },
    "goal": {
      "type": "sales|leads|authority|audience",
      "linked_url": "https://...",
      "notes": "..."
    },
    "brief": "...",
    "language": "fr|en|es|it|de"
  },
  "tags": ["..."],
  "notes": "what this fixture stresses (optional)"
}
```

## Golden case format

Each golden case pairs a fixture (or a fixture-like input subset) with expected agent outputs and minimum thresholds.

At AI-000, golden cases are **empty stubs**. They get filled when each agent lands :

- AI-001 → `offer-brain/` golden cases filled
- AI-008 → `market-radar/`, `channel-strategist/`, `creative-director/`, `asset-planner/` filled
- AI-009 → `critic-qa/` filled

## Usage (when CI is wired in AI-002)

```bash
pnpm evals:run --agent offer-brain
pnpm evals:run --all
pnpm evals:diff-vs-main
```

CI is **non-blocking** initially (warning only). Becomes **blocking** once the eval set is stable (post-AI-002, threshold tuned over a few real runs).

## Anti-patterns

- ❌ Adding a fixture without specifying the ICP and tags.
- ❌ Adding a golden case before the corresponding agent is implemented.
- ❌ Modifying a fixture without bumping `id` (changes the meaning of the eval baseline).
- ❌ Using real customer data in fixtures (privacy + would leak).
