import fs from 'fs';
import path from 'path';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { PDFExtract } from 'pdf.js-extract';

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
    const dataDir = path.join(process.cwd(), 'data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files\n`);
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
    results: z.array(z.object({
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
    
    const { files } = inputData;
    const results = [];
    
    for (const filename of files) {
      const filePath = path.join(process.cwd(), 'data', filename);
      const year = filename.replace('.pdf', '');
      
      console.log(`Processing ${filename}...`);
      
      try {
        // Extract PDF content
        const data = await pdfExtract.extract(filePath, {});
        
        // Combine all text from all pages
        const fullText = data.pages
          .map(page => 
            page.content
              .map(item => item.str)
              .join(' ')
          )
          .join('\n\n');
        
        const chunks = chunkText(fullText, 1000, 200);
        
        console.log(`  - Extracted ${data.pages.length} pages`);
        console.log(`  - Text length: ${fullText.length} characters`);
        console.log(`  - Created ${chunks.length} chunks`);
        
        results.push({
          filename,
          year,
          chunks,
          pages: data.pages.length,
        });
        
        console.log(`  ✓ Processed successfully\n`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ Error: ${errorMessage}\n`);
      }
    }
    
    return { results };
  },
});

const ingestionWorkflow = createWorkflow({
  id: 'ingestion-workflow',
  inputSchema: z.object({}),
  outputSchema: z.object({
    results: z.array(z.object({
      filename: z.string(),
      year: z.string(),
      chunks: z.array(z.string()),
      pages: z.number(),
    })),
  }),
})
  .then(loadPDFsStep)
  .then(processPDFsStep);

ingestionWorkflow.commit();

export { ingestionWorkflow };