# AI persistence — strategy & retention (AI-004)

## Statut

**Schéma préparé, NON activé en runtime.** AI-004 livre :

- 4 tables Postgres append-only
- Types TypeScript miroirs (`lib/ai/persistence/types.ts`)
- Mapper pur `AgentExecutionContract → AiPersistenceBundle`
- Garde structurelle anti-fuite (`assertNoSensitivePersistenceFields`)

Aucun client Supabase runtime n'est créé. Aucun INSERT n'est effectué. Aucun endpoint n'est modifié. L'ingester DB sera livré dans un sprint ultérieur.

## Tables

| Table | Rôle | Append-only |
|---|---|---|
| `ai_agent_runs` | Registre des exécutions agents (1 ligne par AgentContract). | Oui |
| `ai_cost_estimates` | Snapshot du `CostEstimate` calculé avant l'exécution. | Oui |
| `ai_eval_snapshots` | Résumé d'une eval run (compteurs + drift). | Oui |
| `ai_redaction_events` | Audit léger des redactions (type + champ, jamais la valeur). | Oui |

## Règles structurelles (non négociables)

1. **Aucune colonne brute.** Les colonnes suivantes sont **interdites** dans toutes les tables et tests-vérifiées par `lib/ai/persistence/__tests__/sql-migration.test.ts` :
   - `raw_input`, `raw_output`
   - `prompt`, `completion`
   - `api_key`
   - `request_body`, `response_body`
   - `stack_trace`

2. **Hashes uniquement.** L'identifiant du contenu utilisateur est le SHA-256 hex (champ `input_hash` / `output_hash`). Le contenu lui-même n'arrive jamais en base.

3. **`metadata jsonb` = agrégats uniquement.** Sur `ai_eval_snapshots`, `metadata` ne contient que des distributions, compteurs, catégories. Jamais de goldens, jamais de réponse de modèle, jamais de prompt.

4. **Append-only.** Aucun `UPDATE` n'est prévu. Une correction = un nouveau run avec un nouveau `trace_id`. Les FK enfants utilisent `ON DELETE RESTRICT` pour protéger l'intégrité audit.

5. **CHECK constraints stricts** sur les enums (`execution_mode in ('mock','real')`, `status in ('success','error','blocked')`, `confidence in ('low','medium','high')`).

## RLS — service_role only

- RLS activée sur les 4 tables.
- **Aucune** policy permissive (anon/authenticated). Sans policy, seul le rôle Postgres `BYPASSRLS` (Supabase `service_role`) peut lire/écrire.
- L'API publique ne touche pas à ces tables. L'ingester futur passera par une route serveur authentifiée avec `service_role` côté backend uniquement.
- Une migration ultérieure ajoutera des policies user-scoped étroites (ex. lecture des runs propres à l'utilisateur via une jointure sur un futur `user_id`) — hors scope AI-004.

## Stratégie de rétention

À ce stade (AI-004), aucune écriture n'a lieu. Lorsque l'ingester sera activé, la rétention proposée sera :

| Table | Rétention par défaut | Justification |
|---|---|---|
| `ai_agent_runs` | **180 jours** glissants | Audit, debugging, drift detection mid-terme. |
| `ai_cost_estimates` | **180 jours** glissants (synchro avec `ai_agent_runs`) | Analyse cost-per-run sur 6 mois. |
| `ai_eval_snapshots` | **365 jours** | Tendances eval longues, baseline tracking, ROI sur changements de modèle. |
| `ai_redaction_events` | **180 jours** glissants | Audit redaction. |

Implémentation rétention : job Postgres / cron `pg_cron` à activer **dans la même PR que l'ingester**, jamais avant. Aucune purge ne doit tourner sur une base vide.

## Sécurité — défense en profondeur

| Couche | Garantie |
|---|---|
| **Schéma SQL** | Pas de colonne pour stocker du contenu utilisateur. |
| **Types TS** (`AiAgentRunInsert` etc.) | Le compilateur refuse `raw_input`/`prompt`/`api_key`/etc. comme champs typés. |
| **Mapper pur** | Ne lit que les champs hashés de l'`ExecutionTrace` ; n'a accès au `contract.input`/`contract.output` qu'en lecture, ne les copie jamais en sortie. |
| **`assertNoSensitivePersistenceFields`** | Garde structurelle exécutée par tests et — lorsque l'ingester arrivera — par le caller juste avant `INSERT`. Vérifie : noms de champ interdits, valeurs `sk-*`, valeurs `Bearer *`, valeurs ressemblant à une stack trace. |
| **RLS sans policy** | Aucune lecture publique possible avant qu'une policy explicite ne soit ajoutée. |

## Ce qui n'est PAS dans AI-004

- ❌ Client Supabase runtime
- ❌ INSERT effectif
- ❌ Endpoint `/api/ai/persistence/*`
- ❌ Variable d'env `SUPABASE_*` ajoutée
- ❌ Modification du comportement de `runOfferBrain` ou de `route.ts`
- ❌ Cron / job de rétention
- ❌ Policies RLS user-scoped
- ❌ Lien vers `auth.users`

Tous ces points feront l'objet de PR dédiées et passeront par un review explicite.
