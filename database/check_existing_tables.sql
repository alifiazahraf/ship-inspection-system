-- Script to check existing database structure
-- Run this first to identify your table names

-- 1. List all tables in the current schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if specific tables exist
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_list') 
         THEN 'user_list table EXISTS' 
         ELSE 'user_list table DOES NOT EXIST' END as user_table_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
         THEN 'users table EXISTS' 
         ELSE 'users table DOES NOT EXIST' END as users_table_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ships') 
         THEN 'ships table EXISTS' 
         ELSE 'ships table DOES NOT EXIST' END as ships_table_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'findings') 
         THEN 'findings table EXISTS' 
         ELSE 'findings table DOES NOT EXIST' END as findings_table_status;

-- 3. Check auth.users table (Supabase default)
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') 
         THEN 'auth.users table EXISTS' 
         ELSE 'auth.users table DOES NOT EXIST' END as auth_users_status;

-- 4. Show all tables that contain 'user' in the name
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%user%' 
ORDER BY table_schema, table_name;

-- 5. If you have a user table, check its structure
-- Uncomment the appropriate line based on your table name:

-- For user_list table:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_list' 
-- ORDER BY ordinal_position;

-- For users table:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- ORDER BY ordinal_position;

-- For auth.users table:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'auth' AND table_name = 'users' 
-- ORDER BY ordinal_position; 