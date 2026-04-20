
The "Add entry" button fails with "insert failed" when adding a second/multiple entry for the same date. This is happening in the external e-Life Society database, not our local DB.

**Root cause analysis:**
Looking at `supabase/functions/agent-work-logs/index.ts` POST handler, it inserts into the e-Life `agent_work_logs` table with `(agent_id, work_date, work_details)`. The first insert works, the second fails — this strongly suggests the e-Life table has a **unique constraint on `(agent_id, work_date)`**, allowing only one log per agent per day.

We cannot modify the external e-Life schema. So the fix must happen in the edge function: when an entry already exists for that `(agent_id, work_date)`, append the new text to the existing record instead of inserting a duplicate row.

**Plan:**

1. **Update edge function `agent-work-logs` POST handler** to:
   - First check if a log row already exists for `(agent_id, work_date)`.
   - If yes → PATCH the existing row, appending the new entry to `work_details` with a timestamp separator (e.g. `\n\n[14:32] new entry text`).
   - If no → INSERT new row as before.
   - Return the resulting row so the UI updates correctly.

2. **Update edge function logging** to surface the actual e-Life PostgREST error body in the response (it already does via `details`), and add a `console.error` for debugging.

3. **Verify in `TodaysWorkSection.tsx`** — no UI changes needed; it already re-renders when the returned log comes back. The "multiple entries per day" will now show as a single growing log entry with timestamped sub-entries (which matches how a daily work log naturally reads).

**Alternative considered:** Strict multi-row inserts would require schema changes on the external e-Life DB (drop unique constraint), which is outside our control. The append-strategy preserves all entries and works within the existing constraint.

**Files to change:**
- `supabase/functions/agent-work-logs/index.ts` — POST handler logic (upsert/append)

**No DB migration, no UI changes, no new secrets needed.**
