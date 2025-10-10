import { mastra } from './mastra';

/**
 * Run the Berkshire Hathaway ingestion workflow
 */
async function runIngestion() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Berkshire Hathaway Letters - Document Ingestion');
    console.log('═══════════════════════════════════════════════════════\n');

    const workflow = mastra.getWorkflow('ingestion-workflow');

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