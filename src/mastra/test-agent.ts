import { mastra } from './mastra';

/**
 * Test the Berkshire Agent with sample queries
 */
async function testAgent() {
  try {
    const agent = mastra.getAgent('berkshireAgent');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  Testing Berkshire Hathaway Agent');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test Query 1: Investment Philosophy
    const query1 = "What is Warren Buffett's investment philosophy?";
    console.log(`Query 1: ${query1}\n`);

    const response1 = await agent.generate(query1);
    console.log('Response:', response1.text);
    console.log('\n' + '─'.repeat(60) + '\n');

    // Test Query 2: Specific Topic
    const query2 = "What does Warren Buffett think about cryptocurrency?";
    console.log(`Query 2: ${query2}\n`);

    const response2 = await agent.generate(query2);
    console.log('Response:', response2.text);
    console.log('\n' + '─'.repeat(60) + '\n');

    // Test Query 3: Follow-up Question
    const query3 = "How has Berkshire's investment strategy evolved over the past 5 years?";
    console.log(`Query 3: ${query3}\n`);

    const response3 = await agent.generate(query3);
    console.log('Response:', response3.text);
    console.log('\n═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error testing agent:', error);
    process.exit(1);
  }
}

// Run the test
testAgent();