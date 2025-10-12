import 'dotenv/config';
import { Mastra } from '@mastra/core';
import { PgVector } from '@mastra/pg';

// Import agent
import { berkshireAgent } from './agents/berkshire-agent';

// Import workflows
import { ingestionWorkflow } from './workflows/ingestion-workflow';

/**
 * Initialize PostgreSQL Vector Database with PgVector
 */
const pgVector = new PgVector({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jash@localhost:5432/berkshire_rag',
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
  vectors: {
    pgVector,
  },
});