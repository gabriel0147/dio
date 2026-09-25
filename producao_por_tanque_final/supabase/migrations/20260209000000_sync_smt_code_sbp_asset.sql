-- Function to sync SMT equipment code with SBP asset number on SMT insert/update
CREATE OR REPLACE FUNCTION public.sync_smt_equipment_code()
RETURNS TRIGGER AS $$
DECLARE
    v_asset_number TEXT;
BEGIN
    -- If linked to an SBP asset, force code to match asset number
    IF NEW.sbp_asset_id IS NOT NULL THEN
        SELECT asset_number INTO v_asset_number
        FROM public.sbp_assets
        WHERE id = NEW.sbp_asset_id;

        IF v_asset_number IS NOT NULL THEN
            NEW.code := v_asset_number;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for SMT Equipment
DROP TRIGGER IF EXISTS tr_sync_smt_equipment_code ON public.smt_equipment;
CREATE TRIGGER tr_sync_smt_equipment_code
    BEFORE INSERT OR UPDATE ON public.smt_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_smt_equipment_code();

-- Function to propagate SBP asset number changes to SMT equipment
CREATE OR REPLACE FUNCTION public.propagate_sbp_asset_number_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If asset number changes, update all linked equipment
    IF OLD.asset_number <> NEW.asset_number THEN
        UPDATE public.smt_equipment
        SET code = NEW.asset_number
        WHERE sbp_asset_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for SBP Assets
DROP TRIGGER IF EXISTS tr_propagate_sbp_asset_number_change ON public.sbp_assets;
CREATE TRIGGER tr_propagate_sbp_asset_number_change
    AFTER UPDATE OF asset_number ON public.sbp_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.propagate_sbp_asset_number_change();

-- One-time data synchronization for existing records
UPDATE public.smt_equipment
SET code = sbp.asset_number
FROM public.sbp_assets sbp
WHERE smt_equipment.sbp_asset_id = sbp.id;
