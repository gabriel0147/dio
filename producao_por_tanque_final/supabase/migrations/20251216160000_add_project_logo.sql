ALTER TABLE public.projects ADD COLUMN logo_url TEXT NULL;

-- Create storage bucket for project logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for project-logos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'project-logos' );

CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'project-logos' );

CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'project-logos' );

CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'project-logos' );
