ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS email_notification_preferences JSONB NOT NULL DEFAULT '{"project_updates": true}'::jsonb;
