import type { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import { FlashbotsBundleResolution } from '@flashbots/ethers-provider-bundle';

import { logger } from '../utils';

export class Flashbots {
  private flashBotsProvider: FlashbotsBundleProvider;

  constructor(flashBotsProvider: FlashbotsBundleProvider) {
    this.flashBotsProvider = flashBotsProvider;
  }

  public async sendBundle(signedTransactions, nextBlock: number) {
    // send txs with flashbots
    const bundleSubmition = await this.flashBotsProvider.sendRawBundle(signedTransactions, nextBlock);

    // @ts-expect-error skip
    logger.info({ msg: 'Bundle submitted', bundleHash: bundleSubmition.bundleHash });
    // @ts-expect-error skip
    const bundleWaitResponse = await bundleSubmition.wait();
    logger.info({ msg: 'Wait response', resp: FlashbotsBundleResolution[bundleWaitResponse] });

    if (bundleWaitResponse === FlashbotsBundleResolution.BundleIncluded) {
      console.warn('----------------------------------------');
      console.warn('-----------Bundle included--------------');
      console.warn('----------------------------------------');
    } else if (bundleWaitResponse === FlashbotsBundleResolution.AccountNonceTooHigh) {
      logger.info({ msg: 'Transaction has been confirmed already' });
    } else {
      try {
        // @ts-expect-error skip
        const bundleStats = await this.flashBotsProvider.getBundleStats(bundleSubmition.bundleHash, nextBlock);
        // @ts-expect-error skip
        const { isHighPriority, isSentToMiners, isSimulated } = bundleStats;
        logger.info({ isHighPriority, isSentToMiners, isSimulated });
      } catch {
        return null;
      }
    }
  }
}
