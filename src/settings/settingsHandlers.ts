import { Context, SessionFlavor } from 'grammy';
import { SessionData, BotSettings } from '../types';
import { handleSettings } from './settingsManager';
import { close } from 'fs';

export const settingsHandlers = {
  toggle_announcements: async (
    ctx: Context & SessionFlavor<SessionData>,
    settings: BotSettings,
  ) => {
    settings.announcements = !settings.announcements;
    await handleSettings(ctx, settings);
  },

  toggle_auto_buy: async (ctx: Context & SessionFlavor<SessionData>, settings: BotSettings) => {
    settings.autoBuy.enabled = !settings.autoBuy.enabled;
    await handleSettings(ctx, settings);
  },

  edit_auto_buy_amount: async (ctx: Context & SessionFlavor<SessionData>) => {
    ctx.session.step = 'awaiting_auto_buy_amount';
    await ctx.reply('Please enter the new auto buy amount in SOL:');
  },

  edit_min_position: async (ctx: Context & SessionFlavor<SessionData>) => {
    ctx.session.step = 'awaiting_min_position';
    await ctx.reply('Please enter the new minimum position value in SOL:');
  },

  edit_sell_slippage: async (ctx: Context & SessionFlavor<SessionData>) => {
    ctx.session.step = 'awaiting_sell_slippage';
    await ctx.reply('Please enter the new sell slippage percentage:');
  },
  edit_buy_slippage: async (ctx: Context & SessionFlavor<SessionData>) => {
    ctx.session.step = 'awaiting_buy_slippage';
    await ctx.reply('Please enter the new buy slippage percentage:');
  },
  edit_max_price_impact: async (ctx: Context & SessionFlavor<SessionData>) => {
    ctx.session.step = 'awaiting_max_price_impact';
    await ctx.reply('Please enter the new max price impact percentage:');
  },
  close: async (ctx: Context & SessionFlavor<SessionData>) => {
    await ctx.deleteMessage();
    await ctx.answerCallbackQuery();
  },

  toggle_mev_protect: async (ctx: Context & SessionFlavor<SessionData>, settings: BotSettings) => {
    const mevLevels: Array<BotSettings['mevProtect']> = ['TURBO', 'STANDARD', 'OFF'];
    const currentIndex = mevLevels.indexOf(settings.mevProtect);
    settings.mevProtect = mevLevels[(currentIndex + 1) % mevLevels.length];
    await handleSettings(ctx, settings);
  },

  toggle_priority: async (ctx: Context & SessionFlavor<SessionData>, settings: BotSettings) => {
    const priorities: Array<'Low' | 'Medium' | 'High'> = ['Low', 'Medium', 'High'];
    const currentIndex = priorities.indexOf(settings.transactionPriority.level);
    settings.transactionPriority.level = priorities[(currentIndex + 1) % priorities.length];
    await handleSettings(ctx, settings);
  },
};
