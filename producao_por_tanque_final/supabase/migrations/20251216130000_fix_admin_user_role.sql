DO $$
BEGIN
    -- Force update the author user to admin role to resolve visibility issues
    -- User ID: 851108bc-9e32-4687-9a91-a319d4a434be
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '851108bc-9e32-4687-9a91-a319d4a434be') THEN
        INSERT INTO public.user_profiles (id, role)
        VALUES ('851108bc-9e32-4687-9a91-a319d4a434be', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();
    END IF;

    -- Also ensure the other known user is admin just in case
    -- User ID: 442b4361-84e5-4eaa-9f1e-e27606fdd96e
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '442b4361-84e5-4eaa-9f1e-e27606fdd96e') THEN
        INSERT INTO public.user_profiles (id, role)
        VALUES ('442b4361-84e5-4eaa-9f1e-e27606fdd96e', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();
    END IF;
END $$;
