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
  execute: async ({ context, runId }, toolOptions): Promise<{
    results: Array<{
      text: string;
      year: string;
      fileName: string;
      score: number;
    }>;
  }> => {
    // Extract parameters from toolOptions
    const query = (toolOptions as any)?.query as string;
    const topK = ((toolOptions as any)?.topK as number) || 5;
    
    try {
      console.log(`Searching for: "${query}"`);

      // Generate embedding for the query using embedMany (compatible with AI SDK v4)
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small') as any,
        values: [query],
      });

      const queryEmbedding: number[] = embeddings[0];

      // Search in vector database
      const vectorStore: any = mastra.getVector('libSqlVector');
      const searchResults: any[] = await vectorStore.query({
        indexName: 'berkshire_letters',
        queryVector: queryEmbedding,
        topK,
      });

      // Format results with explicit types
      const results: Array<{
        text: string;
        year: string;
        fileName: string;
        score: number;
      }> = searchResults.map((result: any) => ({
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