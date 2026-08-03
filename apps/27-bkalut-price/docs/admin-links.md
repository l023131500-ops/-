# Bkalut — Internal Admin Links (NOT FOR PUBLIC)

This document lists every internal admin/management route in the Bkalut app.
**These routes are intentionally NOT linked from the public website.** The
public landing page, eligibility catalog, topic pages and reminder flow do
not advertise them. Admins reach them by typing the URL directly (or via
shortcuts kept in this repository).

The application uses a hash-router, so internal routes are reached as
`https://<host>/#/<route>`. All routes below are gated by `AdminAuthProvider`
in `client/src/App.tsx` and reject unauthenticated requests at the server.

## Entry point

| Purpose | Hash route |
| --- | --- |
| Admin login | `/#/login` |
| Admin dashboard (after login) | `/#/admin` |

The admin password is configured via `BKALUT_ADMIN_PASSWORD` (or hash form
`BKALUT_ADMIN_PASSWORD_SHA256`) in the environment. See `.env.example`.

## Internal management routes

| Area | Hash route | Notes |
| --- | --- | --- |
| Dashboard / KPIs | `/#/admin` | Counts for rights/orgs/categories/sensitive |
| Rights database | `/#/rights` | Full internal table (admin-only) |
| Single right detail | `/#/rights/:id` | Includes scripts, eligibility JSON, gold tip |
| Organizations | `/#/orgs` | List + edit (incl. internal notes) |
| Single org detail | `/#/orgs/:id` | Internal notes visible only here |
| Quick-match assistant | `/#/match` | Rule-based search across rights |
| Advanced profile matcher | `/#/advanced-match` | Ranked candidates from free text |
| General inquiry reply | `/#/general-inquiry` | Editable email template |
| Integrations index | `/#/integrations` | Connector overview |
| Automations | `/#/automations` | Endpoints + secrets (admin only) |
| Webhook log | `/#/webhook-log` | NEDARIM3873 delivery audit |
| Service submissions | `/#/submissions` | All public submissions |
| Application users (incl. coaches) | `/#/users` | Create/edit/delete login users |
| Delivery queue | `/#/delivery` | Outbound message queue |
| Financial management (active) | `/#/financial` | Admin shell — clients, budgets, coaches |
| Premium upgrade requests | `/#/premium-requests` | User → premium plan approval |
| Database status | `/#/db-status` | Supabase / SQLite probe + warnings |
| Reminder responses | `/#/reminders` | From public `/#/r/:id` flow |
| Admin docs | `/#/admin-docs` | Bundled deliverables / PRDs |
| Terms (public legal copy) | `/#/terms` | Public — reachable from both surfaces |

## User-facing (financial client) routes

These are *not* admin pages but they are gated by `UserAuthProvider`, so they
are not part of the public marketing site either.

| Purpose | Hash route |
| --- | --- |
| Financial-client login | `/#/user-login` |
| Financial-client self-service | `/#/me` |

## Public routes (DO link from marketing)

For completeness, only the following routes are intended to appear on the
public site:

- `/` — marketing home
- `/#/eligibility` — public rights catalog
- `/#/p/topic/:id` — public topic view (basic info only)
- `/#/p/financial` — financial-management lead form
- `/#/service/:id` — per-topic eligibility check flow
- `/#/r/:id` — reminder response flow
- `/#/terms` — terms / privacy

## Webhook endpoint

The unified webhook bus dispatches to:

```
https://n8n.l023131500.work/webhook/NEDARIM3873
```

This URL is the default in `server/routes.ts` and is also seeded into
`automation_configs` for keys `webhook_rights_lead`, `webhook_financial_lead`,
`webhook_credentials_delivery` and `webhook_premium_decision`. It can be
overridden per-key from `/#/automations` without code changes.

## Seeded demo accounts (DELETE in production)

`server/storage.ts` seeds demo coaches and demo financial clients **only
when the `app_users` table is empty**, so production data is never touched.
The demo accounts are marked in `notes` and can be safely deleted from
`/#/users` once real coaches/clients are loaded.

| Role | Username | Password |
| --- | --- | --- |
| coach | `coach.haim` | `Bkalut!Coach1` |
| coach | `coach.dvora` | `Bkalut!Coach2` |
| user (basic) | `demo.family` | `Bkalut!Demo1` |
| user (premium) | `demo.business` | `Bkalut!Demo2` |

These can be edited from the admin Users page (`/#/users`) — username,
email, phone, password, role, status, plan and product access are all
controllable per user.
