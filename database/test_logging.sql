-- Test script for activity_logs table
-- Run this after creating the activity_logs table to verify everything works

-- Step 1: Check if table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;

-- Step 2: Check constraints
SELECT 
    constraint_name, 
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'activity_logs';

-- Step 3: Test valid user_role values
-- This should work
INSERT INTO activity_logs (
    user_id, 
    user_email, 
    user_role, 
    activity_type, 
    activity_description, 
    table_affected
) VALUES (
    auth.uid(), 
    'test@example.com', 
    'admin',  -- Valid role
    'VIEW', 
    'Test log entry for admin', 
    'ships'
);

-- This should also work
INSERT INTO activity_logs (
    user_id, 
    user_email, 
    user_role, 
    activity_type, 
    activity_description, 
    table_affected
) VALUES (
    auth.uid(), 
    'test2@example.com', 
    'user',  -- Valid role
    'VIEW', 
    'Test log entry for user', 
    'ships'
);

-- Step 4: Test invalid user_role (this should fail)
-- Uncomment to test constraint violation
/*
INSERT INTO activity_logs (
    user_id, 
    user_email, 
    user_role, 
    activity_type, 
    activity_description, 
    table_affected
) VALUES (
    auth.uid(), 
    'test3@example.com', 
    'invalid_role',  -- Invalid role - should fail
    'VIEW', 
    'Test log entry with invalid role', 
    'ships'
);
*/

-- Step 5: Check if test data was inserted
SELECT 
    id,
    user_email,
    user_role,
    activity_type,
    activity_description,
    table_affected,
    timestamp
FROM activity_logs 
WHERE user_email LIKE 'test%@example.com'
ORDER BY timestamp DESC;

-- Step 6: Clean up test data
DELETE FROM activity_logs 
WHERE user_email LIKE 'test%@example.com';

-- Step 7: Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'activity_logs';

-- Step 8: Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'activity_logs'
ORDER BY indexname;

-- Success message
SELECT 'Activity logs table is working correctly!' as test_result; 