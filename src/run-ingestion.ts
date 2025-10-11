import { mastra } from './mastra';

/**
 * Run the Berkshire Hathaway ingestion workflow
 */
async function runIngestion() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Berkshire Hathaway Letters - Document Ingestion');
    console.log('═══════════════════════════════════════════════════════\n');

    const workflow = mastra.getWorkflow('ingestionWorkflow');

    const run = await workflow.createRunAsync();
    const result = await run.start({ inputData: {} });

    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ Ingestion Complete!');
    console.log('═══════════════════════════════════════════════════════');
    
    // Only print summary, not full result
    console.log(`\n📊 Summary:`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Documents Stored: ${result.result?.stored || 0}`);
    console.log(`   Total Steps: ${Object.keys(result.steps || {}).length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

// Run the ingestion
runIngestion();