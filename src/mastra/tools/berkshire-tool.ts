import { createTool } from '@mastra/core';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { mastra } from '../index';

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
      fileName: z.string(),
      score: z.number(),
    })),
  }),
  execute: async ({ context, runId }, inputData) => {
    const { query, topK = 5 } = inputData;
    
    try {
      console.log(`Searching for: "${query}"`);

      // Generate embedding for the query using embedMany (compatible with v1)
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: [query],
      });

      const queryEmbedding = embeddings[0];

      // Search in vector database
      const vectorStore = mastra.getVector('libSqlVector');
      const searchResults = await vectorStore.query({
        indexName: 'berkshire_letters',
        queryVector: queryEmbedding,
        topK,
      });

      // Format results with explicit types
      const results = searchResults.map((result: any) => ({
        text: (result.metadata?.text || result.text || '') as string,
        year: (result.metadata?.year || 'unknown') as string,
        fileName: (result.metadata?.fileName || 'unknown') as string,
        score: (result.score || 0) as number,
      }));

      console.log(`Found ${results.length} relevant chunks`);

      return { results };
    } catch (error) {
      console.error('Error searching Berkshire letters:', error);
      throw error;
    }
  },
});