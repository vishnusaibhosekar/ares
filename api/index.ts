/**
 * Vercel Serverless Function - API Entry Point
 * Wraps the Express application for serverless deployment
 */
import { createApp } from '../src/api/server';

// Create the Express app
const app = createApp();

// Export the app as the default handler for Vercel
export default app;
