require('dotenv').config();

const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  coinMarketCapApiKey: process.env.COIN_MARKET_CAP_API_KEY,
};

module.exports = config;
