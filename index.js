const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client();
const EmoteCache = require('./helper')


client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const cooldowns = new Discord.Collection();

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

var cache = new EmoteCache(client);

client.on('message', message => {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    
    // ensure bots can't trigger the command and that we are using 
    // c! as a prefix
    if(!message.content.toLowerCase().startsWith(config.prefix) || message.author.bot) return;
    
    // check for cooldowns on the command
    if(!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`Please wait ${timeLeft.toFixed(1)} more seconds before executing \`${command.name}\``);
        }
    }

   // command aliasing
    const cmd = client.commands.get(command)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(command));

    if (!cmd) {
        message.react('❔');
        return;
    }

    try {
        // we only require the cached emote class on certain calls which is specified
        // in each module
        if(cmd.requiresCache) {
            cmd.execute(message, args, client, cache);
        }
        else {
            cmd.execute(message, args, client);
        }
        
    } catch (error) {
	    console.error(error);
	    message.reply('there was an error trying to execute that command!');
    }

})