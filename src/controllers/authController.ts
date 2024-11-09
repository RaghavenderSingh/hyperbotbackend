import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Keypair } from '@solana/web3.js';
import { SignupRequest, SigninRequest } from '../types';

const prisma = new PrismaClient();

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, password }: SignupRequest = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    // If user exists, redirect to signin endpoint with the username
    if (existingUser) {
      return signin(req, res);
    }

    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = Buffer.from(keypair.secretKey).toString('base64');

    const user = await prisma.user.create({
      data: {
        username,
        publicKey,
        privateKey
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      userId: user.id,
      publicKey: user.publicKey
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      message: 'Error creating user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { username }: SigninRequest = req.body;

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username' });
    }

    res.status(200).json({
      message: 'Login successful',
      userId: user.id,
      publicKey: user.publicKey
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      message: 'Error signing in',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};