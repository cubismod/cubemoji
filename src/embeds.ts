// useful embeds that can be used between files
/**
 * log an error to the console and then return an embed obj
 * @param {number} severity - 0: info, 1: warn, 2: error
 * @param {string} message - the general error message title
 * @param {string} details - error trace produced by node
 */
export function errorEmbed (severity: number, message: string, details: string) {
  const embed = {
    title: '',
    color: '',
    description: '' 
  }
  switch (severity) {
    case 0:
      embed.title = 'ℹ️ - ' + message
      embed.color = '0x1680a7'
      console.log(details)
      break
    case 1:
      embed.title = '⚠️ - ' + message
      embed.color = '0xc28523'
      console.warn(details)
      break
    case 2:
      embed.title = '💥 - ' + message
      embed.color = '0x8c0211'
      console.error(details)
      break
  }
  embed.description = `\`\`\`\n ${details.slice(0, 2030)}\n\`\`\``
  return embed
}