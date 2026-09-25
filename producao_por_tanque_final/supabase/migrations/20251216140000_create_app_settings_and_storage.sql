-- Create app_settings table to store global application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Authenticated users can view app_settings" ON public.app_settings
    FOR SELECT TO authenticated USING (true);

-- Allow admins to insert/update/delete app_settings
CREATE POLICY "Admins can manage app_settings" ON public.app_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
        )
    );

-- Create storage bucket for application assets (e.g. logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for app-assets bucket
-- Public read access
CREATE POLICY "Public Read Access app-assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'app-assets');

-- Admin upload access
CREATE POLICY "Admins Upload Access app-assets" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'app-assets' AND
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
        )
    );

-- Admin update access
CREATE POLICY "Admins Update Access app-assets" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'app-assets' AND
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
        )
    );

-- Admin delete access
CREATE POLICY "Admins Delete Access app-assets" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'app-assets' AND
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
        )
    );
