import { Router } from 'express';
import { wallet } from '../controllers/walletController';

export const walletRouter = Router();

walletRouter.post('/', wallet);
