CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100),
    token VARCHAR(1000),
    token_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    chunks JSONB DEFAULT '[]'::jsonb,
    CONSTRAINT filemetadata_userid_fkey FOREIGN KEY (userid)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'queued' NOT NULL,
    original_path TEXT NOT NULL,
    processed_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filemetadata_userid ON filemetadata(userid);
CREATE INDEX IF NOT EXISTS idx_filemetadata_created_at ON filemetadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_filemetadata_status ON filemetadata(status);
