import { Bot, Context, session, SessionFlavor } from 'grammy';
import { ParseMode } from 'grammy/types';
import { config } from '../config/environment';
import { SessionData, BotSettings } from '../types';
import { defaultSettings } from '../settings/defaultSettings';
import { settingsHandlers } from '../settings/settingsHandlers';
import { handleSettings, handleSettingsInput } from '../settings/settingsManager';
import axios from 'axios';
import { swap } from '../swap/jupSwap';

type BotContext = Context & SessionFlavor<SessionData>;

interface MessageOptions {
  parse_mode: ParseMode;
  reply_markup: {
    inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
  };
}

const API_BASE_URL = 'http://localhost:3000/api/v1';
const SOL_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';

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

const generateWalletInfoMessage = (publicKey: string, balance: number) => `
<b>Your Wallet Info</b>

Address: <code>${publicKey}</code>
Balance: ${balance} SOL

Last updated: ${new Date().toLocaleTimeString()}

Tap to copy the address and send SOL to deposit.`;

const getWalletInfoKeyboard = (): MessageOptions['reply_markup'] => ({
  inline_keyboard: [
    [
      { text: 'Refresh', callback_data: 'refresh' },
      { text: 'Close', callback_data: 'close' },
    ],
  ],
});

const getMessageOptions = (keyboard: MessageOptions['reply_markup']): MessageOptions => ({
  parse_mode: 'HTML',
  reply_markup: keyboard,
});
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
    const response = await axios.post(`${API_BASE_URL}/wallet`, {
      username: ctx.from?.username,
    });

    const message = generateWalletInfoMessage(response.data.publicKey, response.data.balance);
    const options = getMessageOptions(getWalletInfoKeyboard());

    if (ctx.callbackQuery.message) {
      await ctx.reply(message, options);
    } else {
      await ctx.reply(message, options);
    }
  } catch (error) {
    console.error('Error in refresh handler:', error);
    await ctx.answerCallbackQuery('Error refreshing wallet info. Please try again.');
  }
});

bot.callbackQuery('wallet', async (ctx) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/wallet`, {
      username: ctx.from?.username,
    });

    const message = generateWalletInfoMessage(response.data.publicKey, response.data.balance);
    const options = getMessageOptions({
      inline_keyboard: [[{ text: 'close', callback_data: 'close' }]],
    });

    await ctx.reply(message, options);
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
bot.command('start', async (ctx) => {
  const telegramUsername = ctx.from?.username;

  if (!telegramUsername) {
    await ctx.reply(
      'You need to have a Telegram username to use this bot. Please set up a username in your Telegram settings and try again.',
    );
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
      username: telegramUsername,
    });

    const welcomeMessage = `
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
key we can't protect you!`;

    const mainKeyboard: MessageOptions['reply_markup'] = {
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
    };

    const options = getMessageOptions(mainKeyboard);
    await ctx.reply(welcomeMessage, options);
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
  if (ctx.session.step === 'awaiting_buy_token_address' && ctx.message.text) {
    try {
      const tokenAddress = ctx.message.text.trim();
      console.log(tokenAddress);

      if (!/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(tokenAddress)) {
        await ctx.reply(
          'Invalid token address format. Please provide a valid Solana token address.',
        );
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/wallet`, {
        username: ctx.from?.username,
      });
      const swapResponse = await swap(
        SOL_TOKEN_ADDRESS,
        tokenAddress,
        10,
        500,
        response.data.publicKey,
      );
      await ctx.reply(
        `Swap initiated!\nSwapping SOL for token: ${tokenAddress}\nPlease wait for confirmation...`,
      );
      ctx.session.step = 'idle';

      // if (swapResponse) {
      //   await ctx.reply('Swap completed successfully!');
      // }
    } catch (error) {
      console.error('Error in swap handler:', error);
      await ctx.reply('Error occurred while processing the swap. Please try again.');
      ctx.session.step = 'idle';
    }
    return;
  }
  if (ctx.session.step !== 'idle') {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const settings = userSettings.get(userId) || defaultSettings;
    await handleSettingsInput(ctx, settings);
    userSettings.set(userId, settings);
    return;
  }
});
