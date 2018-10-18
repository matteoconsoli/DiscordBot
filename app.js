const config = require('./config');
const Discord = require('discord.js');

const client = new Discord.Client();
const { Users, CurrencyShop } = require('./dbObjects');
const { Op } = require('sequelize');
const currency = new Discord.Collection();
const PREFIX = '!';
const talkedRecently = new Set();
const BLYAT = new Set()
const DELAY = 43200000;
const DELAY2 = 900000;
const POT = 0;
var players  = [];
var globalcounter = 0;

Reflect.defineProperty(currency, 'add', {
	value: async function add(id, amount) {
		const user = currency.get(id);

		if (user) {
			user.balance += Number(amount);
		return user.save();
		}

		const newUser = await Users.create({ user_id: id, balance: amount });
		currency.set(id, newUser);

		return newUser;
	},
});

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min + 1)) + min; //Il max è incluso e il min è incluso 
}

Reflect.defineProperty(currency, 'getBalance', {
	value: function getBalance(id) {
		const user = currency.get(id);

		return user ? user.balance : 0;
	},
});

client.once('ready', async () => {
	const storedBalances = await Users.findAll();
	storedBalances.forEach(b => currency.set(b.user_id, b));
	client.user.setActivity('WHATCHING YOU');
	client.user.setUsername('DottorScotti');
	client.user.setAvatar('large.jpg');
	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async message => {
	if (message.author.bot) return;

	if (!message.content.startsWith(PREFIX)) return;
		const input = message.content.slice(PREFIX.length).trim();

	if (!input.length) return;
		const [, command, commandArgs] = input.match(/(\w+)\s*([\s\S]*)/);

	if (command === 'balance') {
		const target = message.mentions.users.first() || message.author;

		return message.channel.send(`${target.tag} has ${currency.getBalance(target.id)}💰`);

	}

	else if (command === 'inventory') {
		const target = message.mentions.users.first() || message.author;
		const user = await Users.findOne({ where: { user_id: target.id } });
		const items = await user.getItems();

		if (!items.length) return message.channel.send(`${target.tag} has nothing!`);
		return message.channel.send(`${target.tag} currently has ${items.map(t => `${t.amount} ${t.item.name}`).join(', ')}`);

	}

	else if (command === 'server') {
		message.channel.send(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}\nOwner : ${message.guild.owner}\nServer Region: ${message.guild.region}`);

	}

	else if (command === 'transfer') {
		const currentAmount = currency.getBalance(message.author.id);
		const transferAmount = commandArgs.split(/ +/).find(arg => !/<@!?\d+>/.test(arg));
		const transferTarget = message.mentions.users.first();

		if (!transferAmount || isNaN(transferAmount)) return message.channel.send(`Sorry ${message.author}, that's an invalid amount`);
		if (transferAmount > currentAmount) return message.channel.send(`Sorry ${message.author} you are too poor to do that.`);
		if (transferAmount <= 0) return message.channel.send(`Are you dumb ? put more than 0!, ${message.author}`);

		currency.add(message.author.id, -transferAmount);
		currency.add(transferTarget.id, transferAmount);

		return message.channel.send(`Successfully transferred ${transferAmount}💰 to ${transferTarget.tag}. Your current balance is ${currency.getBalance(message.author.id)}💰`);

	}

	else if (command === 'buy') {
		const item = await CurrencyShop.findOne({ where: { name: { [Op.like]: commandArgs } } });

		if (!item) return message.channel.send('That item doesn\'t exist.');
		if (item.cost > currency.getBalance(message.author.id)) {
			return message.channel.send(`You are too poor to afford that, ${message.author}`);
		}

		const user = await Users.findOne({ where: { user_id: message.author.id } });
		currency.add(message.author.id, -item.cost);

		await user.addItem(item);

		message.channel.send(`You've bought a ${item.name}`);

	}
	else if (command === 'shop') {
		const items = await CurrencyShop.findAll();

		return message.channel.send(items.map(i => `${i.name}: ${i.cost}💰`).join('\n'), { code: true });

	}

	else if (command === 'leaderboard') {

		return message.channel.send(
			currency.sort((a, b) => b.balance - a.balance)
				.filter(user => client.users.has(user.user_id))
				.first(10)
				.map((user, position) => `(${position + 1}) ${(client.users.get(user.user_id).tag)}: ${user.balance}💰`)
				.join('\n'),
			{ code: true }
		);
	}

	else if (command === 'daily') {
		 if (talkedRecently.has(message.author.id)) {
            return message.channel.send("Wait 12H to get another daily. - " + message.author);
    		}
    	 else {

	        const target = message.mentions.users.first() || message.author;
			const random = getRandomIntInclusive(1,100);
			currency.add(message.author.id,random);

		if (random > 80) {
			 message.channel.send(`You received ${random}💰 \nMaronna u Carmn!`);
		}

		else if (random < 10) {
			 message.channel.send(`You received ${random}💰 \nAAHAHHAHAHAHAHH`);
		}

		else{
		 message.channel.send(`You received ${random}💰`);
	}
        // Adds the user to the set so that they can't talk for a minute
        talkedRecently.add(message.author.id);
        setTimeout(() => {
          // Removes the user from the set after a minute
          talkedRecently.delete(message.author.id);
        }, DELAY);
    }
		
	}

	else if (command === 'gamble') {
		if (!message.content.startsWith(PREFIX) || message.author.bot) return;

		const args = message.content.slice(PREFIX.length).split(' ');
		const command = args.shift().toLowerCase();
		const amount = parseInt(args[0]) + 1;
	    const target = message.mentions.users.first() || message.author;
		const random = getRandomIntInclusive(1,3);

		if (isNaN(amount)) {
			return message.reply('that doesn\'t seem to be a valid number.');
		}

		else if (amount == 0) {
			return message.reply('you need to input a number higher than 0.');
		}
		else if (amount > currency.getBalance(target.id)) {
			return message.reply('Not enough money.');
		}

		if (random === 2) {
			 var win = amount * 3;
			 message.channel.send(`You won ${win}💰!`);
			 currency.add(message.author.id,win);
		}

		else{
			message.channel.send(`You Lost ${amount}💰!`);
			currency.add(message.author.id,-amount);
	}

    }

    else if (command === 'cyka') {

    	if (BLYAT.has(message.author.id)) {
            return message.channel.send("Wait 15m to get another rusky. - " + message.author);
    		}

    	 else {

	        const target = message.mentions.users.first() || message.author;
			const random = getRandomIntInclusive(1,10);
			 if (random === 3) {
				 message.channel.send(`BLYAAAAAAAAAAAAAAAAAAAAAAAAAT!\n500 rusky money for you💰💰💰💰`);
				 currency.add(message.author.id,500);
				 message.react('🍎');
	    		 message.react('🍊');
	    		 message.react('🍇');
		}
			else{
				message.channel.send(`No blyat for you`);
				message.react('👎');
	}
		BLYAT.add(message.author.id);
        	setTimeout(() => {
          // Removes the user from the set after a minute
          	BLYAT.delete(message.author.id);
        	}, DELAY2);
    }
}

 	else if(command === 'potdeposit'){
 		if (!message.content.startsWith(PREFIX) || message.author.bot) return;

		const args = message.content.slice(PREFIX.length).split(' ');
		const command = args.shift().toLowerCase();
		const amount = parseInt(args[0]) + 1;
	    const target = message.mentions.users.first() || message.author;

		if (isNaN(amount)) {
			return message.reply('that doesn\'t seem to be a valid number.');
		}

		else if (amount < 1) {
			return message.reply('you need to input a number higher thn 1.');
		}

    	else if (amount > currency.getBalance(target.id)) {
			return message.reply('Not enough money.');
		}
 		var person = {firstName: target, bet: amount, id: message.author.id};
 		players[globalcounter] = person;
 		message.channel.send(players[0].firstName +'  '+amount);
 		message.channel.send(target+`Joined The pot with ${amount}💰`);
 		globalcounter = globalcounter+ 1;
 		currency.add(message.author.id,-amount);
 	}

 else if(command === 'potStats'){
		if (!message.content.startsWith(PREFIX) || message.author.bot) return;
 		if (globalcounter == 0) {
 			return message.reply('No player in the pot');
 		}
	    const target = message.mentions.users.first() || message.author;
	    var total = 0;
	    var perc =0;
	    var i;
	    message.channel.send(`The current players in the pot are:`);
	    for ( i= 0; i < players.length ; i++){
	    	total = total + players[i].bet;
	    }
 		for ( i = 0; i < players.length ; i++){
	    	perc = players[i].bet / total *100;
	    	message.channel.send(players[i].firstName +`has a winning chanche of` + perc+'%');
	    }
	}

	else if(command === 'potStart'){
		if (!message.content.startsWith(PREFIX) || message.author.bot) return;
 		if (players.length <= 1) {
 			return message.reply('Not enough player to start');
 		}
	    const target = message.mentions.users.first() || message.author;
	    var total = 0;
	    var perc =0;
	    var i;
	    var max;
	    var array =[];
	    var pal1 = 0 ;
	    var pal2 = players[0].bet;

	    for ( i= 0; i < players.length ; i++){
	    	total = total + players[i].bet;
	    }
	    const random = getRandomIntInclusive(1,total);
 		message.channel.send(total+`total of pot💰`);
 		for ( i = 0; i < players.length ; i++){
	    	perc = players[i].bet / total *100;
	    	message.channel.send(players[i].firstName +`has a winning chanche of` + perc);
	    }
	    for ( i=0; i < players.length ; i++){
	    	array[i] = players[i].bet;
	    }
	    for ( i=0; i < players.length ; i++){
			if(random >= pal1 && random <=pal2){
				currency.add(players[i].id,total);
				message.channel.send(players[i].firstName +`has Won The pot!!! for`+ total +`💰💰💰💰`);
				globalcounter = 0;
				return players = []; 
			}
			pal1 = pal1 + players[i].bet;
			var t = i+1;
			pal2 = pal2 + players[t].bet;
		}

	    }
	else if(command === 'help'){
		message.channel.send({embed: {
	    color: 0x85FF00,
	    author: {
	      name: client.user.username,
	      icon_url: client.user.avatarURL
	    },

	    title: "Command List",
	    description: "Here's a list of usefull commands.",
	       fields: [
	      {
	        name: "Balance",
	        value: "Shows Your Balance",

	      },
	      {
	        name: "Inventory",
	        value: "See what you have in the bag",

	      },
	      {
	        name: "Server",
	        value: "Shows some server infos",

	      },
	      {
	        name: "Transfer",
	        value: "Send money to someone",

	      },
	      {
	        name: "Market",
	        value: "See what the market has to offer",

	      },
	      {
	        name: "Buy",
	        value: "Buy items from the market list",

	      },
	      {
	        name: "Leaderboard",
	        value: "See the server biggest dick",

	      },
	      {
	        name: "Daily",
	        value: "Get free money you cheap ass user",
	      },
	      {
	        name: "Gamble",
	        value: "Do like tesla waste your money",
	      },
	      {
	        name: "Cyka",
	        value: "You know what is going to happen.",
	      },
	      {
	        name: "potdeposit",
	        value: "Enter the pot with how much you want",
	      },
	      {
	        name: "potStats",
	        value: "Display the winning % of each person",
	      },
	      {
	        name: "potStart",
	        value: "Let the game begin!",
	      }
	    ],
	    timestamp: new Date(),
	    footer: {
	      icon_url: client.user.avatarURL,
	      text: "© Enjoy!"
	    }
	  }
	});
	}
		

});

client.login(config.token);
