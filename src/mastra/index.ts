import { Mastra } from '@mastra/core';
import { LibSQLVector } from '@mastra/libsql';
import * as path from 'path';

// Import agent
import { berkshireAgent } from './agents/berkshire-agent';

// Import workflows
import { ingestionWorkflow } from './workflows/ingestion';

// Import tools
import { berkshireSearchTool } from './tools/berkshire-tool';

/**
 * Initialize LibSQL Vector Database
 */
const libSqlVector = new LibSQLVector({
  connectionUrl: `file:${path.resolve(process.cwd(), 'vector.db')}`,
});

/**
 * Initialize Mastra with all components
 */
export const mastra = new Mastra({
  agents: {
    berkshireAgent,
  },
  workflows: {
    ingestionWorkflow,
  },
  tools: {
    berkshireSearchTool,
  },
  vectors: {
    libSqlVector,
  },
});