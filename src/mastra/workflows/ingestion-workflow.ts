import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

/**
 * Step 1: Load and Parse PDFs from data folder
 */
const loadPDFsStep = createStep({
  id: 'load-pdfs',
  description: 'Load all Berkshire Hathaway PDFs from data folder',
  inputSchema: z.object({}),
  outputSchema: z.object({
    documents: z.array(z.object({
      fileName: z.string(),
      year: z.string(),
      content: z.string(),
      source: z.string(),
    })),
  }),
  execute: async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    // Use dynamic require for CommonJS module
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');

    const dataDir = path.resolve(process.cwd(), 'data');
    const pdfFiles = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.pdf'))
      .sort();

    console.log(`Found ${pdfFiles.length} PDF files`);

    const documents = [];
    
    for (const file of pdfFiles) {
      const filePath = path.join(dataDir, file);
      const year = file.match(/(\d{4})/)?.[1] || 'unknown';
      
      console.log(`Processing ${file}...`);
      
      const dataBuffer = fs.readFileSync(filePath);
      
      // Call pdf-parse directly
      const pdfData = await pdfParse(dataBuffer);
      
      documents.push({
        fileName: file,
        year,
        content: pdfData.text,
        source: filePath,
      });
      
      console.log(`✓ Extracted ${pdfData.text.length} characters from ${file}`);
    }

    return { documents };
  },
});

/**
 * Step 2: Chunk documents using Mastra's MDocument
 */
const chunkDocumentsStep = createStep({
  id: 'chunk-documents',
  description: 'Chunk documents into smaller pieces for embedding',
  inputSchema: z.object({
    documents: z.array(z.object({
      fileName: z.string(),
      year: z.string(),
      content: z.string(),
      source: z.string(),
    })),
  }),
  outputSchema: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.object({
        fileName: z.string(),
        year: z.string(),
        source: z.string(),
        type: z.string(),
        documentType: z.string(),
        chunkIndex: z.number(),
        totalChunks: z.number(),
      }),
    })),
  }),
  execute: async ({ inputData }) => {
    const { MDocument } = await import('@mastra/rag');
    const { documents } = inputData;

    const allChunks: Array<{
      text: string;
      metadata: {
        fileName: string;
        year: string;
        source: string;
        type: string;
        documentType: string;
        chunkIndex: number;
        totalChunks: number;
      };
    }> = [];

    for (const doc of documents) {
      console.log(`Chunking ${doc.fileName}...`);
      
      const mDoc = MDocument.fromText(doc.content);
      
      const chunks = await mDoc.chunk({
        strategy: 'recursive',
        maxSize: 1000,
        overlap: 200,
        separators: ['\n\n', '\n', '. ', ' '],
      });

      chunks.forEach((chunk, index) => {
        allChunks.push({
          text: chunk.text,
          metadata: {
            fileName: doc.fileName,
            year: doc.year,
            source: doc.source,
            type: 'berkshire_letter',
            documentType: 'shareholder_letter',
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        });
      });

      console.log(`✓ Created ${chunks.length} chunks from ${doc.fileName}`);
    }

    console.log(`Total chunks: ${allChunks.length}`);
    return { chunks: allChunks };
  },
});

/**
 * Step 3: Generate embeddings and store in vector database
 */
const storeEmbeddingsStep = createStep({
  id: 'store-embeddings',
  description: 'Generate embeddings and store in vector database',
  inputSchema: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.object({
        fileName: z.string(),
        year: z.string(),
        source: z.string(),
        type: z.string(),
        documentType: z.string(),
        chunkIndex: z.number(),
        totalChunks: z.number(),
      }),
    })),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    totalChunks: z.number(),
    chunksByYear: z.record(z.number()),
  }),
  execute: async ({ inputData }) => {
    const { openai } = await import('@ai-sdk/openai');
    const { embedMany } = await import('ai');
    const { mastra } = await import('../index');
    const { chunks } = inputData;

    console.log('Generating embeddings...');
    
    // Use embedMany with type assertion to work around v1/v2 incompatibility
    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small') as any,
      values: chunks.map(chunk => chunk.text),
    });

    console.log(`✓ Generated ${embeddings.length} embeddings`);

    const vectorStore = mastra.getVector('libSqlVector');

    // Create index
    try {
      await vectorStore.createIndex({
        indexName: 'berkshire_letters',
        dimension: 1536,
      });
      console.log('✓ Created vector index');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('✓ Vector index already exists');
      } else {
        throw error;
      }
    }

    // Store embeddings
    await vectorStore.upsert({
      indexName: 'berkshire_letters',
      vectors: embeddings,
      metadata: chunks.map(chunk => chunk.metadata),
    });

    console.log('✓ Stored embeddings in vector database');

    // Statistics
    const chunksByYear: Record<string, number> = {};
    chunks.forEach(chunk => {
      const year = chunk.metadata.year;
      chunksByYear[year] = (chunksByYear[year] || 0) + 1;
    });

    console.log('\nIngestion Statistics:');
    Object.keys(chunksByYear).sort().forEach(year => {
      console.log(`  ${year}: ${chunksByYear[year]} chunks`);
    });

    return { 
      success: true, 
      totalChunks: chunks.length,
      chunksByYear 
    };
  },
});

/**
 * Berkshire Hathaway Document Ingestion Workflow
 */
export const ingestionWorkflow = createWorkflow({
  id: 'ingestionWorkflow',
  description: 'Process and ingest Berkshire Hathaway shareholder letters',
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
    totalChunks: z.number(),
    chunksByYear: z.record(z.number()),
  }),
})
  .then(loadPDFsStep)
  .then(chunkDocumentsStep)
  .then(storeEmbeddingsStep)
  .commit();