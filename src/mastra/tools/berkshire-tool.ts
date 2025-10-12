import 'dotenv/config';
import { createTool } from '@mastra/core';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { Pool } from 'pg';

/**
 * Berkshire Letters Search Tool
 * 
 * Performs semantic search over Berkshire Hathaway shareholder letters
 * to find relevant information for answering questions.
 */
export const berkshireSearchTool = createTool({
  id: 'search-berkshire-letters',
  description: 'Search through Berkshire Hathaway shareholder letters to find relevant information about Warren Buffett\'s investment philosophy, business strategies, and company performance.',
  
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant information in Berkshire Hathaway letters'),
    topK: z.number().optional().default(5).describe('Number of top results to return'),
  }),
  
  outputSchema: z.object({
    results: z.array(z.object({
      text: z.string(),
      year: z.string(),
      source: z.string(),
      similarity: z.number(),
    })),
    totalFound: z.number(),
  }),
  
  execute: async ({ context }) => {
    const query = context.query as string;
    const topK = (context.topK as number) || 5;
    
    console.log(`🔍 Searching for: "${query}"`);
    
    try {
      // Generate embedding for the query using AI SDK v5
      const embeddingModel = openai.embedding('text-embedding-3-small');
      const { embedding } = await embed({
        model: embeddingModel,
        value: query,
      });

      // Connect to PostgreSQL
      const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:jash@localhost:5432/berkshire_rag';
      const pool = new Pool({ connectionString });
      
      const client = await pool.connect();
      
      try {
        // Perform vector similarity search
        const embeddingStr = `[${embedding.join(',')}]`;
        
        const result = await client.query(
          `
          SELECT 
            chunk_id,
            content,
            metadata,
            1 - (embedding <=> $1::vector) as similarity
          FROM document_chunks
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT $2
          `,
          [embeddingStr, topK]
        );

        // Format results
        const results = result.rows.map(row => ({
          text: row.content,
          year: row.metadata.year,
          source: row.metadata.source,
          similarity: parseFloat(row.similarity),
        }));

        console.log(`✅ Found ${results.length} relevant chunks`);
        
        return {
          results,
          totalFound: results.length,
        };
        
      } finally {
        client.release();
        await pool.end();
      }
      
    } catch (error) {
      console.error('❌ Error searching Berkshire letters:', error);
      throw error;
    }
  },
});