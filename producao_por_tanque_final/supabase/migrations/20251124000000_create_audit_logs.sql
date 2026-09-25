CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    operation_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs related to their projects (via entity ownership)
-- For simplicity in this scope, we allow users to view logs they created or related to their projects.
-- Since we don't have a direct link from audit_logs to projects easily without joins, 
-- and the requirement implies the user who made the change logs it.
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
