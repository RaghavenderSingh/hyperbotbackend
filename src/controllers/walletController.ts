import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { WalletRequest } from '../types';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { LanguageCodes } from 'grammy/types';

const prisma = new PrismaClient();
const connection = new Connection(clusterApiUrl('devnet'));
export const wallet = async (req: Request, res: Response) => {
  try {
    console.log('wallet', req.body);
    const { username }: WalletRequest = req.body;
    console.log('userId', username);
    const user = await prisma.user.findUnique({
      where: { username: username },
    });
    const pubKey = new PublicKey(user?.publicKey!);
    const balance = await connection.getBalance(pubKey);
    console.log('balance', balance);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Message signed successfully',
      publicKey: user.publicKey,
      balance: balance / LAMPORTS_PER_SOL,
    });
  } catch (error) {
    console.error('Signing error:', error);
    res.status(500).json({
      message: 'Error signing message',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
