// src/mastra/vectors/postgres-vector.ts
import { Pool } from 'pg';

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

export class PostgresVectorStore {
  private pool: Pool;
  private tableName: string;

  constructor(connectionString: string, tableName: string = 'document_chunks') {
    this.pool = new Pool({
      connectionString,
    });
    this.tableName = tableName;
  }

  async initialize() {
    const client = await this.pool.connect();
    try {
      // This method is now optional since we set up the schema manually
      // But it's good to have for safety
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

      console.log('✅ PostgreSQL vector store verified');
    } catch (error) {
      console.error('Error verifying vector store:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async upsert(documents: VectorDocument[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const doc of documents) {
        const embeddingStr = `[${doc.embedding.join(',')}]`;
        
        await client.query(
          `
          INSERT INTO ${this.tableName} (chunk_id, content, embedding, metadata)
          VALUES ($1, $2, $3::vector, $4)
          ON CONFLICT (chunk_id) 
          DO UPDATE SET 
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata
          `,
          [
            doc.id,
            doc.content,
            embeddingStr,
            JSON.stringify(doc.metadata),
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error upserting documents:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async query(queryEmbedding: number[], topK: number = 5) {
    const client = await this.pool.connect();
    try {
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      const result = await client.query(
        `
        SELECT 
          chunk_id,
          content,
          metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM ${this.tableName}
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `,
        [embeddingStr, topK]
      );

      return result.rows.map(row => ({
        id: row.chunk_id,
        content: row.content,
        metadata: row.metadata,
        score: parseFloat(row.similarity),
      }));
    } finally {
      client.release();
    }
  }

  async count(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`SELECT COUNT(*) FROM ${this.tableName}`);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}