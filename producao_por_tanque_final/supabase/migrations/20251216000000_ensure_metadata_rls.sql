-- Ensure RLS is enabled for metadata tables to prevent access issues
ALTER TABLE IF EXISTS public.production_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wells ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transfer_destination_categories ENABLE ROW LEVEL SECURITY;

-- Production Fields Policies
-- Allow all authenticated users to view production fields (shared metadata)
DROP POLICY IF EXISTS "Authenticated users can view production_fields" ON public.production_fields;
CREATE POLICY "Authenticated users can view production_fields"
    ON public.production_fields
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to manage production fields (simplified for this context)
DROP POLICY IF EXISTS "Authenticated users can insert production_fields" ON public.production_fields;
CREATE POLICY "Authenticated users can insert production_fields"
    ON public.production_fields
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update production_fields" ON public.production_fields;
CREATE POLICY "Authenticated users can update production_fields"
    ON public.production_fields
    FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete production_fields" ON public.production_fields;
CREATE POLICY "Authenticated users can delete production_fields"
    ON public.production_fields
    FOR DELETE
    TO authenticated
    USING (true);

-- Wells Policies
-- Allow all authenticated users to view wells (shared metadata)
DROP POLICY IF EXISTS "Authenticated users can view wells" ON public.wells;
CREATE POLICY "Authenticated users can view wells"
    ON public.wells
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert wells" ON public.wells;
CREATE POLICY "Authenticated users can insert wells"
    ON public.wells
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update wells" ON public.wells;
CREATE POLICY "Authenticated users can update wells"
    ON public.wells
    FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete wells" ON public.wells;
CREATE POLICY "Authenticated users can delete wells"
    ON public.wells
    FOR DELETE
    TO authenticated
    USING (true);

-- Transfer Destination Categories Policies
-- These are scoped by project_id, so we must check project access
DROP POLICY IF EXISTS "Users can view transfer categories of their projects" ON public.transfer_destination_categories;
CREATE POLICY "Users can view transfer categories of their projects"
    ON public.transfer_destination_categories
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = transfer_destination_categories.project_id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert transfer categories to their projects" ON public.transfer_destination_categories;
CREATE POLICY "Users can insert transfer categories to their projects"
    ON public.transfer_destination_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = transfer_destination_categories.project_id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update transfer categories of their projects" ON public.transfer_destination_categories;
CREATE POLICY "Users can update transfer categories of their projects"
    ON public.transfer_destination_categories
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = transfer_destination_categories.project_id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete transfer categories of their projects" ON public.transfer_destination_categories;
CREATE POLICY "Users can delete transfer categories of their projects"
    ON public.transfer_destination_categories
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = transfer_destination_categories.project_id
            AND user_id = auth.uid()
        )
    );
