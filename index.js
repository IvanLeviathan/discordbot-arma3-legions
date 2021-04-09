const Discord = require("discord.js");
const config = require("./config.json");
/*
{
	"BOT_TOKEN": "DS_BOT_TOKEN_API",
	"BOT_DEV_TOKEN": "DS_BOT_DEV_TOKEN_API",
	"SERVER_IP": "DEFAULT_SERVER_IP", 
	"SERVER_PORT": DEFAULT_SERVER_PORT,
	"SOUND_DIR": "./sounds",
	"DEVELOPER_MAIL": "YOUR_EMAIL",
	"DEVELOPER_ID": "YOUR_DS_ID",
	"RANDOM_ANIMALS_API": "https://randomanimalpicks.com/wp-content/themes/Newspaper/loaddata.php"
}
*/

const functions = require('./functions.js');
const fetch = require('node-fetch');

//set vars
const client = new Discord.Client();
const prefix = "!!";



//message
client.on('message', async function(message) {
	if (message.author.bot) return;
	//check if it is crosserver legions channel
	const serversSettings = await functions.getServerSettings();
	if(!!serversSettings[message.guild.id]){
		const curServerSettings = serversSettings[message.guild.id];
		if(curServerSettings.botLegionsChannelId == message.channel.id){
			//if trying to put command
			if(message.content.startsWith(prefix)){
				message.delete()
					.then(msg => console.log(`Deleted message from ${msg.author.username} in legions chat`))
					.catch(console.error);
				return;
			}
			console.log(serversSettings);
			for(var serverId in serversSettings) {
				var serverSettings = serversSettings[serverId];
				if(serverSettings.botLegionsChannelId != message.channel.id && serverSettings.botLegionServerIP == curServerSettings.botLegionServerIP){
					client.channels.fetch(serverSettings.botLegionsChannelId).then(function(channel){
						if(message.attachments.size > 0){
							var msgWattach = {
								data: '',
								files: []
							};
							if(!!message.content)
								msgWattach.data = message.content;
							message.attachments.every(function(attach){
								msgWattach.files.push(attach.url);
							});

							channel.send(functions.legionChatEmbed(msgWattach.data, message, curServerSettings, msgWattach.files));

						}else{
							channel.send(functions.legionChatEmbed(message.content, message, curServerSettings));
						}

					}).catch((error) => {
						console.log(error);
					});

				}
			};
		}
	}

	//594185427230130192 howard
	try{
		if(message.author.id == '594185427230130192'){
			message.react('🤡');
		}
	}catch(e){

	}
	

	if(!message.content.startsWith(prefix)) return;

	const commandBody = message.content.slice(prefix.length);
	const args = commandBody.split(' ');
	const command = args.shift().toLowerCase();
	switch (command) {
		case 'help':
			functions.help(message, args);
			break;
		case 'ping':
			functions.ping(message, args);
			break;
		case 'online':
			functions.online(message, args);
			break;
		case 'settings':
			functions.settings(message, args, client);
			break;
		case 'roll':
			functions.roll(message, args);
			break;
		case 'play':
			functions.playSound(message, args);
			break;
		case 'announce':
			functions.announce(message, args, client);
			break;
		case 'gay':
			functions.gay(message, args);
			break;
		case 'animal':
			functions.animal(message, args);
			break;
		case 'stat':
			functions.stat(message, args);
			break;
		default:
	}
});

client.on("ready", async () => {
	var date = false;

	setInterval(
		function(){

			dt = new Date();
			var dtstring = dt.getFullYear()
				+ '-' + dt.getMonth()+1
				+ '-' + dt.getDate()
				+ ' ' + dt.getHours()
				+ ':' + dt.getMinutes()
				+ ':' + dt.getSeconds();
			console.log(dtstring);

			if(dt.getMinutes() == 0 || dt.getMinutes() == 00){
				console.log('send onlines');
				functions.sendOnlines(client);
			}

			console.log(`${client.user.username} is online and running!`);
		},
		60000
	);

	(function wake() {
		try {

			const handler = setInterval(() => {

				fetch('https://discordbotjslegion.herokuapp.com')
				.then(res => console.log(`response-ok: ${res.ok}, status: ${res.status}`))
				.catch(err => console.error(`Error occured: ${err}`));

			},  25*60*1000);

		} catch(err) {
			console.error('Error occured: retrying...');
			clearInterval(handler);
			return setTimeout(() => wake(), 10000);
		};
	})();
	functions.updateBotStatus(client);
});



//start bot
client.login(config.BOT_TOKEN);
//client.login(config.BOT_DEV_TOKEN);
