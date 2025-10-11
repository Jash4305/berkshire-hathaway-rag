-- Drop existing table (use with caution!)
DROP TABLE IF EXISTS document_chunks CASCADE;

-- Enable PgVector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    chunk_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_chunk_id ON document_chunks(chunk_id);
CREATE INDEX idx_metadata ON document_chunks USING gin(metadata);
CREATE INDEX idx_embedding_hnsw ON document_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Display success message
SELECT 'Database setup complete!' as status;