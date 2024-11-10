import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import fetch from 'cross-fetch';

export async function getJupQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number,
) {
  const quoteResponse = await (
    await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${
        amount * LAMPORTS_PER_SOL
      }&slippageBps=${slippage}`,
    )
  ).json();
  console.log({ quoteResponse });
}
