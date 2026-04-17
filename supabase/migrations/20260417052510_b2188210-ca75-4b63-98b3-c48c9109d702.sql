-- Audit log for cross-system chatbot tool calls
CREATE TABLE public.chatbot_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  tool_name text NOT NULL,
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_audit_log_created_at ON public.chatbot_audit_log(created_at DESC);
CREATE INDEX idx_chatbot_audit_log_tool_name ON public.chatbot_audit_log(tool_name);
CREATE INDEX idx_chatbot_audit_log_user_id ON public.chatbot_audit_log(user_id);

ALTER TABLE public.chatbot_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
ON public.chatbot_audit_log
FOR SELECT
USING (is_super_admin() OR has_permission('read_settings'));

CREATE POLICY "Admins can delete audit log"
ON public.chatbot_audit_log
FOR DELETE
USING (is_super_admin());

CREATE POLICY "System can insert audit log"
ON public.chatbot_audit_log
FOR INSERT
WITH CHECK (true);

-- Seed e-Life bridge config keys (idempotent)
INSERT INTO public.chatbot_config (key, value) VALUES
  ('elife_enabled', 'false'),
  ('elife_write_enabled', 'false'),
  ('elife_allowed_tables', ''),
  ('elife_twilio_passthrough', 'false')
ON CONFLICT (key) DO NOTHING;