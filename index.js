const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client();


client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);

	// set a new item in the Collection
	// with the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}
client.once('ready', () => {
    console.log('app running!');
})
client.login(config.token);

client.on('message', message => {
    var msg = message.content.toLowerCase();
    if(!msg.startsWith(config.prefix) || message.author.bot) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (!client.commands.has(command)) {
        message.react('❔');
        return;
    }

    try {
	    client.commands.get(command).execute(message, args, client);
    } catch (error) {
	    console.error(error);
	    message.reply('there was an error trying to execute that command!');
    }

})