const fs = require('fs');
const path = require('path');
const bot = require('../telegram');

// ! controllers information
const controllersPath = path.resolve(__dirname, '../../data/controllers.json');
const controllers =
  JSON.parse(fs.readFileSync(controllersPath, 'utf8') || '[]') || [];

bot.onText(/\/setup/, async (msg) => {
  try {
    if (
      /creator|administrator/.test(
        (await bot.getChatMember(msg.chat.id, msg.from.id)).status
      ) &&
      msg.chat.type !== 'private'
    ) {
      return bot.sendMessage(
        msg?.chat?.id,
        `
<b>Setup Menu</b>
Select an option from the list below        
        `,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Welcome Message',
                  callback_data: 'welcome_message',
                },
                ...(controllers?.includes(msg?.from?.id)
                  ? [
                      {
                        text: 'Buy Bot',
                        callback_data: 'buy_bot',
                      },
                    ]
                  : []),
              ],
              [
                {
                  text: 'CAPTCHA',
                  callback_data: 'captcha',
                },
                {
                  text: 'Portal',
                  callback_data: 'portal',
                },
              ],
            ],
          },
          reply_to_message_id: msg?.message_thread_id,
        }
      );
    }

    if (msg.chat.type === 'private') {
      return bot.sendMessage(
        msg?.chat?.id,
        `
<b>Setup Menu</b>

You can setup portal, change the welcome message, captcha for a group from here.
<em>(Bot will be added as an admin)</em>
      `,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Portal',
                  callback_data: 'setup_portal',
                },
              ],
              [
                {
                  text: 'Welcome Message',
                  callback_data: 'edit_welcome_message',
                },
                {
                  text: 'CAPTCHA',
                  callback_data: 'edit_captcha',
                },
              ],
            ],
          },
        }
      );
    }
  } catch (error) {
    // console.log(error);
  }
});

require('./callback');
