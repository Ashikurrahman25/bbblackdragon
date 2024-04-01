const bot = require('../telegram');

bot.onText(/\/help/, async (msg) => {
  if (msg.chat.type === 'private') {
    return bot.sendMessage(
      msg?.chat?.id,
      `
<b>${(await bot.getMe())?.username} Quick Setup</b>

You can SETUP your <b>${
        (await bot.getMe())?.username || (await bot.getMe())?.first_name
      }</b> in your group.

1. use <code>/start</code> for portal setup
2. use <code>/setup</code> for welcome message, buy bot & Enable or disable CAPTCHA/PORTAL.
<em>(${
        (await bot.getMe())?.username || (await bot.getMe())?.first_name
      } admins can setup the buy bot for now)</em>
3. use <code>/lockdown</code> for lock sending messages until a milestone fulfilled in Twitter or X
4. use <code>/cancel</code> for unlock sending messages.
5. use <code>/command</code> for setting up custom command
  - <code>/command</code> [name] [message]
  - <code>/command</code> (this will show all available commands)
6. use <code>/remove</code> for removing a custom command
  - <code>/remove</code> [name]
7. use <code>/help</code> for this message
`,
      { parse_mode: 'HTML' }
    );
  }
});
