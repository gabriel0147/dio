-- 1. Add avatar_url to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create avatars bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for avatars bucket

-- Allow public read access to all avatars
CREATE POLICY "Public Read Access avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
-- Path must be avatars/{user_id}/*
CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Update User Profiles RLS to allow reading basic info (like avatar_url) for everyone authenticated
-- We drop the specific "Users can view their own profile" policy and replace with a broader read policy
-- This allows users to see each other's avatars in teams/projects
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

CREATE POLICY "Authenticated users can view all profiles"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (true);

