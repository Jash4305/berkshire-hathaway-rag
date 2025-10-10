/**
 * Direct test of pdf-parse to find the working approach
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function testAllMethods() {
  const testFile = resolve(process.cwd(), 'data', '2019.pdf');
  const dataBuffer = readFileSync(testFile);
  
  console.log('Testing all possible pdf-parse usage methods...\n');
  console.log(`Test file: ${testFile}`);
  console.log(`Buffer size: ${dataBuffer.length} bytes\n`);
  
  // Load the module
  const pdfParseModule = require('pdf-parse');
  
  console.log('Module type:', typeof pdfParseModule);
  console.log('Module keys:', Object.keys(pdfParseModule));
  console.log('Has PDFParse?', 'PDFParse' in pdfParseModule);
  console.log('PDFParse type:', typeof pdfParseModule.PDFParse);
  console.log('');
  
  // Method 1: Try PDFParse class with buffer and options
  try {
    console.log('Method 1: new PDFParse(buffer, options)');
    const parser = new pdfParseModule.PDFParse(dataBuffer, {});
    console.log('Parser created, type:', typeof parser);
    console.log('Parser keys:', Object.keys(parser));
    console.log('Parser.parse exists?', 'parse' in parser);
    console.log('Parser is thenable?', 'then' in parser);
    
    if ('then' in parser) {
      const result = await parser;
      console.log('✓ SUCCESS! Result keys:', Object.keys(result));
      console.log('✓ Has text?', 'text' in result);
      if (result.text) {
        console.log(`✓ Extracted ${result.text.length} characters`);
        console.log('First 100 chars:', result.text.substring(0, 100));
      }
    }
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Method 2: Try calling module directly
  try {
    console.log('Method 2: pdfParseModule(buffer)');
    if (typeof pdfParseModule === 'function') {
      const result = await pdfParseModule(dataBuffer);
      console.log('✓ SUCCESS! Result keys:', Object.keys(result));
      console.log('✓ Extracted', result.text.length, 'characters');
    } else {
      console.log('Module is not a function');
    }
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Method 3: Try module.default
  try {
    console.log('Method 3: pdfParseModule.default(buffer)');
    if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
      const result = await pdfParseModule.default(dataBuffer);
      console.log('✓ SUCCESS! Result keys:', Object.keys(result));
      console.log('✓ Extracted', result.text.length, 'characters');
    } else {
      console.log('Module.default is not a function');
    }
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }
}

testAllMethods().catch(console.error);
