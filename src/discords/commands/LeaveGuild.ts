import { ButtonInteraction, CommandInteraction, Guild, MessageActionRow, MessageButton } from 'discord.js'
import { ButtonComponent, Discord, Permission, Slash, SlashOption } from 'discordx'

@Discord()
@Permission(false)
@Permission({ id: '170358606590377984', type: 'USER', permission: true })
export abstract class LeaveGuild {
  resolved: Guild | null = null

  @Slash('leaveguild', { description: 'Leave a guild' })
  async leaveGuild (
    @SlashOption('id', { description: 'id of the guild to leave', required: false })
      id: string,
      interaction: CommandInteraction
  ) {
    await interaction.deferReply()
    if (id === undefined) {
      // just print out list of guilds we are in
      const reply: string[] = []
      const guilds = await interaction.client.guilds.fetch()
      guilds.forEach(guild => {
        reply.push(guild.name)
        reply.push(' -> ')
        reply.push(guild.id)
        reply.push('\n')
      })
      await interaction.editReply(reply.join(''))
    } else {
      // perform guild leave now
      this.resolved = await interaction.client.guilds.resolve(id)
      if (this.resolved) {
        // create button components
        const yesBtn = new MessageButton()
          .setLabel('Yes')
          .setStyle('DANGER')
          .setCustomId('yes-btn')
        const row = new MessageActionRow().addComponents(yesBtn)
        interaction.editReply({
          content: `are you sure that you want to leave the guild ${this.resolved.name}?`,
          components: [row]
        })
      } else {
        interaction.editReply('no guild found with that id')
      }
    }
  }

  // handler for button
  @ButtonComponent('yes-btn')
  async yesBtn (interaction: ButtonInteraction) {
    if (this.resolved) {
      await this.resolved.leave()
    }
  }
}
