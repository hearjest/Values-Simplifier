BEGIN;

-- Safety checks before enforcing UNIQUE + NOT NULL on users.name.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        WHERE name IS NULL OR btrim(name) = ''
    ) THEN
        RAISE EXCEPTION 'Migration aborted: users.name contains NULL or blank values. Clean those rows first.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM users
        GROUP BY name
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migration aborted: users.name contains duplicates. Deduplicate usernames first.';
    END IF;
END
$$;

ALTER TABLE users
    ALTER COLUMN name SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_name_key'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_name_key UNIQUE (name);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS filemetadata (
    id UUID PRIMARY KEY,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    userid INTEGER NOT NULL,
    s3_link TEXT,
    status TEXT NOT NULL DEFAULT 'started',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    chunks JSONB DEFAULT '[]'::jsonb
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'filemetadata_userid_fkey'
          AND conrelid = 'filemetadata'::regclass
    ) THEN
        ALTER TABLE filemetadata
            ADD CONSTRAINT filemetadata_userid_fkey
            FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_filemetadata_userid ON filemetadata(userid);
CREATE INDEX IF NOT EXISTS idx_filemetadata_created_at ON filemetadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filemetadata_status ON filemetadata(status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'jobs'
          AND column_name = 'jobType'
    ) THEN
        ALTER TABLE jobs
            ADD COLUMN "jobType" TEXT;
    END IF;
END
$$;

COMMIT;
