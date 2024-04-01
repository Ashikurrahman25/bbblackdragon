const bot = require('./telegram');

    bot.onText(/\/tutorial/, async (msg) => {
        bot.sendVideo(msg?.chat?.id,"https://t.me/bdrbotres/13", {caption: "How to buy $NEARVIDIA"});
    });

    bot.onText(/\/tokenomics/, async (msg) => {
        bot.sendPhoto(msg?.chat?.id,"https://t.me/bdrbotres/17", {caption: "$NEARVIDIA TOKENOMICS"});
   });

   bot.onText(/\/soltonear/, async (msg) => {
        bot.sendVideo(msg?.chat?.id,"https://t.me/bdrbotres/18", {caption: "Swap from SOL to NEAR"});
   });

   bot.onText(/\/ethtonear/, async (msg) => {
        bot.sendVideo(msg?.chat?.id,"https://t.me/bdrbotres/19", {caption: "Swap from ETH to NEAR"});
   });

   bot.onText(/\/nft/, async (msg) => {
        bot.sendVideo(msg?.chat?.id,"https://t.me/bdrbotres/20", {caption: "How to purchase and stake your $NEARVIDIA NFT"});
   });