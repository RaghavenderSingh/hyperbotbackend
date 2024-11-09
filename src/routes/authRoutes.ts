import { Router } from 'express';
import { signup, signin } from '../controllers/authController';
import { validateAuthRequest } from '../middleware/validator';

export const authRouter = Router();

authRouter.post('/signup', validateAuthRequest, signup);
authRouter.post('/signin', validateAuthRequest, signin);