const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
	operatorsAliases: false,
});

const CurrencyShop = sequelize.import('models/CurrencyShop');
sequelize.import('models/Users');
sequelize.import('models/UserItems');

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {

	const shop = [
		CurrencyShop.upsert({ name: 'Green', cost: 1 }),
		CurrencyShop.upsert({ name: 'Gold', cost: 2 }),
		CurrencyShop.upsert({ name: 'Crystal', cost: 5 }),
		CurrencyShop.upsert({ name: 'Giant Furry', cost: 5000000 }),
	];
	await Promise.all(shop);
	console.log('Database synced');
	sequelize.close();

}).catch(console.error);
