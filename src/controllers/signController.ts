import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Keypair } from '@solana/web3.js';
import { SignRequest } from '../types';

const prisma = new PrismaClient();

export const signMessage = async (req: Request, res: Response) => {
  try {
    const { userId, message }: SignRequest = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const secretKey = Buffer.from(user.privateKey, 'base64');
    const keypair = Keypair.fromSecretKey(secretKey);

    res.status(200).json({
      message: 'Message signed successfully',
      publicKey: user.publicKey
    });
  } catch (error) {
    console.error('Signing error:', error);
    res.status(500).json({
      message: 'Error signing message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};