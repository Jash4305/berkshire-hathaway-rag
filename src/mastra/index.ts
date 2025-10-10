import { Mastra } from '@mastra/core';
import { LibSQLVector } from '@mastra/libsql';
import * as path from 'path';

// Import agent
import { berkshireAgent } from './agents/berkshire-agent';

// Import workflows
import { ingestionWorkflow } from './workflows/ingestion-workflow';

/**
 * Initialize LibSQL Vector Database
 */
const libSqlVector = new LibSQLVector({
  connectionUrl: `file:${path.resolve(process.cwd(), 'vector.db')}`,
});

/**
 * Initialize Mastra with all components
 * 
 * Naming Convention:
 * - File names: kebab-case (ingestion-workflow.ts)
 * - Export names: camelCase (ingestionWorkflow)
 * - Workflow IDs: camelCase matching export (ingestionWorkflow)
 * - Access via: mastra.getWorkflow('ingestionWorkflow')
 */
export const mastra: Mastra<any> = new Mastra({
  agents: {
    berkshireAgent,
  },
  workflows: {
    ingestionWorkflow,
  },
  vectors: {
    libSqlVector,
  },
});