/* eslint-disable max-len */
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';

import { flashbotsUrl, provider, signingWallet, wsProvider } from './src/constants';
import { Decoder } from './src/stages/Decoder';
import { Flashbots } from './src/stages/Flashbots';
import { InitialChecker } from './src/stages/InitialChecker';
import { Simulator } from './src/stages/Simulator';
import { TransactionBuilder } from './src/stages/TransactionBuilder';
import { logger } from './src/utils';

class App {
  private readonly initialChecker = new InitialChecker();

  private readonly decoder = new Decoder();

  private readonly transactionBuilder = new TransactionBuilder();

  private simulator: Simulator;

  private flashbots: Flashbots;

  private flashBotsProvider: FlashbotsBundleProvider;

  public async init() {
    this.flashBotsProvider = await FlashbotsBundleProvider.create(provider, signingWallet, flashbotsUrl);

    this.simulator = new Simulator(this.flashBotsProvider);
    this.flashbots = new Flashbots(this.flashBotsProvider);

    wsProvider.on('pending', (tx) => {
      // const tx = '0x772110a73560a41e70c784b0668d5497011749cac5ed83555c530d98412b065a'; // '0xdd2278de8083515e41a4fba94b6a5e3171568cdf18e217a69aee334742de301a'; // '0x9d41c54a663d04bf7a321f003df63a1663c71839127afac169ca4322ef67485b';
      void this.handleTransaction(tx);
    });

    logger.info({ msg: 'App is up' });
  }

  private async handleTransaction(txHash: string): Promise<void> {
    const transaction = await this.initialChecker.filter(txHash);

    if (!transaction) {
      return;
    }

    logger.info({ msg: 'decode tx', txHash });
    const decodedData = await this.decoder.decode(transaction);

    if (!decodedData) {
      return;
    }

    logger.info({ msg: 'build tx', txHash });
    const txArray = await this.transactionBuilder.build(transaction, decodedData);

    if (!txArray) {
      return;
    }

    const blockNumber = await provider.getBlockNumber();
    const nextBlock = blockNumber + 1;

    logger.info({ msg: 'simulate tx', txHash });
    const signedTransactions = await this.simulator.simulate(txArray, nextBlock);

    if (!signedTransactions) {
      return;
    }

    await this.flashbots.sendBundle(signedTransactions, nextBlock);
  }
}

void new App().init();
