-- Enable PgVector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for document chunks with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    chunk_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance

-- Index on chunk_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_chunk_id ON document_chunks(chunk_id);

-- Index on metadata for filtering
CREATE INDEX IF NOT EXISTS idx_metadata ON document_chunks USING gin(metadata);

-- Vector similarity index using HNSW (Hierarchical Navigable Small World)
-- This is the recommended index type for production use
CREATE INDEX IF NOT EXISTS idx_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (use if HNSW is not available)
-- Uncomment the line below if HNSW fails
-- CREATE INDEX IF NOT EXISTS idx_embedding_ivfflat 
-- ON document_chunks 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Create a function to search similar vectors
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    chunk_id VARCHAR,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        document_chunks.chunk_id,
        document_chunks.content,
        document_chunks.metadata,
        1 - (document_chunks.embedding <=> query_embedding) as similarity
    FROM document_chunks
    WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant necessary permissions (adjust user as needed)
GRANT ALL PRIVILEGES ON TABLE document_chunks TO postgres;
GRANT USAGE, SELECT ON SEQUENCE document_chunks_id_seq TO postgres;