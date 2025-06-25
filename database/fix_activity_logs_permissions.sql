-- Script untuk memperbaiki masalah permission pada activity_logs table
-- Error: permission denied for table users

-- 1. Cek struktur tabel activity_logs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;

-- 2. Cek RLS policies yang ada pada activity_logs
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'activity_logs';

-- 3. Drop existing RLS policies jika ada
DROP POLICY IF EXISTS "Enable read access for all users" ON activity_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON activity_logs;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON activity_logs;

-- 4. Enable RLS jika belum aktif
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create new RLS policies yang lebih permissive
-- Policy untuk SELECT (read) - semua authenticated users dapat melihat semua logs
CREATE POLICY "Allow authenticated users to view all logs" ON activity_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy untuk INSERT - semua authenticated users dapat menambah logs
CREATE POLICY "Allow authenticated users to insert logs" ON activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 6. Grant permissions pada tabel
GRANT ALL ON activity_logs TO authenticated;
GRANT USAGE ON SEQUENCE activity_logs_id_seq TO authenticated;

-- 7. Cek apakah ada constraint yang menggunakan auth.users
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='activity_logs';

-- 8. Alternative: Drop foreign key constraint ke auth.users jika ada
-- Karena kita sudah menyimpan user_email dan user_role langsung di activity_logs
-- Tidak perlu foreign key ke auth.users
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- 9. Verifikasi permissions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'activity_logs';

-- 10. Test query untuk memastikan bisa diakses
-- SELECT * FROM activity_logs LIMIT 1; 