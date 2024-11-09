import { Bot, Context, session, SessionFlavor } from 'grammy';
import { config } from '../config/environment';
import { SessionData } from '../types';
import axios from 'axios';

// Create type for bot context with session
type BotContext = Context & SessionFlavor<SessionData>;

// Initialize bot with token
if (!config.botToken) {
  throw new Error('BOT_TOKEN is not defined in environment variables');
}

export const bot = new Bot<BotContext>(config.botToken);

// Initialize session
bot.use(session({
  initial(): SessionData {
    return { step: 'idle' };
  },
}));

// Command handlers
bot.command('start', async (ctx) => {
  const telegramUsername = ctx.from?.username;
  
  if (!telegramUsername) {
    await ctx.reply('You need to have a Telegram username to use this bot. Please set up a username in your Telegram settings and try again.');
    return;
  }

  try {
    const response = await axios.post('http://localhost:3000/api/v1/auth/signup', {
      username: telegramUsername
    });

    // Display the API response to the user
    await ctx.reply(`${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Handle API error response
      await ctx.reply(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      // Handle network or other errors
      await ctx.reply('An error occurred while connecting to the server. Please try again later.');
      console.error('API Error:', error);
    }
  }
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Fallback handler for unknown commands/messages
bot.on('message', async (ctx) => {
  if (ctx.session.step === 'idle') {
    const username = ctx.from?.username || 'Anonymous';
    await ctx.reply(`Hello @${username}! Use /start to begin.`);
  }
});