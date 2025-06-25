# Ship Inspection Activity Logs Database Setup

## Overview
This directory contains SQL scripts to create and manage the activity logging system for the ship inspection application.

## Files
- `create_activity_logs_table.sql` - Creates the activity_logs table with proper UUID data types
- `recreate_activity_logs_table.sql` - Safely drops and recreates the table (if you had the wrong data types)
- `check_existing_tables.sql` - Utility script to check your database structure
- `README.md` - This documentation file

## Quick Start

### 1. For New Installation
If you haven't created the activity_logs table yet, run:
```sql
-- Copy and paste the contents of create_activity_logs_table.sql into Supabase SQL Editor
```

### 2. If You Have Data Type Issues
If you get errors about incompatible types (bigint vs uuid), run:
```sql
-- Copy and paste the contents of recreate_activity_logs_table.sql into Supabase SQL Editor
-- WARNING: This will delete all existing log data!
```

## Database Schema

The `activity_logs` table stores comprehensive audit trails with the following structure:

### Core Fields
- `id` (BIGSERIAL) - Primary key
- `user_id` (UUID) - References auth.users(id)
- `user_email` (VARCHAR) - User's email address
- `user_role` (VARCHAR) - User role (admin/user)
- `activity_type` (VARCHAR) - Type of activity (CREATE/UPDATE/DELETE/VIEW)
- `activity_description` (TEXT) - Human-readable description
- `table_affected` (VARCHAR) - Database table that was affected

### Reference Fields (All UUID to match Supabase conventions)
- `record_id` (UUID) - ID of the affected record
- `ship_id` (UUID) - Ship ID (if applicable)
- `ship_name` (VARCHAR) - Ship name for easier reporting
- `finding_id` (UUID) - Finding ID (if applicable)

### Data Fields
- `old_data` (JSONB) - Previous data state
- `new_data` (JSONB) - New data state
- `timestamp` (TIMESTAMPTZ) - When activity occurred

### Metadata Fields
- `ip_address` (INET) - User's IP address
- `user_agent` (TEXT) - Browser user agent
- `created_at` (TIMESTAMPTZ) - Record creation time
- `updated_at` (TIMESTAMPTZ) - Record update time

## Features

### 1. Foreign Key Constraints
- Automatically detects existing tables (ships, findings)
- Only creates foreign key constraints if tables exist and have correct UUID data types
- Uses CASCADE for proper data integrity

### 2. Optimized Indexing
- Individual indexes on commonly queried fields
- Composite indexes for complex queries
- Performance optimized for time-based queries

### 3. Row Level Security (RLS)
- Admin users can view all activity logs
- Regular users can only view their own logs
- Authenticated users can insert logs

### 4. Data Validation
- CHECK constraints on user_role and activity_type
- Proper data types for all fields
- NOT NULL constraints where appropriate

## Usage in Application

The activity logging is integrated into the following components:

### Frontend Components
- `AdminDashboard.js` - Logs admin activities
- `UserDashboard.js` - Logs user activities  
- `ShipDetails.js` - Logs ship-related activities
- `ActivityLogs.js` - Displays activity logs to admin users

### Logging Utility
- `src/utils/logging.js` - Contains all logging functions
- Supports different activity types and data structures
- Handles errors gracefully

## Common Issues and Solutions

### 1. Foreign Key Type Mismatch Error
**Error:** `foreign key constraint cannot be implemented - incompatible types: bigint and uuid`

**Solution:** Your tables use UUID primary keys but the activity_logs was created with BIGINT foreign keys.
```sql
-- Run the recreate script:
-- Copy contents of recreate_activity_logs_table.sql into Supabase SQL Editor
```

### 2. User Role Constraint Violation Error
**Error:** `new row for relation "activity_logs" violates check constraint "activity_logs_user_role_check"`

**Cause:** The application is trying to insert a role value that's not 'admin' or 'user'.

**Solution:** This is fixed in the updated logging utility (`src/utils/logging.js`). The fix includes:
- Proper role extraction from Supabase user object (`user.user_metadata.role`)
- Role validation with fallback to 'user'
- Better error handling

