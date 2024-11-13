import { PrismaClient } from '@prisma/client';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'cross-fetch';
import { Wallet } from '@project-serum/anchor';
import bs58 from 'bs58';

const prisma = new PrismaClient();
const connection = new Connection(
  'https://mainnet.helius-rpc.com/?api-key=301c6d14-7187-4cc7-bb4f-5ffbf87bd760',
  'confirmed',
);

function getKeypairFromPrivateKey(privateKeyString: string) {
  try {
    const privateKeyBytes = bs58.decode(privateKeyString);
    console.log('', Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes)));
    return Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes));
  } catch (e) {
    console.error('Private key processing error:', e);
  }
}

export async function swap(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number,
  publicKey: string,
) {
  try {
    const url = new URL('https://quote-api.jup.ag/v6/quote');
    url.searchParams.append('inputMint', inputMint);
    url.searchParams.append('outputMint', outputMint);
    url.searchParams.append('amount', '100000000');
    url.searchParams.append('slippageBps', slippage.toString());
    url.searchParams.append('platformFeeBps', '20');
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Error fetching quote: ${response.statusText}`);
    }
    const user = await prisma.user.findFirst({
      where: {
        publicKey: publicKey,
      },
    });
    console.log('user', user?.privateKey);
    if (!user) {
      throw new Error('User not found');
    }
    const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(user?.privateKey!.toString())));
    console.log('wallet', wallet);
    const quoteResponse = await response.json();
    console.log('quoteResponse', quoteResponse);
    const { swapTransaction } = await (
      await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          feeAccount: 'GYBSePBkMpdswyfomjR8fF3TG3Ucq2TFs8qDbTKGD6yr',
        }),
      })
    ).json();

    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    console.log('swapTransactionBuf', swapTransactionBuf);
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    console.log('transaction', transaction);

    transaction.sign([wallet.payer]);
    const latestBlockHash = await connection.getLatestBlockhash();
    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });
    console.log(`https://solscan.io/tx/${txid}`);
  } catch (error) {
    // Catch any errors that occur during the fetch request or JSON parsing
    // Log the error to the console
    console.error('Failed to get quote:', error);
  }
}
