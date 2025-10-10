import { createTool } from '@mastra/core';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
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
  execute: async ({ context, runId, machineId }, { query, topK = 5 }) => {
    try {
      console.log(`Searching for: "${query}"`);

      // Generate embedding for the query
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: query,
      });

      // Search in vector database
      const vectorStore = mastra.getVector('libSqlVector');
      const searchResults = await vectorStore.query({
        indexName: 'berkshire_letters',
        queryVector: embedding,
        topK,
      });

      // Format results
      const results = searchResults.map((result: any) => ({
        text: result.metadata.text || result.text || '',
        year: result.metadata.year || 'unknown',
        fileName: result.metadata.fileName || 'unknown',
        score: result.score || 0,
      }));

      console.log(`Found ${results.length} relevant chunks`);

      return { results };
    } catch (error) {
      console.error('Error searching Berkshire letters:', error);
      throw error;
    }
  },
});