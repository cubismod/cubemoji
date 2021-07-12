// shout out to Allvaa on Github: https://gist.github.com/Allvaa/0320f06ee793dc88e4e209d3ea9f6256
const { APIMessage, Structures, Message } = require('discord.js')

export class ExtMsg extends Structures.get('Message') {
  /**
   * Converts a regular Discord.Message into one that can use inline replies
   * @param {Discord.Message} message - the message object that we are turning into an asyncable replyable message
   */
  constructor (message) {
    super(message.client, message, message.channel)
  }

  /**
   * perform an async reply, no pinging allowed with this one
   * similar to https://discord.js.org/#/docs/main/stable/class/Message?scrollTo=reply
   * @param {StringResolvable | APIMessage} content - The content for the message
   * @param {MessageOptions | MessageAdditions} options The options to provide
   * @returns Promise<(Message|Array<Message>)>
   */
  async inlineReply (content = '', options = {}) {
    const mentionRepliedUser = typeof ((options || content || {}).allowedMentions || {}).repliedUser === 'undefined' ? false : ((options || content).allowedMentions).repliedUser
    delete ((options || content || {}).allowedMentions || {}).repliedUser

    const apiMessage = content instanceof APIMessage ? content.resolveData() : APIMessage.create(this.channel, content, options).resolveData()
    Object.assign(apiMessage.data, { message_reference: { message_id: this.id } })

    if (!apiMessage.data.allowed_mentions || Object.keys(apiMessage.data.allowed_mentions).length === 0) { apiMessage.data.allowed_mentions = { parse: ['users', 'roles', 'everyone'] } }
    if (typeof apiMessage.data.allowed_mentions.replied_user === 'undefined') { Object.assign(apiMessage.data.allowed_mentions, { replied_user: mentionRepliedUser }) }

    if (Array.isArray(apiMessage.data.content)) {
      return Promise.all(apiMessage.split().map(x => {
        x.data.allowed_mentions = apiMessage.data.allowed_mentions
        return x
      }).map(this.inlineReply.bind(this)))
    }

    const { data, files } = await apiMessage.resolveFiles()
    return this.client.api.channels[this.channel.id].messages
      .post({ data, files })
      .then(d => this.client.actions.MessageCreate.handle(d).message)
  }
}

Structures.extend('Message', () => Message)
