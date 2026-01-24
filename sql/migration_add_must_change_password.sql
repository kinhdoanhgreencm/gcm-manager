-- Migration: Add must_change_password column to users table
-- This column is used to force users to change their password on first login

-- Add must_change_password column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
        
        -- Update existing users: set must_change_password = true if last_login_at is NULL (first login)
        UPDATE users 
        SET must_change_password = TRUE 
        WHERE last_login_at IS NULL;
    END IF;
END $$;

-- Add comment to the column
COMMENT ON COLUMN users.must_change_password IS 'Flag to indicate if user must change password on next login';
