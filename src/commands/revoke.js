const fs = require('fs');
const path = require('path');
const bot = require('../telegram');

// ! controllers information
const controllersPath = path.resolve(__dirname, '../../data/controllers.json');
const controllers =
  JSON.parse(fs.readFileSync(controllersPath, 'utf8') || '[]') || [];

bot.onText(/\/revoke/, async (msg) => {
  if (!controllers?.includes(msg?.from?.id)) return;
  bot.sendMessage(
    msg?.chat?.id,
    `
<b>Revoke Menu</b>
Select an option from the list below
      `,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Welcome Message',
              callback_data: 'revoke_welcome_message',
            },
            {
              text: 'Buy Bot',
              callback_data: 'revoke_buy_bot',
            },
          ],
        ],
      },
      reply_to_message_id: msg?.message_thread_id,
    }
  );
});
