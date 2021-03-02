const config = require("./config.json");
const Discord = require("discord.js");
const Gamedig = require('gamedig');
const sendmail = require('sendmail')();
const fetch = require('node-fetch');
const firebase = require('firebase');
const firebaseConfig = require('./firebase-config.json');
fs = require('fs')




const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express().listen(PORT, () => console.log(`Listening on ${ PORT }`));


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

var ref = firebase.database().ref('/');
var legionsRef = ref;

async function test() {
	var data = await legionsRef.get();
	console.log(data.val());
}


module.exports = {
	isReady: true,
	sendOnlinesToChannels: async function(client, state, serverIP, ipObj, serverSettings){
		const exp = this;
		const players = state.raw.numplayers;
		const maxPlayers = state.maxplayers;

		var clonesList = false;

		for(var serverId in serverSettings) {
			curServerSettings = serverSettings[serverId];
			var channelId = curServerSettings.botChannelId;
			try {
				await client.channels.fetch(channelId).then(function(channel){
					curServerSettings = serverSettings[channel.guild.id];
					if(curServerSettings.botLegionServerIP == serverIP){
						clonesList = exp.clonesList(state.players, curServerSettings);
						var embed = exp.makeEmbed(`${state.name}\n\nКоличество личного состава ВАР: **${players}/${maxPlayers}**\n\nНаши бойцы на планете:${clonesList}`, curServerSettings);
						channel.send(embed);
					}
				}).catch((error) => {
					console.log(error);
				});
			} catch (e) {

			} finally {

			}

		}
	},
	sendOnlines: async function(client) {
		const serverSettings = await this.getServerSettings();
		const exp = this;
		var curServerSettings = false;
		var allIPs = {};
		//need to get all IPs
		for(var serverId in serverSettings) {
			curServerSettings = serverSettings[serverId];
			var channelId = curServerSettings.botChannelId;
			var ip = curServerSettings.botLegionServerIP;
			var port = curServerSettings.botLegionServerPort;
			allIPs[ip] = {"PORT": port};
		}

		for(var serverIP in allIPs){
			var ipObj = allIPs[serverIP];

				await Gamedig.query({
					type: 'arma3',
					host: serverIP ? serverIP : config.SERVER_IP,
					port: ipObj.PORT ? ipObj.PORT : config.SERVER_PORT
				}).then((state) => {
					exp.sendOnlinesToChannels(client, state, serverIP, ipObj, serverSettings);
				}).catch((error) => {
					console.log(error);
					for(var serverId in serverSettings) {
						var curServerSettings = serverSettings[serverId];
						var channelId = curServerSettings.botChannelId;

						client.channels.fetch(channelId).then(function(channel){
							channel.send(`Сервер не отвечает :(`);
						}).catch((error) => {
							console.log(error);
						});
					}
				});


		}
	},
	online: async function(message, args) {
		const serverSettings = await this.getServerSettings();
		const curServerSettings = serverSettings[message.guild.id];
		console.log(curServerSettings);
		Gamedig.query({
			type: 'arma3',
			host: curServerSettings.botLegionServerIP ? curServerSettings.botLegionServerIP : config.SERVER_IP,
			port: curServerSettings.botLegionServerPort ? curServerSettings.botLegionServerPort :config.SERVER_PORT
		}).then((state) => {
			const clonesList = this.clonesList(state.players, curServerSettings);
			const players = state.raw.numplayers;
			const maxPlayers = state.maxplayers;
			const channel = message.channel;
			const embed = this.makeEmbed(`${state.name}\n\nКоличество личного состава ВАР: **${players}/${maxPlayers}**\nНаши бойцы на планете:${clonesList}`, curServerSettings);
			channel.send(embed);
		}).catch((error) => {
			console.log(error);
			message.reply(`Сервер не отвечает :(`);
		});
	},
	findClones: function(players, curServerSettings) {
		var neededPlayers = [];
		players.forEach((player, i) => {
			var re = new RegExp('\\[('+curServerSettings.botLegion+')(nd|th|st)?\\]');
			if(!!player.name){
				if(!!player.name.match(re)){
					neededPlayers.push(player);
				}
			}
		});
		return neededPlayers;
	},
	clonesList: function(players, curServerSettings) {
		const clones = this.findClones(players, curServerSettings);
		//make from array listed for string
		if(clones.length){
			clonesStr = '';
			clones.forEach((clone, i) => {
				clonesStr += '\n'+clone.name;
			});
			return clonesStr;
		}else{
			return ' отсутствуют';
		}
	},
	makeEmbed: function(text, curServerSettings = false) {
		var embed = new Discord.MessageEmbed()
		.setTitle('Смотрящий')
		.setColor('#00FF00')
		.setDescription(text)
		.setThumbnail('https://cdn.discordapp.com/attachments/802269748414382110/802560698852048896/207435-200.png')
		;

		if(!!curServerSettings){
			embed = new Discord.MessageEmbed()
			.setTitle(curServerSettings.botTitle)
			.setColor(curServerSettings.botColor)
			.setDescription(text)
			.setThumbnail(curServerSettings.botThumb)
			.setFooter(curServerSettings.botFooter)
			;
		}
		return embed;
	},
	legionChatEmbed: function(text, message, curServerSettings = false, files = false) {
		var embed = new Discord.MessageEmbed()
		.setAuthor(
			message.member.nickname ? message.member.nickname : message.member.user.username,
			message.author.avatarURL()
		)
		.setDescription(text)
		.setColor('#00FF00')
		;

		if(!!curServerSettings){
			embed = new Discord.MessageEmbed()
			.setAuthor(
				message.member.nickname ? message.member.nickname : message.member.user.username,
				message.author.avatarURL()
			)
			.setDescription(text)
			.setColor(curServerSettings.botColor)
			.setFooter(curServerSettings.botFooter)
			;

			if(!!files[0] && (files[0].indexOf("png", files[0].length - "png".length) !== -1 || files[0].indexOf("jpg", files[0].length - "jpg".length !== -1 || files[0].indexOf("jpeg", files[0].length - "jpeg".length) !== -1)))
				embed.setImage(files[0]);
		}

		return embed;
	},
	attachIsImage: function(msgAttach) {
		var url = msgAttach.url;
		return url.indexOf("png", url.length - "png".length) !== -1 || url.indexOf("jpg", url.length - "jpg".length) !== -1 || url.indexOf("jpeg", url.length - "jpeg".length) !== -1;
	},
	saveServerSettings: async function(settings, message) {

		var serverId = message.guild.id;
		settings.server_name = message.guild.name;
		settings.server_owner = message.guild.ownerID;

		let answer = false;

		legionsRef.child(serverId).set(
			settings,
			function(error) {
				if (error) {
					console.log("Data could not be saved." + error);
				} else {
					console.log("Data saved successfully.");
					answer = true;
				}
			}
		);

		return answer;
	},
	getServerSettings: async function(serverId = false) {
		//const content = false;
		var data = await legionsRef.get();
		if(!!data){
			return data.val();
		}else{
			return false;
		}
	},
	settings: function(message, args, client) {
		const settings = {};
		const exp = this;
		const firstMessage = message;
		const filter = m => !!m.content || m.attachments.size > 0;
		const answerTime = 60000;

		message.reply(`Здравия желаю, Я клон с очень ответственной задачей, слежу за личным составом. Как Вы меня будете называть?`);


		//
		//collect bot title
		//
		message.channel.awaitMessages(m => m.author.id == firstMessage.author.id, {max: 1, time: answerTime}).then(collected => {
			settings.botTitle = collected.first().content;
			message.guild.members.cache.get(client.user.id).setNickname(collected.last().cleanContent);
			message.reply(`Так точно! Теперь я известен как - ${collected.last()}.`);
			//
			//collect bot img
			//
			message.reply(`Отправьте мне изображение под которым я буду отправлять вам зашифрованные сообщения. :eyes:`);
			message.channel.awaitMessages(m => m.author.id == firstMessage.author.id && m.attachments.size > 0 && m.attachments.every(exp.attachIsImage), {max: 1, time: answerTime}).then(collected => {
				settings.botThumb = collected.first().attachments.first().attachment;
				message.reply(`Так точно! Теперь я известен под этим изображением. ${collected.first().attachments.first().attachment}`);

				//
				//collect bot color
				//
				message.reply(`Задайте цвет вашего подразделения в формате HEX (#FF0000).:rainbow_flag: Выбрать можно по ссылке - https://htmlcolorcodes.com/color-picker/`);
				message.channel.awaitMessages(m => m.author.id == firstMessage.author.id && m.content.startsWith('#'), {max: 1, time: answerTime}).then(collected => {
					settings.botColor = collected.first().content;
					message.reply(`Так точно! Цвет подразделения - ${collected.last()}.`);

					//
					//collect bot legion
					//
					message.reply(`Задайте название вашего подразделения (что у бойцов в [], напр [RS], [212], [501]), только цифры/название (без []).`);
					message.channel.awaitMessages(m => m.author.id == firstMessage.author.id, {max: 1, time: answerTime}).then(collected => {
						settings.botLegion = collected.first().content;
						message.reply(`Так точно! Название/цифры подразделения  - ${collected.last()}.`);

						//
						//collect bot footer
						//
						message.reply(`Задайте подпись для рапортов вашего подразделения (напр. '212nd attack battalion').`);
						message.channel.awaitMessages(m => m.author.id == firstMessage.author.id, {max: 1, time: answerTime}).then(collected => {
							settings.botFooter = collected.first().content;
							message.reply(`Так точно! Подпись для рапортов - ${collected.last()}.`);

							//
							//collect bot channel id
							//
							message.reply(`Укажите текстовый канал куда выкладывать рапорты (через #)`);
							message.channel.awaitMessages(m => m.author.id == firstMessage.author.id && client.channels.fetch(m.content.replace(/[^\d]/g, '')), {max: 1, time: answerTime}).then(collected => {
								var channelId = collected.first().content.replace(/[^\d]/g, '');
								settings.botChannelId = channelId;
								message.reply(`Так точно! Канал для рапортов - <#${channelId}>`);

								//
								//collect bot legions channel id
								//
								message.reply(`Укажите текстовый для общения с другими подразделениями (через #)`);
								message.channel.awaitMessages(m => m.author.id == firstMessage.author.id && client.channels.fetch(m.content.replace(/[^\d]/g, '')), {max: 1, time: answerTime}).then(collected => {
									var channelId = collected.first().content.replace(/[^\d]/g, '');
									settings.botLegionsChannelId = channelId;
									message.reply(`Так точно! Канал для общения с другими подразделениями - <#${channelId}>`);

									//
									//collect legion's server ip
									//
									message.reply(`Укажите IP вашего сервера`);
									message.channel.awaitMessages(m => m.author.id == firstMessage.author.id, {max: 1, time: answerTime}).then(collected => {
										var ip = collected.first().content;
										settings.botLegionServerIP = ip;
										message.reply(`Так точно! IP адрес сервера - ${ip}`);

										//
										//collect legion's server port
										//
										message.reply(`Укажите порт вашего сервера`);
										message.channel.awaitMessages(m => m.author.id == firstMessage.author.id, {max: 1, time: answerTime}).then(collected => {
											var port = collected.first().content;
											settings.botLegionServerPort = port;
											message.reply(`Так точно! Порт сервера - ${port}`);

											//
											//save settings
											//
											const save = exp.saveServerSettings(settings, message);
											if(save){
												message.reply(`Данные успешно сохранены и зашифрованы.`);
											}else{
												message.reply(`Произошла ошибка при сохранении.`);
												message.reply(`Сохраните данную настройку и передайте разработчику\n${JSON.stringify(settings)}`);
											}
										}).catch(() => {
											message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
										});
									}).catch(() => {
										message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
									});


								}).catch(() => {
									message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
								});


							}).catch(() => {
								message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
							});




						}).catch(() => {
							message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
						});



					}).catch(() => {
						message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
					});

				}).catch(() => {
					message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
				});


			}).catch(() => {
				message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
			});

		}).catch(() => {
			message.reply('Нет ответа в течение 60 секунд, начнем заново в удобное вам время !!settings.');
		});

		return true;
	},
	// updateBotStatus: function(client) {
	// 	try {
	// 		Gamedig.query({
	// 			type: 'arma3',
	// 			host: config.SERVER_IP,
	// 			port: config.SERVER_PORT
	// 		}).then((state) => {
	// 			const players = state.raw.numplayers;
	// 			const maxPlayers = state.maxplayers;
	// 			client.user.setPresence(
	// 				{
	// 					activity: {
	// 						type: 'WATCHING',
	// 						name: 'онлайн '+players+'/'+maxPlayers
	// 					},
	// 					status: 'online'
	// 			});
	//
	// 		}).catch((error) => {
	// 			console.log(error);
	// 		});
	// 	} catch (e) {
	//
	// 	} finally {
	//
	// 	}
	// },
	updateBotStatus: function(client) {
		client.user.setPresence({
			activity: {
				type: 'PLAYING',
				name: '!!help | dev: Iv#7287'
			},
			status: 'online'
		});
	},
	getSounds: function() {
		var files = fs.readdirSync(`${config.SOUND_DIR}/`);
		return files;
	},
	playSound: function (message, args) {
		const exp = this;
		if(!exp.isReady){
			message.reply(`дождитесь окончания текущего звука!!`);
			return;
		}

		if (exp.isReady && !!args[0]){
			var voiceChannel = message.member.voice.channel;
			if(!!voiceChannel){
				var path = `${config.SOUND_DIR}/${args[0]}.mp3`;

				if (fs.existsSync(path)) {
					exp.isReady = false;
					voiceChannel.join().then(connection =>{
						const dispatcher = connection.play(path);
						dispatcher.on("finish", end => {
							voiceChannel.leave();
							exp.isReady = true;
						});
					}).catch(err => console.log(err));
				}else{
					message.reply(`Такой аудиозаписи нет!!\n${this.getSounds().join('\n')}`);
				}

			}else{
				message.reply(`Ты не в голосовом канале!!`);
			}

		}else{
			message.reply(`Укажи название аудиофайла без ".mp3"!\n${this.getSounds().join('\n')}`);
		}
	},
	help: async function(message, args) {
		const serverSettings = await this.getServerSettings();
		const curServerSettings = serverSettings[message.guild.id];
		const channel = message.channel;

		const embed = this.makeEmbed(`!!ping - \n!!roll - \n!!online - онлайн на сервере\n!!settings - настройки под сервер\n!!play - проиграть звук в войс чат\n!!gay - проверка на гея\n!!animal - какое ты животное?`, curServerSettings);
		channel.send(embed);
	},
	ping: async function(message, args) {
		const serverSettings = await this.getServerSettings();
		const timeTaken = Date.now() - message.createdTimestamp;
		const curServerSettings = serverSettings[message.guild.id];
		const channel = message.channel;

		const embed = this.makeEmbed(`Pong! Задержка **${timeTaken}ms**.`, curServerSettings);
		channel.send(embed);
		message.delete().then(msg => console.log(`Deleted message from ${msg.author.username} in ping`)).catch(console.error);
	},
	roll: async function(message, args) {
		const serverSettings = await this.getServerSettings();
		const curServerSettings = serverSettings[message.guild.id];

		const max = args[0] ? args[0] : 100;
		const randomInt = Math.floor(Math.random() * Math.floor(max)) + 1;
		const channel = message.channel;
		const embed = this.makeEmbed(`**${message.member.nickname ? message.member.nickname : message.member.user.username}** выбрасывает **${randomInt}** из ${max}`, curServerSettings);
		channel.send(embed);
		message.delete().then(msg => console.log(`Deleted message from ${msg.author.username} in roll`)).catch(console.error);
	},
	announce: async function(message, args, client) {
		if(message.author.id =! config.DEVELOPER_ID)
			return;
		const serverSettings = await this.getServerSettings();
		for(var serverId in serverSettings) {
			var curServerSettings = serverSettings[serverId];
			var channelId = curServerSettings.botChannelId;
			await client.channels.fetch(channelId).then(function(channel){
				channel.send(`@everyone ${args.join(' ')}`).catch((error) => {
					console.log('error');
				});
			}).catch((error) => {
				console.log(error);
			});
		}
	},
	gay: function(message, args) {
		const max = 100;
		const randomInt = Math.floor(Math.random() * Math.floor(max)) + 1;
		if(!!args[0]){
			message.channel.send(`${args[0]} гей на ${randomInt}%:rainbow_flag:`);
		}else{
			message.reply(`ты гей на ${randomInt}%:rainbow_flag:`);
		}
		message.delete().then(msg => console.log(`Deleted message from ${msg.author.username} in gay`)).catch(console.error);
	},
	animal: async function(message, args) {

		const res = await fetch(config.RANDOM_ANIMALS_API).catch(err => console.error(`Error occured: ${err}`));
		const text = await res.text();
		const json = JSON.parse(text);

		if(!json || !json[0].link){
			message.reply(`пока не знаю`);
			return;
		}

		if(!!args[0]){
			message.channel.send({
				content: `${args[0]} - это ты!`,
				files: [json[0].link]
			});
		}else{
			message.channel.send({
				content: `${message.author} - это ты!`,
				files: [json[0].link]
			});
		}

		message.delete().then(msg => console.log(`Deleted message from ${msg.author.username} in animal`)).catch(console.error);
	},
	stat: function(message, args) {
		//TODO
	}
}
