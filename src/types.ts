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
  step: 'idle' | 'awaiting_username';
  username?: string;
}
export interface WalletRequest {
  username: string;
}
