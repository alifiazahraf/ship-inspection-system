-- Add vessel_comment column to findings table
-- This column will store comments from vessel users

-- Check if vessel_comment column already exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'findings' 
        AND column_name = 'vessel_comment'
    ) THEN
        -- Add the vessel_comment column
        ALTER TABLE findings 
        ADD COLUMN vessel_comment TEXT;
        
        RAISE NOTICE 'vessel_comment column added to findings table successfully';
    ELSE
        RAISE NOTICE 'vessel_comment column already exists in findings table';
    END IF;
END $$;

-- Add comment to the column for documentation
COMMENT ON COLUMN findings.vessel_comment IS 'Comments from vessel users regarding findings';

-- Optional: Update existing findings to have null vessel_comment (they already are null by default)
-- UPDATE findings SET vessel_comment = NULL WHERE vessel_comment IS NULL; 