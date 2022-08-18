import { ButtonInteraction, EmbedBuilder, TextChannel } from 'discord.js';
import { ButtonComponent, Discord } from 'discordx';
import { container } from 'tsyringe';
import { modReply } from '../../lib/cmd/ModHelper';
import { CubeStorage } from '../../lib/db/Storage';
import { EmoteCache } from '../../lib/emote/EmoteCache';

@Discord()
export abstract class ButtonResponder {
  @ButtonComponent({ id: 'mod-action-confirm' })
  async modActionConfirm(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const emoteCache = container.resolve(EmoteCache);
    const actionsDB = container.resolve(CubeStorage).pendingModActions;
    const blockedChannels = container.resolve(CubeStorage).blockedChannels;

    const msgActions = await actionsDB.get(interaction.message.id);

    if (msgActions) {
      // perform the actions
      const embeds : EmbedBuilder[] = [];

      for (const action of msgActions) {
        if (action.glob) {
          await emoteCache.modifyBlockedEmoji(action.glob, action.guildId, action.blocked, true);
          embeds.push(
            await modReply(interaction, interaction.guild?.name ?? 'none', true, `glob: \`${action.glob}\` ${action.blocked ? 'blocked' : 'unblocked'}`, '', interaction.guildId ?? '', false
            ));
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
              embeds.push(
                await modReply(interaction, interaction.guild?.name ?? 'none', true, `channel #${chan.name} blocked`, '', interaction.guildId ?? '', false));
            } else {
              await blockedChannels.delete(action.channelId);
              embeds.push(
                await modReply(interaction, interaction.guild?.name ?? 'none', true, `channel #${chan.name} unblocked`, '', interaction.guildId ?? '', false));
            }
          }
        }
      }

      // send out 10 embeds max
      await interaction.editReply({
        embeds: embeds.slice(0, 9)
      });
    }
  }
}
