module.exports = {
    name: 'help',
    description: 'Get more information on commands!',
    usage: '[help] (optional)<command_name>',
    aliases: ['h'],
    requiresCache: false,
    execute(message, args, client) {
        if(args.length == 0) {
            // just offer up list of other commands available
            var text = "The following commands are available:\n"
            client.commands.forEach(function(command) {
                text = text.concat(`\`${command.name}\`, `)
            })
            text = text.concat(`Type \`c!help <command_name>\` to get more info about a specific command.`)
            message.channel.send(text);
        }
        else {
            // specific command
            var command = args[0].toLowerCase();
            command = client.commands.get(command) || client.commands.find(c => c.aliases.includes(command));
           
            if (!command) {
                return message.reply("that's an invalid command.");
            }
            var text = `\`${command.name}\`\n`
            if(command.aliases) {
                text = text.concat(`**Aliases**: \`${command.aliases.join(', ')}\`\n`);
            }
            text = text.concat(`**Description**: ${command.description}\n`);
            text = text.concat(`**Usage**: \`c!${command.usage}\``);
            message.channel.send(text, {split: true});
        }
    }
}