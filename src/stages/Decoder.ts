import type { TransactionResponse } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';

import { uniswapV3Interface, wethAddress } from '../constants';
import { match } from '../utils';

export interface DecodeResponse {
  amountIn: ethers.BigNumber;
  minAmountOut: ethers.BigNumber;
  tokenToCapture: '0xf6649e719394ffacdac6bf1fedf973ef9a2aa123';
}

export class Decoder {
  async decode(transaction: TransactionResponse): Promise<DecodeResponse> {
    try {
      const decoded = uniswapV3Interface.parseTransaction(transaction);

      if (!decoded.args.commands.includes('08')) {
        return;
      } // only uniswap v2

      const swapPositionInCommands = decoded.args.commands.slice(2).indexOf('08'); // 2

      const inputPosition =
        decoded.args.inputs.length === 1
          ? decoded.args.inputs[swapPositionInCommands]
          : decoded.args.inputs[swapPositionInCommands - 1];
      const decodedSwap = this.decodeUniversalRouterSwap(inputPosition);

      if (!decodedSwap.hasTwoPath) {
        return;
      } // only direct swap for now

      if (decodedSwap.recipient === 2) {
        return;
      } // token for ETH, only ETH to token for now

      if (!match(decodedSwap.path[0], wethAddress)) {
        return;
      }

      return {
        amountIn: transaction.value.toString() === '0' ? decodedSwap.amountIn : transaction.value,
        minAmountOut: decodedSwap.minAmountOut,
        tokenToCapture: decodedSwap.path[1],
      };
    } catch (error) {
      console.error(error);
    }
  }

  private decodeUniversalRouterSwap(input) {
    const abiCoder = new ethers.utils.AbiCoder();
    const decodedPatameters = abiCoder.decode(['address', 'uint256', 'uint256', 'bytes', 'bool'], input);
    const breakdown = input.slice(2).match(/.{1,64}/g);
    let path = [];
    let hasTwoPath = true;

    if (breakdown.length !== 9) {
      // multiple token swap
      const pathOne = `0x${breakdown[breakdown.length - 2].slice(24)}`;
      const pathTwo = `0x${breakdown[breakdown.length - 1].slice(24)}`;
      path = [pathOne, pathTwo];
    } else {
      hasTwoPath = false;
    }

    return {
      recipient: Number.parseInt(decodedPatameters[0], 16),
      amountIn: decodedPatameters[1],
      minAmountOut: decodedPatameters[2],
      path,
      hasTwoPath,
    };
  }
}
