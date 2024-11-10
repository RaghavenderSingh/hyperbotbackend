import { Bot, Context, session, SessionFlavor } from 'grammy';
import { config } from '../config/environment';
import { SessionData } from '../types';
import axios from 'axios';

type BotContext = Context & SessionFlavor<SessionData>;
if (!config.botToken) {
  throw new Error('BOT_TOKEN is not defined in environment variables');
}

export const bot = new Bot<BotContext>(config.botToken);
bot.use(
  session({
    initial(): SessionData {
      return { step: 'idle' };
    },
  }),
);

bot.callbackQuery('Setting', async (ctx) => {
  await ctx.answerCallbackQuery('Setting...');
  if (ctx.callbackQuery.message) {
    await ctx.reply(
      `
<b>Settings:</b>      

<b>GENERAL SETTINGS</b>
<b>HYPERbot Announcements</b>: Occasional announcements. Tap to toggle.
`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '---GENERAL SETTINGS---',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '🟢 Announcements',
                callback_data: 'announcements',
              },
              {
                text: '✎Min Pos Value $0.001',
                callback_data: 'announcements',
              },
            ],
            [
              {
                text: '---AUTO BUY---',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '🔴 Disabled',
                callback_data: 'announcements',
              },
              {
                text: '✎ 5.00 SOL',
                callback_data: 'announcements',
              },
            ],
            [
              {
                text: '---BUY BUTTON CONFIG---',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '✎ LEFT: 25%',
                callback_data: 'announcements',
              },
              {
                text: '✎ RIGHT: 100%',
                callback_data: 'announcements',
              },
            ],
            [
              {
                text: '---SLIPPAGE CONFIG---',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '✎ BUY: 10%',
                callback_data: 'announcements',
              },
              {
                text: '✎ SELL: 10%',
                callback_data: 'announcements',
              },
            ],
            [
              {
                text: '✎ Max Price Impact: 15%',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '---MEV PROTECT---',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '⇄TURBO',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '---TRANSACTION PRIORITY---',
                callback_data: 'none',
              },
            ],
            [
              {
                text: '⇄Medium',
                callback_data: 'announcements',
              },
              {
                text: '✎ 0.00100 SOL',
                callback_data: 'announcements',
              },
            ],
            [
              {
                text: 'Close',
                callback_data: 'none',
              },
            ],
          ],
        },
      },
    );
  }
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

// Close handler
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
              { text: 'Buy', callback_data: 'wallet' },
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
  if (ctx.session.step === 'idle') {
    const username = ctx.from?.username || 'Anonymous';
    await ctx.reply(`Hello @${username}! Use /start to begin.`);
  }
});
