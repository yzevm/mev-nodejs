import type { TransactionResponse } from '@ethersproject/abstract-provider';

import { provider, universalRouterAddress } from '../constants';
import { match } from '../utils';

export class InitialChecker {
  async filter(txHash: string): Promise<TransactionResponse> {
    let transaction = null;

    try {
      transaction = await provider.getTransaction(txHash);

      // Sometimes tx is null for some reason
      if (transaction === null) {
        return;
      }
    } catch {
      return;
    }

    // try {
    //   const txRecp = await provider.getTransactionReceipt(txHash);

    //   // Make sure transaction hasn't been mined
    //   if (txRecp !== null) {
    //     return;
    //   }
    // } catch {
    //   return;
    // }

    // We're not a generalized version
    // So we're just gonna listen to specific addresses
    // and decode the data from there
    if (!match(transaction.to, universalRouterAddress)) {
      return;
    }

    return transaction;
  }
}
