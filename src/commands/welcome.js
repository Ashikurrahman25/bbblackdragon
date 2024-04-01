const bot = require('../telegram');

bot.onText(/^\/greetings/, async (msg) => {

    console.log(msg);
if( msg.chat.type !== 'private' && /administrator|creator/.test((await bot.getChatMember(msg.chat.id, msg.from.id)).status))
{
  let loadingMsg;
  try {
    loadingMsg = await bot.sendAnimation(
      msg?.chat?.id,
      'https://t.me/bdrbotres/22',
      {caption: "Welcome to $NEARVIDIA. Find essential links and video below! Let's Pump it!!! 📈",
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Website 🌐', url: "https://nearvidia.com/" },{ text: 'Twitter 🕊️', url: "https://twitter.com/nearvidia" }],
          [{ text: 'Buy Tutorial 🟢', callback_data: 'tutorial' }],
          [{ text: 'Provide Liquidity 💰', url: "https://app.ref.finance/pool/4547" }],
          [{ text: 'Buy NEARVIDIA NFT 🖼', url: "https://beta.mitte.gg/?contractAddress=nearvidia.sharddog.near" }],
          [{ text: 'Stake NEARVIDIA NFT 🥩', url: "https://stake.paras.id/" }],
          [{ text: 'Tokenomics  🧮', callback_data:'tokenomics' }]
        ],
      }}
    );

    bot.on('callback_query', query => {
      console.log(query)
      if (query.data === "tutorial") {  // query is an object from the response you get when the user clicks the inline button
        bot.sendVideo(msg?.chat?.id,"https://t.me/bdrbotres/13", {caption: "How to buy $NEARVIDIA"});
      }
      else if(query.data === "tokenomics"){
        bot.sendPhoto(msg?.chat?.id,"https://t.me/bdrbotres/17", {caption: "$NEARVIDIA TOKENOMICS"});
      }

      bot.answerCallbackQuery(query.id, {
      });
  })
  } catch (error) {
    console.log('error', error);
  } finally {
  bot.deleteMessage(msg?.chat?.id,msg?.message_id);

  }
}
else{
bot.sendMessage(msg?.chat?.id, "/greetings can only be used by admins!");
}
});

   