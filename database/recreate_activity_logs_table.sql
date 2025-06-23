-- Script to safely recreate activity_logs table with correct data types
-- Run this if you already have activity_logs table with wrong data types

-- Step 1: Drop existing table if it exists (WARNING: This will delete all existing log data)
DROP TABLE IF EXISTS activity_logs CASCADE;

-- Step 2: Create activity_logs table with correct UUID data types
-- Since user_list is a view from auth.users, we'll reference auth.users directly
-- Updated to use UUID types for foreign keys to match Supabase conventions
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL CHECK (user_role IN ('admin', 'user')),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW')),
    activity_description TEXT NOT NULL,
    table_affected VARCHAR(100) NOT NULL,
    record_id UUID, -- UUID to accommodate different table types
    ship_id UUID, -- UUID to match ships table
    ship_name VARCHAR(255),
    finding_id UUID, -- UUID to match findings table
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add foreign key constraints for ships and findings if tables exist
-- Check if ships table exists and add constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ships') THEN
        -- Check the data type of ships.id to make sure it's UUID
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'ships' AND column_name = 'id' AND data_type = 'uuid'
        ) THEN
            ALTER TABLE activity_logs ADD CONSTRAINT fk_activity_logs_ship_id 
                FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for ships table (UUID)';
        ELSE
            RAISE NOTICE 'Ships table exists but id column is not UUID type - skipping FK constraint';
        END IF;
    ELSE
        RAISE NOTICE 'Ships table does not exist - skipping FK constraint';
    END IF;
END $$;

-- Check if findings table exists and add constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'findings') THEN
        -- Check the data type of findings.id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'findings' AND column_name = 'id' AND data_type = 'uuid'
        ) THEN
            ALTER TABLE activity_logs ADD CONSTRAINT fk_activity_logs_finding_id 
                FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for findings table (UUID)';
        ELSE
            RAISE NOTICE 'Findings table exists but id column is not UUID type - skipping FK constraint';
        END IF;
    ELSE
        RAISE NOTICE 'Findings table does not exist - skipping FK constraint';
    END IF;
END $$;

-- Step 4: Create indexes for better query performance
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_user_email ON activity_logs(user_email);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_table_affected ON activity_logs(table_affected);
CREATE INDEX idx_activity_logs_ship_id ON activity_logs(ship_id);
CREATE INDEX idx_activity_logs_finding_id ON activity_logs(finding_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Create composite indexes for common query patterns
CREATE INDEX idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp DESC);
CREATE INDEX idx_activity_logs_ship_timestamp ON activity_logs(ship_id, timestamp DESC);
CREATE INDEX idx_activity_logs_user_activity ON activity_logs(user_id, activity_type, timestamp DESC);

-- Step 5: Enable RLS (Row Level Security)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- Policy for admin users to see all logs
CREATE POLICY "Admin can view all activity logs" ON activity_logs
    FOR SELECT USING (
        (auth.jwt() ->> 'role' = 'admin') 
        OR 
        (auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_user_meta_data->>'role' = 'admin'
        ))
    );

-- Policy for users to see only their own logs
CREATE POLICY "Users can view their own activity logs" ON activity_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for inserting logs (authenticated users can insert)
CREATE POLICY "Authenticated users can insert activity logs" ON activity_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Step 7: Add comments for documentation
COMMENT ON TABLE activity_logs IS 'Table for storing user activity logs and audit trail';
COMMENT ON COLUMN activity_logs.user_id IS 'Foreign key to auth.users table (UUID)';
COMMENT ON COLUMN activity_logs.user_email IS 'Email of the user who performed the activity';
COMMENT ON COLUMN activity_logs.user_role IS 'Role of the user (admin/user)';
COMMENT ON COLUMN activity_logs.activity_type IS 'Type of activity performed (CREATE/UPDATE/DELETE/VIEW)';
COMMENT ON COLUMN activity_logs.activity_description IS 'Human readable description of the activity';
COMMENT ON COLUMN activity_logs.table_affected IS 'Database table that was affected by the activity';
COMMENT ON COLUMN activity_logs.record_id IS 'ID of the record that was affected (UUID)';
COMMENT ON COLUMN activity_logs.ship_id IS 'Ship ID if the activity is related to a ship (UUID)';
COMMENT ON COLUMN activity_logs.ship_name IS 'Ship name for easier reporting';
COMMENT ON COLUMN activity_logs.finding_id IS 'Finding ID if the activity is related to a finding (UUID)';
COMMENT ON COLUMN activity_logs.old_data IS 'Previous data before the change (JSON format)';
COMMENT ON COLUMN activity_logs.new_data IS 'New data after the change (JSON format)';
COMMENT ON COLUMN activity_logs.timestamp IS 'When the activity occurred';
COMMENT ON COLUMN activity_logs.ip_address IS 'IP address of the user';
COMMENT ON COLUMN activity_logs.user_agent IS 'User agent string of the browser';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Activity logs table has been successfully created with UUID data types!';
    RAISE NOTICE 'You can now use the logging system in your application.';
END $$; 