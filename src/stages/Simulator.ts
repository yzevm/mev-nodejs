import type { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';

import type { BundleSignedTx, BundleTx } from './TransactionBuilder';

export class Simulator {
  private flashBotsProvider: FlashbotsBundleProvider;

  constructor(flashBotsProvider: FlashbotsBundleProvider) {
    this.flashBotsProvider = flashBotsProvider;
  }

  public async simulate(transactionArray: Array<BundleTx | BundleSignedTx>, nextBlock: number): Promise<string[]> {
    const signedTransactions = await this.flashBotsProvider.signBundle(transactionArray);
    const simulation = await this.flashBotsProvider.simulate(signedTransactions, nextBlock);

    // @ts-expect-error skip
    if (simulation.firstRevert) {
      // @ts-expect-error skip
      return console.error('Simultation firstRevert', simulation.firstRevert);
    }

    // @ts-expect-error skip
    if (simulation.error) {
      // @ts-expect-error skip
      return console.error('Simultation error', simulation.error);
    }

    console.info('Simulation succes', simulation);

    return signedTransactions;
  }
}
