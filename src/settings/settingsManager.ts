import { Context, SessionFlavor } from 'grammy';
import { SessionData, BotSettings } from '../types';

export async function handleSettings(
  ctx: Context & SessionFlavor<SessionData>,
  settings: BotSettings,
) {
  const getStatusEmoji = (enabled: boolean) => (enabled ? '🟢' : '🔴');

  const buildSettingsMessage = (settings: BotSettings) => `
<b>Settings:</b>      

<b>GENERAL SETTINGS</b>
<b>HYPERbot Announcements</b>: Occasional announcements. Tap to toggle.
`;

  const buildSettingsKeyboard = (settings: BotSettings) => ({
    inline_keyboard: [
      [{ text: '---GENERAL SETTINGS---', callback_data: 'none' }],
      [
        {
          text: `${getStatusEmoji(settings.announcements)} Announcements`,
          callback_data: 'toggle_announcements',
        },
        {
          text: `✎Min Pos Value $${settings.minPositionValue}`,
          callback_data: 'edit_min_position',
        },
      ],
      [{ text: '---AUTO BUY---', callback_data: 'none' }],
      [
        {
          text: `${getStatusEmoji(settings.autoBuy.enabled)} ${
            settings.autoBuy.enabled ? 'Enabled' : 'Disabled'
          }`,
          callback_data: 'toggle_auto_buy',
        },
        {
          text: `✎ ${settings.autoBuy.amount.toFixed(2)} SOL`,
          callback_data: 'edit_auto_buy_amount',
        },
      ],
      [{ text: '---BUY BUTTON CONFIG---', callback_data: 'none' }],
      [
        {
          text: `✎ LEFT: ${settings.buyButtonConfig.leftPercentage}%`,
          callback_data: 'edit_left_percentage',
        },
        {
          text: `✎ RIGHT: ${settings.buyButtonConfig.rightPercentage}%`,
          callback_data: 'edit_right_percentage',
        },
      ],
      [{ text: '---SLIPPAGE CONFIG---', callback_data: 'none' }],
      [
        {
          text: `✎ BUY: ${settings.slippage.buy}%`,
          callback_data: 'edit_buy_slippage',
        },
        {
          text: `✎ SELL: ${settings.slippage.sell}%`,
          callback_data: 'edit_sell_slippage',
        },
      ],
      [
        {
          text: `✎ Max Price Impact: ${settings.slippage.maxPriceImpact}%`,
          callback_data: 'edit_max_price_impact',
        },
      ],
      [{ text: '---MEV PROTECT---', callback_data: 'none' }],
      [{ text: `⇄${settings.mevProtect}`, callback_data: 'toggle_mev_protect' }],
      [{ text: '---TRANSACTION PRIORITY---', callback_data: 'none' }],
      [
        {
          text: `⇄${settings.transactionPriority.level}`,
          callback_data: 'toggle_priority',
        },
        {
          text: `✎ ${settings.transactionPriority.fee.toFixed(5)} SOL`,
          callback_data: 'edit_priority_fee',
        },
      ],
      [{ text: 'Close', callback_data: 'close' }],
    ],
  });

  if ('callbackQuery' in ctx && ctx.callbackQuery?.message) {
    await ctx.editMessageText(buildSettingsMessage(settings), {
      parse_mode: 'HTML',
      reply_markup: buildSettingsKeyboard(settings),
    });
  } else {
    await ctx.reply(buildSettingsMessage(settings), {
      parse_mode: 'HTML',
      reply_markup: buildSettingsKeyboard(settings),
    });
  }
}

export async function handleSettingsInput(
  ctx: Context & SessionFlavor<SessionData>,
  settings: BotSettings,
): Promise<void> {
  if (!ctx.message?.text) {
    await ctx.reply('Please send a text message with your setting value.');
    return;
  }

  const input = parseFloat(ctx.message.text);
  if (isNaN(input)) {
    await ctx.reply('Please enter a valid number.');
    return;
  }

  let confirmationMessage = '';
  let isValid = false;

  switch (ctx.session.step) {
    case 'awaiting_auto_buy_amount':
      if (input <= 0) {
        confirmationMessage = 'Please enter a positive amount.';
      } else {
        settings.autoBuy.amount = input;
        confirmationMessage = `Auto buy amount updated to ${input} SOL`;
        isValid = true;
      }
      break;

    case 'awaiting_min_position':
      if (input <= 0) {
        confirmationMessage = 'Please enter a positive amount.';
      } else {
        settings.minPositionValue = input;
        confirmationMessage = `Minimum position value updated to $${input}`;
        isValid = true;
      }
      break;

    case 'awaiting_buy_slippage':
      if (input < 0 || input > 100) {
        confirmationMessage = 'Please enter a valid percentage between 0 and 100.';
      } else {
        settings.slippage.buy = input;
        confirmationMessage = `Buy slippage updated to ${input}%`;
        isValid = true;
      }
      break;

    case 'awaiting_sell_slippage':
      if (input < 0 || input > 100) {
        confirmationMessage = 'Please enter a valid percentage between 0 and 100.';
      } else {
        settings.slippage.sell = input;
        confirmationMessage = `Sell slippage updated to ${input}%`;
        isValid = true;
      }
      break;

    case 'awaiting_max_price_impact':
      if (input < 0 || input > 100) {
        confirmationMessage = 'Please enter a valid percentage between 0 and 100.';
      } else {
        settings.slippage.maxPriceImpact = input;
        confirmationMessage = `Max price impact updated to ${input}%`;
        isValid = true;
      }
      break;

    default:
      break;
  }

  if (isValid) {
    ctx.session.step = 'idle';
    await ctx.reply(confirmationMessage, { reply_markup: { remove_keyboard: true } });
    await handleSettings(ctx, settings);
  } else {
    await ctx.reply(confirmationMessage);
  }
}
