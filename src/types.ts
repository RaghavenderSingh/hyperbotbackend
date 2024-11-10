import exp from 'constants';

export interface SignupRequest {
  username: string;
  password: string;
}

export interface SigninRequest {
  username: string;
  password: string;
}

export interface SignRequest {
  userId: string;
  message: string;
}

export interface ApiResponse {
  message: string;
  userId?: string;
  publicKey?: string;
  error?: string;
}

export interface SessionData {
  step:
    | 'idle'
    | 'awaiting_username'
    | 'awaiting_auto_buy_amount'
    | 'awaiting_buy_slippage'
    | 'awaiting_sell_slippage'
    | 'awaiting_max_price_impact'
    | 'awaiting_min_position';
  username?: string;
}
export interface WalletRequest {
  username: string;
}
export interface BotSettings {
  announcements: boolean;
  minPositionValue: number;
  autoBuy: {
    enabled: boolean;
    amount: number;
  };
  buyButtonConfig: {
    leftPercentage: number;
    rightPercentage: number;
  };
  slippage: {
    buy: number;
    sell: number;
    maxPriceImpact: number;
  };
  mevProtect: 'TURBO' | 'STANDARD' | 'OFF';
  transactionPriority: {
    level: 'Low' | 'Medium' | 'High';
    fee: number;
  };
}
