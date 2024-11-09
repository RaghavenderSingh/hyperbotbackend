import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  botToken: process.env.BOT_TOKEN,
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
};