**Debugging Steps:**
1. **Check browser console** for debug messages showing the actual user object structure
2. **Verify user metadata** in Supabase Auth dashboard
3. **Use the debug utility** to inspect user objects:
```javascript
import { debugUser } from '../utils/debug';
debugUser(user, 'your-context');
```

**Manual Fix if Needed:**
```sql
-- Check existing invalid roles
SELECT DISTINCT user_role FROM activity_logs 
WHERE user_role NOT IN ('admin', 'user');

-- Update invalid roles (if any exist)
UPDATE activity_logs 
SET user_role = 'user' 
WHERE user_role NOT IN ('admin', 'user');
```

### 3. RLS Policy Issues
**Error:** Users can't insert logs or see their data

**Solution:** Make sure RLS policies are properly created:
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'activity_logs';

-- Recreate policies if needed (included in both SQL scripts)
```

### 4. Missing Tables
**Error:** Ships or findings table doesn't exist

**Solution:** The scripts handle this automatically - foreign key constraints are only created for existing tables.

## Verification Steps

After running the SQL scripts, verify the setup:

### 1. Check Table Structure
```sql
-- Run check_existing_tables.sql to verify structure
\d activity_logs
```

### 2. Test Logging
```sql
-- Test insert (should work for authenticated users)
INSERT INTO activity_logs (
    user_id, user_email, user_role, activity_type, 
    activity_description, table_affected
) VALUES (
    auth.uid(), 'test@example.com', 'admin', 'VIEW',
    'Test log entry', 'ships'
);
```

### 3. Verify Constraints
```sql
-- Check foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'activity_logs';
```

## Performance Considerations

### Indexes
The table includes optimized indexes for:
- User-based queries (`user_id`, `user_email`)
- Time-based queries (`timestamp`, `created_at`)
- Activity type filtering (`activity_type`)
- Ship and finding relationships

### Data Retention
Consider implementing data retention policies for large datasets:
```sql
-- Example: Delete logs older than 1 year
DELETE FROM activity_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

## Troubleshooting

### Check Database Connection
```sql
SELECT current_database(), current_user;
```

### Verify Table Exists
```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'activity_logs'
);
```

### Check Data Types
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;
```

### Verify RLS is Enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'activity_logs';
```

### Error: permission denied for table users

**Masalah**: Ketika mengakses Activity Logs muncul error "permission denied for table users"

**Penyebab**: 
1. RLS (Row Level Security) policy yang terlalu ketat pada tabel `activity_logs`
2. Foreign key constraint ke `auth.users` yang menyebabkan permission issue
3. Kurangnya grant permissions untuk authenticated users

**Solusi**:

Jalankan script SQL berikut di Supabase SQL Editor:

```sql
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
```

**Verifikasi**:
Setelah menjalankan script, coba akses Activity Logs lagi dari aplikasi.

**Mengapa Foreign Key Constraint Dihapus?**

Dalam tabel `activity_logs`, kita sudah menyimpan `user_email` dan `user_role` langsung sebagai text fields. Foreign key constraint ke `auth.users` tidak diperlukan karena:

1. Data user sudah tersimpan lengkap di setiap log entry
2. Menghindari kompleksitas permission dengan auth schema
3. Memungkinkan log tetap ada meskipun user dihapus dari sistem

## Support

If you encounter issues:

1. **Check the Supabase logs** for detailed error messages
2. **Verify your database permissions** - you need CREATE TABLE permissions
3. **Check table dependencies** - make sure referenced tables exist
4. **Confirm data types** - all foreign keys should be UUID to match Supabase conventions

## Migration Notes

### From BIGINT to UUID
If you previously created the table with BIGINT foreign keys:

1. **Backup any existing data** (if important)
2. **Run the recreate script** to get correct UUID data types
3. **Test the logging functionality** to ensure everything works

The UUID format ensures compatibility with Supabase's standard table structures and provides better performance for relational queries. 