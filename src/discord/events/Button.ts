import { ButtonInteraction, MessageEmbed, TextChannel } from 'discord.js';
import { ButtonComponent, Discord } from 'discordx';
import { container } from 'tsyringe';
import { CubeStorage } from '../../lib/db/Storage';
import { EmoteCache } from '../../lib/emote/EmoteCache';

@Discord()
export abstract class ButtonResponder {
  @ButtonComponent('mod-action-confirm')
  async modActionConfirm(interaction: ButtonInteraction) {
    const emoteCache = container.resolve(EmoteCache);
    const actionsDB = container.resolve(CubeStorage).pendingModActions;
    const blockedChannels = container.resolve(CubeStorage).blockedChannels;

    const msgActions = await actionsDB.get(interaction.id);

    if (msgActions) {
      // perform the actions
      for (const action of msgActions) {
        if (action.glob) {
          await emoteCache.modifyBlockedEmoji(action.glob, action.guildId);
        }
        if (action.channelId) {
          const chan = interaction.client.channels.resolve(action.channelId);

          if (chan instanceof TextChannel) {
            if (action.blocked) {
              await blockedChannels.set(action.channelId, {
                channelName: chan.name,
                guildId: action.guildId,
                guildName: action.guildName
              });
            } else {
              await blockedChannels.delete(action.channelId);
            }
          }
        }
        await interaction.reply({
          embeds: [
            new MessageEmbed({ title: 'Actions completed!', color: 'GREEN' })
          ],
          ephemeral: true
        });
      }
    }
  }
}
