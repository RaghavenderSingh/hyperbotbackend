import { Router } from 'express';
import { signMessage } from '../controllers/signController';

export const signRouter = Router();

signRouter.post('/sign', signMessage);