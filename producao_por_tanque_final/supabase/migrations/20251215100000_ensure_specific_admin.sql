DO $$
BEGIN
    -- Ensure the specific user has admin role if they exist in auth.users
    -- This guarantees that the user 442b4361-84e5-4eaa-9f1e-e27606fdd96e has admin access as per requirements.
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '442b4361-84e5-4eaa-9f1e-e27606fdd96e') THEN
        INSERT INTO public.user_profiles (id, role)
        VALUES ('442b4361-84e5-4eaa-9f1e-e27606fdd96e', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
    END IF;
END $$;
