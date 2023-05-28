/* eslint-disable @typescript-eslint/naming-convention */
import type { TransactionResponse } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';

import {
  erc20Factory,
  factoryUniswap,
  signingWallet,
  uniswapPairFactory,
  uniswapV2Router,
  uniswapV2RouterAddress,
  wethAddress,
} from '../constants';
import type { DecodeResponse } from './Decoder';

export interface BundleTx {
  signer: ethers.Wallet;
  transaction: ethers.PopulatedTransaction;
}

export interface BundleSignedTx {
  signedTransaction: string;
}

const chainId = 5;
const gasLimit = 300_000;
const bribeToMiners = ethers.utils.parseUnits('50', 'gwei');
const buyAmount = ethers.utils.parseEther('0.0005');

export class TransactionBuilder {
  private readonly deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20mins

  public async build(
    transaction: TransactionResponse,
    data: DecodeResponse,
  ): Promise<Array<BundleTx | BundleSignedTx> | null> {
    const { amountIn, tokenToCapture } = data; // amountIn - victim's ETH

    const pairAddress = await factoryUniswap.callStatic.getPair(wethAddress, tokenToCapture);
    const pair = uniswapPairFactory.attach(pairAddress);
    const reserves = await pair.callStatic.getReserves();

    let a: ethers.BigNumber;
    let b: ethers.BigNumber;

    if (wethAddress < tokenToCapture) {
      a = reserves._reserve0;
      b = reserves._reserve1;
    } else {
      a = reserves._reserve1;
      b = reserves._reserve0;
    }

    const maxGasFee = transaction.maxFeePerGas ? transaction.maxFeePerGas.add(bribeToMiners) : bribeToMiners;
    const priorityFee = transaction.maxPriorityFeePerGas.add(bribeToMiners);

    // mevbot's tokens after buying
    const firstAmoutOut = await uniswapV2Router.callStatic.getAmountOut(buyAmount, a, b);
    const updatedReserve0 = a.add(buyAmount);
    const updatedReserve1 = b.add(firstAmoutOut);

    // victim's tokens after buying
    const secondBuyAmount = await uniswapV2Router.callStatic.getAmountOut(amountIn, updatedReserve0, updatedReserve1);
    // 1 ETH -> 13 USDT => price 0.01
    // buy 0.05 ETH -> 10 USDT => price 0.011
    //

    if (secondBuyAmount.lt(firstAmoutOut)) {
      console.error('Victim would get less than minimum');

      return null;
    }

    const updatedReserve0_2 = updatedReserve0.add(amountIn);
    const updatedReserve1_2 = updatedReserve1.add(secondBuyAmount);

    // How much ETH we get at the end
    const thirdAmountOut = await uniswapV2Router.callStatic.getAmountOut(
      firstAmoutOut,
      updatedReserve1_2,
      updatedReserve0_2,
    );

    // Prepare 1st transaction
    const firstTransaction: BundleTx = {
      signer: signingWallet,
      transaction: await uniswapV2Router.populateTransaction.swapExactETHForTokens(
        firstAmoutOut,
        [wethAddress, tokenToCapture],
        signingWallet.address,
        this.deadline,
        {
          value: buyAmount,
          type: 2,
          maxFeePerGas: maxGasFee,
          maxPriorityFeePerGas: priorityFee,
          gasLimit,
        },
      ),
    };
    firstTransaction.transaction = { ...firstTransaction.transaction, chainId };

    // Prepare 2nd transaction
    const victimsTransactionsWithChainId = { ...transaction, chainId };
    delete victimsTransactionsWithChainId.gasPrice;
    const signedMiddleTransaction: BundleSignedTx = {
      signedTransaction: ethers.utils.serializeTransaction(victimsTransactionsWithChainId, {
        r: victimsTransactionsWithChainId.r,
        s: victimsTransactionsWithChainId.s,
        v: victimsTransactionsWithChainId.v,
      }),
    };

    // Prepare 3rd transaction for approval
    const erc20 = erc20Factory.attach(tokenToCapture);
    const thirdTransaction: BundleTx = {
      signer: signingWallet,
      transaction: await erc20.populateTransaction.approve(uniswapV2RouterAddress, ethers.constants.MaxUint256, {
        value: '0',
        type: 2,
        maxFeePerGas: maxGasFee,
        maxPriorityFeePerGas: priorityFee,
        gasLimit,
      }),
    };
    thirdTransaction.transaction = { ...thirdTransaction.transaction, chainId };

    // Prepare 4th transaction to swap tokens to ETH
    const fourthTransaction: BundleTx = {
      signer: signingWallet,
      transaction: await uniswapV2Router.populateTransaction.swapExactTokensForETH(
        firstAmoutOut,
        thirdAmountOut,
        [tokenToCapture, wethAddress],
        signingWallet.address,
        this.deadline,
        {
          value: '0',
          type: 2,
          maxFeePerGas: maxGasFee,
          maxPriorityFeePerGas: priorityFee,
          gasLimit,
        },
      ),
    };
    fourthTransaction.transaction = { ...fourthTransaction.transaction, chainId };

    return [firstTransaction, signedMiddleTransaction, thirdTransaction, fourthTransaction];
  }
}
