import { PrismaClient } from '@prisma/client';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  VersionedTransaction,
  Keypair,
  clusterApiUrl,
} from '@solana/web3.js';
import bs58 from 'bs58';

interface UserWithPrivateKey {
  privateKey: string;
  publicKey: string;
}

class SwapError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SwapError';
  }
}

const prisma = new PrismaClient();
const RPC_ENDPOINTS = [clusterApiUrl('mainnet-beta'), 'https://api.mainnet-beta.solana.com'];

function getKeypairFromPrivateKey(privateKeyString: string): Keypair {
  try {
    try {
      const decoded = bs58.decode(privateKeyString);
      return Keypair.fromSecretKey(decoded);
    } catch (e) {
      const privateKeyBytes = Buffer.from(privateKeyString, 'base64');
      return Keypair.fromSecretKey(privateKeyBytes);
    }
  } catch (error) {
    throw new SwapError(
      `Failed to process private key: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INVALID_PRIVATE_KEY',
    );
  }
}

async function getWorkingConnection(): Promise<Connection> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, {
        commitment: 'processed',
        confirmTransactionInitialTimeout: 20000,
      });
      await connection.getSlot();
      return connection;
    } catch (error) {
      console.warn(`Failed to connect to ${endpoint}, trying next...`);
      continue;
    }
  }
  throw new SwapError('Unable to establish connection to any RPC endpoint', 'CONNECTION_ERROR');
}

async function checkTransactionStatus(
  connection: Connection,
  signature: string,
  timeout: number = 20000,
): Promise<{ status: 'success' | 'timeout' | 'error'; error?: string }> {
  return new Promise((resolve) => {
    let done = false;

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ status: 'timeout' });
      }
    }, timeout);

    const subscription = connection.onSignature(
      signature,
      (result, context) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          if (result.err) {
            resolve({ status: 'error', error: result.err.toString() });
          } else {
            resolve({ status: 'success' });
          }
        }
      },
      'processed',
    );

    setTimeout(() => {
      connection.removeSignatureListener(subscription);
    }, timeout);
  });
}

export async function swap(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number,
  publicKey: string,
) {
  try {
    if (!inputMint || !outputMint) {
      throw new SwapError('Input and output mint addresses are required', 'INVALID_MINT_ADDRESS');
    }

    if (amount <= 0) {
      throw new SwapError('Amount must be greater than 0', 'INVALID_AMOUNT');
    }

    if (slippage < 0 || slippage > 10000) {
      throw new SwapError('Slippage must be between 0 and 10000 basis points', 'INVALID_SLIPPAGE');
    }

    const user = (await prisma.user.findUnique({
      where: { publicKey: publicKey },
    })) as UserWithPrivateKey | null;

    if (!user) {
      throw new SwapError('User not found', 'USER_NOT_FOUND');
    }

    const signerKeypair = getKeypairFromPrivateKey(user.privateKey);
    const quoteResponse = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${
        amount * LAMPORTS_PER_SOL
      }&slippageBps=${slippage}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    ).then((res) => {
      if (!res.ok) {
        throw new SwapError(`Quote API error: ${res.status}`, 'QUOTE_ERROR');
      }
      return res.json();
    });
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: publicKey,
        wrapAndUnwrapSol: true,
      }),
    });

    if (!swapResponse.ok) {
      throw new SwapError(`Swap API error: ${swapResponse.status}`, 'SWAP_API_ERROR');
    }

    const swapData = await swapResponse.json();
    const swapTransaction = swapData.swapTransaction;

    if (!swapTransaction) {
      throw new SwapError('No swap transaction returned', 'SWAP_TRANSACTION_ERROR');
    }

    const connection = await getWorkingConnection();
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    const { blockhash } = await connection.getLatestBlockhash('processed');
    transaction.sign([signerKeypair]);
    const rawTransaction = transaction.serialize();

    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 3,
      preflightCommitment: 'processed',
    });
    const status = await checkTransactionStatus(connection, txid);
    return {
      success: true,
      txid,
      explorerUrl: `https://solscan.io/tx/${txid}`,
      status: status.status,
      error: status.error,
      message:
        status.status === 'timeout'
          ? 'Transaction submitted but confirmation timed out. Check explorer for final status.'
          : undefined,
    };
  } catch (error) {
    console.error('Swap failed:', error);

    if (error instanceof SwapError) {
      throw error;
    }

    throw new SwapError(
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN_ERROR',
    );
  }
}
