import express from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from './config/environment';
import { bot } from './bot';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/authRoutes';
import { signRouter } from './routes/signRoutes';
import { walletRouter } from './routes/walletRoute';

const prisma = new PrismaClient();

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to database');

    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/sign', signRouter);
    app.use('/api/v1/wallet', walletRouter);
    app.use(errorHandler);
    app.listen(config.port, () => {
      console.log(`API server running on port ${config.port}`);
    });
    await bot.start();
    console.log('Telegram bot started successfully');
  } catch (error) {
    console.error('Error starting application:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}
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
startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
