/**
 * Test script to debug pdf-parse import issues
 */

async function testPdfParse() {
  console.log('Testing pdf-parse import methods...\n');
  
  // Method 1: Dynamic import
  try {
    console.log('Method 1: Dynamic import');
    const pdfParseModule = await import('pdf-parse');
    console.log('Module keys:', Object.keys(pdfParseModule));
    console.log('Has default?', 'default' in pdfParseModule);
    console.log('Type of default:', typeof pdfParseModule.default);
    console.log('Type of module:', typeof pdfParseModule);
  } catch (error) {
    console.error('Method 1 failed:', error);
  }

  // Method 2: createRequire
  try {
    console.log('\nMethod 2: createRequire');
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');
    console.log('Type of pdfParse:', typeof pdfParse);
    console.log('Is function?', typeof pdfParse === 'function');
  } catch (error) {
    console.error('Method 2 failed:', error);
  }

  // Method 3: Test with actual PDF
  try {
    console.log('\nMethod 3: Test with actual PDF file');
    const fs = await import('fs');
    const path = await import('path');
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');
    
    const testFile = path.resolve(process.cwd(), 'data', '2019.pdf');
    
    if (!fs.existsSync(testFile)) {
      console.log('Test file not found:', testFile);
      return;
    }
    
    console.log('Reading:', testFile);
    const dataBuffer = fs.readFileSync(testFile);
    console.log('Buffer size:', dataBuffer.length);
    
    const pdfData = await pdfParse(dataBuffer);
    console.log('Success! Extracted', pdfData.text.length, 'characters');
    console.log('First 100 chars:', pdfData.text.substring(0, 100));
  } catch (error) {
    console.error('Method 3 failed:', error);
  }
}

testPdfParse();