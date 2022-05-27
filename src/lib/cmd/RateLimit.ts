// Rate limit spammy commands on channels/threads located in
// Big Server Mode

import dayjs from 'dayjs';
import { Message } from 'discord.js';
import { container } from 'tsyringe';
import { Milliseconds } from '../constants/Units';
import { CubeStorage } from '../db/Storage';
import { CubeLogger } from '../logger/CubeLogger';

export class RateLimit {
  private storage = container.resolve(CubeStorage).timeouts;
  private logger = container.resolve(CubeLogger).command;

  /**
   * Check if a rate limit is set as well
   * as set a new rate limit for the channel
   * which is used to determine whether to DM the rescale/edit or
   * send it in the channel
   * @param channelID discord channel ID
   * @param message the discord message
   * @returns true if limit set, false if limit not set
   */
  async limitCheck (channelID: string, message: Message) {
    const limit = await this.getLimit(channelID);
    await this.setNewLimit(channelID);
    // this check ensures that the user can't just react to a super old message
    // to spam the channel and produce a mystery edit
    if (message.createdAt > dayjs().add(2, 'min').toDate() ||
      (limit && Date.now() < limit.ends)) {
      return true;
    }
    return false;
  }

  /**
   * @param channelID discord channel ID
   * @returns the rate limit or undefined if one is not defined
   */
  private async getLimit (channelID: string) {
    return await this.storage.get(channelID);
  }

  /**
   * sets a new rate limit value in storage
   * initially set to a 5 second timeout, if a user hits the rate limit
   * then that timeout value will be incremented by 1 and subsequently saved
   * @param channelID
   */
  private async setNewLimit (channelID: string) {
    const curLimit = await this.getLimit(channelID);
    if (curLimit) {
      const newLimit = Date.now() + (curLimit.multiple * Milliseconds.sec);
      await this.storage.set(channelID, {
        ends: newLimit,
        multiple: curLimit.multiple + 1
      });
    } else {
      const newLimit = Date.now() + (5 * Milliseconds.sec);
      await this.storage.set(channelID, {
        ends: newLimit,
        multiple: 5
      });
    }
  }
}
