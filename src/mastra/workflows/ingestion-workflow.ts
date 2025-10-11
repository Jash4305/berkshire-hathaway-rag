import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { PDFExtract } from 'pdf.js-extract';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { Pool } from 'pg';

const pdfExtract = new PDFExtract();

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(' ');
      currentChunk = words.slice(-Math.floor(overlap / 5)).join(' ') + ' ' + sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

const loadPDFsStep = createStep({
  id: 'load-pdfs',
  description: 'Load PDF files from data directory',
  inputSchema: z.object({}),
  outputSchema: z.object({
    files: z.array(z.string()),
  }),
  execute: async () => {
    console.log('📂 Step 1: Loading PDF Files');
    console.log('─'.repeat(60));
    const dataDir = path.join(process.cwd(), 'data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.pdf'));
    console.log(`✓ Found ${files.length} PDF files: ${files.join(', ')}\n`);
    return { files };
  },
});

const processPDFsStep = createStep({
  id: 'process-pdfs',
  description: 'Process PDF files and extract text',
  inputSchema: z.object({
    files: z.array(z.string()),
  }),
  outputSchema: z.object({
    processedDocuments: z.array(z.object({
      filename: z.string(),
      year: z.string(),
      chunks: z.array(z.string()),
      pages: z.number(),
    })),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }
    
    console.log('📄 Step 2: Processing PDFs & Chunking Text');
    console.log('─'.repeat(60));
    
    const { files } = inputData;
    const processedDocuments = [];
    
    // Save original console functions
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    for (const filename of files) {
      const filePath = path.join(process.cwd(), 'data', filename);
      const year = filename.replace('.pdf', '');
      
      try {
        // Suppress pdf.js-extract verbose output
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        
        const data = await pdfExtract.extract(filePath, {});
        
        // Restore console immediately after extraction
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        
        const fullText = data.pages
          .map(page => 
            page.content
              .map(item => item.str)
              .join(' ')
          )
          .join('\n\n');
        
        const chunks = chunkText(fullText, 1000, 200);
        
        processedDocuments.push({
          filename,
          year,
          chunks,
          pages: data.pages.length,
        });
        
        console.log(`  ✓ ${filename.padEnd(15)} | ${data.pages.length} pages | ${chunks.length} chunks | ${(fullText.length / 1000).toFixed(1)}KB`);
        
      } catch (error) {
        // Restore console in case of error
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${filename.padEnd(15)} | Error: ${errorMessage}`);
      }
    }
    
    console.log(`\n✓ Processed ${processedDocuments.length} documents successfully\n`);
    
    return { processedDocuments };
  },
});

const generateEmbeddingsStep = createStep({
  id: 'generate-embeddings',
  description: 'Generate embeddings for document chunks using OpenAI',
  inputSchema: z.object({
    processedDocuments: z.array(z.object({
      filename: z.string(),
      year: z.string(),
      chunks: z.array(z.string()),
      pages: z.number(),
    })),
  }),
  outputSchema: z.object({
    embeddedChunks: z.array(z.object({
      id: z.string(),
      content: z.string(),
      embedding: z.array(z.number()),
      metadata: z.object({
        source: z.string(),
        year: z.string(),
        chunkIndex: z.number(),
        totalChunks: z.number(),
      }),
    })),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }
    
    console.log('🤖 Step 3: Generating Embeddings (OpenAI text-embedding-3-small)');
    console.log('─'.repeat(60));
    
    const { processedDocuments } = inputData;
    const embeddedChunks = [];
    
    const embeddingModel = openai.embedding('text-embedding-3-small');
    
    let totalChunks = 0;
    for (const doc of processedDocuments) {
      totalChunks += doc.chunks.length;
    }
    
    console.log(`Total chunks to embed: ${totalChunks}\n`);
    
    let processed = 0;
    for (const doc of processedDocuments) {
      try {
        // Process chunks individually using AI SDK v5
        for (let i = 0; i < doc.chunks.length; i++) {
          const { embedding } = await embed({
            model: embeddingModel,
            value: doc.chunks[i],
          });
          
          embeddedChunks.push({
            id: `${doc.year}-chunk-${i}`,
            content: doc.chunks[i],
            embedding: embedding,
            metadata: {
              source: doc.filename,
              year: doc.year,
              chunkIndex: i,
              totalChunks: doc.chunks.length,
            },
          });
          
          processed++;
        }
        
        console.log(`  ✓ ${doc.filename.padEnd(15)} | ${doc.chunks.length} embeddings | Progress: ${processed}/${totalChunks}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${doc.filename.padEnd(15)} | Error: ${errorMessage}`);
      }
    }
    
    console.log(`\n✓ Generated ${embeddedChunks.length} embeddings (1536 dimensions each)\n`);
    
    return { embeddedChunks };
  },
});

const storeEmbeddingsStep = createStep({
  id: 'store-embeddings',
  description: 'Store embeddings in PostgreSQL with PgVector',
  inputSchema: z.object({
    embeddedChunks: z.array(z.object({
      id: z.string(),
      content: z.string(),
      embedding: z.array(z.number()),
      metadata: z.object({
        source: z.string(),
        year: z.string(),
        chunkIndex: z.number(),
        totalChunks: z.number(),
      }),
    })),
  }),
  outputSchema: z.object({
    stored: z.number(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }
    
    console.log('💾 Step 4: Storing in PostgreSQL with PgVector');
    console.log('─'.repeat(60));
    
    const { embeddedChunks } = inputData;
    
    // Use direct PostgreSQL connection instead of mastra vectorStore
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:jash@localhost:5432/berkshire_rag';
    const pool = new Pool({ connectionString });
    
    let stored = 0;
    const batchSize = 50;
    const totalBatches = Math.ceil(embeddedChunks.length / batchSize);
    
    console.log(`Total batches: ${totalBatches} (batch size: ${batchSize})\n`);
    
    try {
      for (let i = 0; i < embeddedChunks.length; i += batchSize) {
        const batch = embeddedChunks.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          for (const chunk of batch) {
            const embeddingStr = `[${chunk.embedding.join(',')}]`;
            
            await client.query(
              `
              INSERT INTO document_chunks (chunk_id, content, embedding, metadata)
              VALUES ($1, $2, $3::vector, $4)
              ON CONFLICT (chunk_id) 
              DO UPDATE SET 
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                metadata = EXCLUDED.metadata
              `,
              [
                chunk.id,
                chunk.content,
                embeddingStr,
                JSON.stringify(chunk.metadata),
              ]
            );
          }
          
          await client.query('COMMIT');
          stored += batch.length;
          const progress = ((stored / embeddedChunks.length) * 100).toFixed(1);
          console.log(`  ✓ Batch ${batchNum}/${totalBatches} | Stored ${stored}/${embeddedChunks.length} chunks (${progress}%)`);
          
        } catch (error) {
          await client.query('ROLLBACK');
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`  ✗ Batch ${batchNum} failed: ${errorMessage}`);
        } finally {
          client.release();
        }
      }
    } finally {
      await pool.end();
    }
    
    console.log(`\n✅ Successfully stored ${stored} chunks in PostgreSQL\n`);
    
    return { stored };
  },
});

const ingestionWorkflow = createWorkflow({
  id: 'ingestionWorkflow',
  inputSchema: z.object({}),
  outputSchema: z.object({
    stored: z.number(),
  }),
})
  .then(loadPDFsStep)
  .then(processPDFsStep)
  .then(generateEmbeddingsStep)
  .then(storeEmbeddingsStep);

ingestionWorkflow.commit();

export { ingestionWorkflow };