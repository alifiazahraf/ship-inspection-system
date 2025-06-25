-- Simple fix untuk masalah permission pada activity_logs
-- Menghilangkan foreign key constraint dan menggunakan RLS policy yang sederhana

-- 1. Drop foreign key constraint jika ada
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- 2. Drop existing RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON activity_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON activity_logs;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON activity_logs;

-- 3. Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policies yang memungkinkan semua authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON activity_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Grant permissions
GRANT ALL ON activity_logs TO authenticated;
GRANT USAGE ON SEQUENCE activity_logs_id_seq TO authenticated; 