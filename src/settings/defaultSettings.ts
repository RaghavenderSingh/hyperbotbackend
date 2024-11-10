import { BotSettings } from '../types';

export const defaultSettings: BotSettings = {
  announcements: true,
  minPositionValue: 0.001,
  autoBuy: {
    enabled: false,
    amount: 5.0,
  },
  buyButtonConfig: {
    leftPercentage: 25,
    rightPercentage: 100,
  },
  slippage: {
    buy: 10,
    sell: 10,
    maxPriceImpact: 15,
  },
  mevProtect: 'TURBO',
  transactionPriority: {
    level: 'Medium',
    fee: 0.001,
  },
};
