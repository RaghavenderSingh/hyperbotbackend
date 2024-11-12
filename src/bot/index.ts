import { Bot, Context, session, SessionFlavor } from 'grammy';
import { config } from '../config/environment';
import { SessionData, BotSettings } from '../types';
import { defaultSettings } from '../settings/defaultSettings';
import { settingsHandlers } from '../settings/settingsHandlers';
import { handleSettings, handleSettingsInput } from '../settings/settingsManager';
import axios from 'axios';

type BotContext = Context & SessionFlavor<SessionData>;
if (!config.botToken) {
  throw new Error('BOT_TOKEN is not defined in environment variables');
}

export const bot = new Bot<BotContext>(config.botToken);
const userSettings = new Map<string, BotSettings>();
bot.use(
  session({
    initial(): SessionData {
      return { step: 'idle' };
    },
  }),
);

bot.command('settings', async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const settings = userSettings.get(userId) || defaultSettings;
  await handleSettings(ctx, settings);
});
bot.callbackQuery('Setting', async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const settings = userSettings.get(userId) || defaultSettings;
  await handleSettings(ctx, settings);
});
Object.entries(settingsHandlers).forEach(([action, handler]) => {
  bot.callbackQuery(action, async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const settings = userSettings.get(userId) || defaultSettings;
    await handler(ctx, settings);
    userSettings.set(userId, settings);
  });
});

bot.callbackQuery('refresh', async (ctx) => {
  try {
    await ctx.answerCallbackQuery('Refreshing wallet info...');
    const response = await axios.post(`http://localhost:3000/api/v1/wallet`, {
      username: ctx.from?.username,
    });
    if (ctx.callbackQuery.message) {
      await ctx.reply(
        `<b>Your Wallet Info</b> (Updated)
        
Address: <code>${response.data.publicKey}</code>
Balance: ${response.data.balance} SOL

Last updated: ${new Date().toLocaleTimeString()}

Tap to copy the address and send SOL to deposit.`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Refresh', callback_data: 'refresh' },
                { text: 'Close', callback_data: 'close' },
              ],
            ],
          },
        },
      );
    } else {
      await ctx.reply(
        `<b>Your Wallet Info</b>
        
Address: <code>${response.data.publicKey}</code>
Balance: ${response.data.balance} SOL

Last updated: ${new Date().toLocaleTimeString()}

Tap to copy the address and send SOL to deposit.`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Refresh', callback_data: 'refresh' },
                { text: 'Close', callback_data: 'close' },
              ],
            ],
          },
        },
      );
    }
  } catch (error) {
    console.error('Error in refresh handler:', error);
    await ctx.answerCallbackQuery('Error refreshing wallet info. Please try again.');
  }
});

bot.callbackQuery('close', async (ctx) => {
  try {
    await ctx.deleteMessage();
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Error in close handler:', error);
    await ctx.answerCallbackQuery('Error closing the message');
  }
});
bot.callbackQuery('wallet', async (ctx) => {
  try {
    const response = await axios.post(`http://localhost:3000/api/v1/wallet`, {
      username: ctx.from?.username,
    });
    await ctx.reply(
      `<b>Your Wallet Info</b> 
    
Address: <code>${response.data.publicKey}</code>
Balance: ${response.data.balance} SOL

Tap to copy the address and send SOL to deposit.

`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: 'close', callback_data: 'close' }]] },
      },
    );

    await ctx.answerCallbackQuery();
  } catch (error) {
    await ctx.answerCallbackQuery('Error fetching wallet info');
  }
});

bot.callbackQuery('buy', async (ctx) => {
  ctx.session.step = 'awaiting_buy_token_address';
  const message = await ctx.reply('Enter the token address you want to buy', {
    reply_markup: {
      force_reply: true,
      selective: true,
    },
  });
  ctx.session.message_id = message.message_id;
  await ctx.answerCallbackQuery();

  try {
    const response = await axios.post(`http://localhost:3000/api/v1/wallet`, {
      username: ctx.from?.username,
    });
  } catch (error) {}
});
bot.command('start', async (ctx) => {
  const telegramUsername = ctx.from?.username;

  if (!telegramUsername) {
    await ctx.reply(
      'You need to have a Telegram username to use this bot. Please set up a username in your Telegram settings and try again.',
    );
    return;
  }

  try {
    const response = await axios.post('http://localhost:3000/api/v1/auth/signup', {
      username: telegramUsername,
    });

    await ctx.reply(
      `
        <b>Welcome to HYPERBot</b>
Solana's fastest bot to trade any coin (SPL token), built by the 
HYPER community!
        
You currently have no SOL in your wallet. To start trading, 
deposit SOL to your HYPERbot wallet address:
        
<code>${response.data?.publicKey}</code>
<i>tap to copy</i>
        
Once done, tap refresh and your balance will appear here.
        
To buy a token enter a ticker, token address, or a URL from:
• pump.fun
• Birdeye
• Dexscreener
• Meteora
        
For more info on your wallet and to retrieve your private key,
tap the wallet button below. 
        
User funds are safe on HYPERbot, but if you expose your private
key we can't protect you!`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Buy', callback_data: 'buy' },
              { text: 'Sell & Manage', callback_data: 'refresh' },
            ],
            [
              { text: 'Help', callback_data: 'help' },
              { text: 'Refer friend', callback_data: 'refer' },
              { text: 'Alert', callback_data: 'alert' },
            ],
            [
              { text: 'Wallet', callback_data: 'wallet' },
              { text: 'Settings', callback_data: 'Setting' },
            ],
            [
              { text: 'Pin', callback_data: 'pin' },
              { text: 'Refesh', callback_data: 'refresh' },
            ],
          ],
        },
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      await ctx.reply(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      await ctx.reply('An error occurred while connecting to the server. Please try again later.');
      console.error('API Error:', error);
    }
  }
});
bot.catch((err) => {
  console.error('Bot error:', err);
});
bot.on('message', async (ctx) => {
  if (ctx.session.step !== 'idle') {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const settings = userSettings.get(userId) || defaultSettings;
    await handleSettingsInput(ctx, settings);
    userSettings.set(userId, settings);
    return;
  }
});
