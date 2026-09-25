CREATE TABLE transfer_destination_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE TRIGGER update_transfer_destination_categories_modtime
    BEFORE UPDATE ON transfer_destination_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
