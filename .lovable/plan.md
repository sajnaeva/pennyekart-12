

## Two-Way Bridge: Pennyekart Chatbot ↔ e-Life Society

### Architecture

```text
Pennyekart Chat (Penny bot)
        │
        ├─ Lovable AI Gateway (tool-calling enabled)
        │
        └─ chat edge function ── Pennyekart Supabase
                              └─ e-Life Society Supabase  ◄── shared service-role access
```

The chat edge function gains a second Supabase client pointed at e-Life's project. The AI agent uses **tool calls** to read/write across both systems on demand.

### Step 1 — Get e-Life credentials & schema

Add two new Supabase secrets (we'll prompt you):
- `ELIFE_SUPABASE_URL`
- `ELIFE_SUPABASE_SERVICE_ROLE_KEY`

You'll grab these from e-Life's Supabase dashboard → Project Settings → API.

We also need to know e-Life's table names. Best approach: once secrets are added, the edge function can introspect e-Life's schema and we register tools matching its real tables (programs, divisions, agents, registrations, payments, whatsapp_commands, etc.).

### Step 2 — Add admin UI for the bridge

Extend `ChatbotSettingsPage.tsx` with a 4th tab **"e-Life Bridge"**:
- Toggle: enable/disable cross-system access
- Read-mode vs Read+Write toggle (safety)
- Per-table allowlist (checkboxes for which e-Life tables the bot can touch)
- "Test connection" button — pings e-Life Supabase and lists available tables
- Twilio WhatsApp passthrough toggle (sends commands via e-Life's existing Twilio webhook)

Settings persist in `chatbot_config` (new keys: `elife_enabled`, `elife_write_enabled`, `elife_allowed_tables`, `elife_twilio_passthrough`).

### Step 3 — Upgrade the chat edge function with tools

Switch the AI call to use **function calling**. Register these tools dynamically based on admin settings:

| Tool | What it does |
|---|---|
| `elife_query_programs` | List/search self-employment programs & divisions |
| `elife_get_agent_hierarchy` | Look up agent tree by mobile/agent ID |
| `elife_check_payment_status` | Mobile-number lookup (mirrors the public form) |
| `elife_list_registrations` | Get a customer's registrations across divisions |
| `elife_create_registration` | Register a customer for a program (write — gated) |
| `elife_send_whatsapp_command` | Trigger a Twilio WhatsApp command via e-Life |
| `pennyekart_lookup_order` | (Existing data) order/wallet lookups for cross-context answers |

Each tool runs server-side with the right Supabase client. Results stream back into the conversation; the AI summarises in Malayalam/English per existing language config.

### Step 4 — Safety & audit

- All write operations require `elife_write_enabled = true` AND a per-tool confirmation phrase from the user (e.g. "yes, register me")
- New `chatbot_audit_log` table records every cross-system call (tool, user_id, args, result, timestamp)
- Rate limit: max 10 e-Life tool calls per user per minute (in-memory in edge function)

### Step 5 — Frontend

`ChatBot.tsx` only needs minor tweaks:
- Render tool-call status chips ("Checking your payment status…")
- Show the audit-log link in the admin settings tab

### Files to create/edit

| File | Action |
|---|---|
| Migration | Add `elife_*` keys to `chatbot_config`, create `chatbot_audit_log` table with RLS |
| `src/pages/admin/ChatbotSettingsPage.tsx` | Add "e-Life Bridge" tab |
| `supabase/functions/chat/index.ts` | Add e-Life Supabase client, tool registry, function-calling loop, audit logging |
| `supabase/functions/elife-introspect/index.ts` | New helper to list e-Life tables for the admin UI |
| `src/components/ChatBot.tsx` | Render tool-call status indicators |
| Secrets prompt | `ELIFE_SUPABASE_URL`, `ELIFE_SUPABASE_SERVICE_ROLE_KEY` |

### What you'll need to provide after approval

1. **e-Life Supabase URL** (looks like `https://xxx.supabase.co`)
2. **e-Life Supabase service-role key** (from Project Settings → API — keep secret)
3. Confirmation that you own/admin the e-Life project (service-role key bypasses all RLS)

### Out of scope (for now)
- Modifying e-Life's own UI or schema — we only read/write to its existing tables
- Two-way realtime sync of customer accounts (can be added later if needed)

