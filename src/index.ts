// src/index.ts

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from './config/environment';
import { bot } from './bot';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/authRoutes';
import { signRouter } from './routes/signRoutes';

const prisma = new PrismaClient();

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Successfully connected to database');

    // Initialize Express app
    const app = express();
    app.use(express.json());

    // Register routes
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/sign', signRouter);

    // Register error handler
    app.use(errorHandler);

    // Start Express server
    app.listen(config.port, () => {
      console.log(`API server running on port ${config.port}`);
    });

    // Start Telegram bot
    await bot.start();
    console.log('Telegram bot started successfully');

  } catch (error) {
    console.error('Error starting application:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle application shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down application...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down application...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the application
startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});