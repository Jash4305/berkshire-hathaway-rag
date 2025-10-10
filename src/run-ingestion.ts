import { mastra } from './mastra';

/**
 * Run the Berkshire Hathaway ingestion workflow
 */
async function runIngestion() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Berkshire Hathaway Letters - Document Ingestion');
    console.log('═══════════════════════════════════════════════════════\n');

    // IMPORTANT: Use the workflow ID that matches the export name (camelCase)
    // File: ingestion-workflow.ts (kebab-case)
    // Export: ingestionWorkflow (camelCase)
    // ID: 'ingestionWorkflow' (camelCase)
    const workflow = mastra.getWorkflow('ingestionWorkflow');

    console.log('Starting ingestion workflow...\n');

    const run = await workflow.createRunAsync();
    const result = await run.start({ inputData: {} });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Ingestion Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Result:', JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

// Run the ingestion
runIngestion();