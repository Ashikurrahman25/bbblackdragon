const fs = require('fs');
const path = require('path');
const axios = require('axios');
const {
  query,
  collection,
  where,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
} = require('firebase/firestore');
const { db } = require('./firebase');
const bot = require('./telegram');

// ! controllers information
const controllersPath = path.resolve(__dirname, '../data/controllers.json');
const controllers =
  JSON.parse(fs.readFileSync(controllersPath, 'utf8') || '[]') || [];

bot.onText(/\/broadcast/, async (msg) => {
  // ! get last transaction data
  let ndcPrice, lastTxn;
  const docRef = doc(db, 'config', 'bot-config');
  onSnapshot(docRef, (doc) => {
    const data = doc.data();
    lastTxn = data?.lastTxn;
    ndcPrice = data?.ndcPrice;
  });

  if (!controllers?.includes(msg?.from?.id)) return;
  bot.sendMessage(
    msg.chat.id,
    'Enter transaction hash to broadcast to the group'
  );
  bot.on('message', async (_msg) => {
    if (msg?.from?.id !== _msg?.from?.id) return;

    const transactionHash = _msg.text.trim();
    // console.log(transactionHash.split(' ').length);
    if (transactionHash.split(' ').length > 1) {
      return bot.sendMessage(
        msg.chat.id,
        'Invalid transaction hash. Please re-enter transaction hash again.'
      );
    }
    let holders = 0;
    try {
      const { data } = await axios.get(
        'https://api.nearblocks.io/v1/fts/nearnvidia.near'
      );
      holders = parseInt(data?.contracts?.[0]?.holders);
    } catch (error) {
      // console.log(error);
    }

    // ! urls
    const buyUrl = 'https://app.ref.finance/swap/#near|nearnvidia.near';
    const NDCUrl = 'https://nearblocks.io/token/nearnvidia.near';
    const charUrl = 'https://dexscreener.com/near/refv1-4547';

    const { data: transactionData } = await axios.get(
      `https://api.nearblocks.io/v1/txns/${transactionHash}`
    );
    const ndcTknNear = transactionData?.txns?.[0]?.receipts?.find(
      (receipt) => receipt?.fts?.[0]?.ft_metas?.contract === 'nearnvidia.near'
    )?.fts?.[0];
    const ft1 = transactionData?.txns?.[0]?.receipts?.find(
      (receipt) =>
        receipt?.fts?.[0]?.ft_metas?.contract &&
        receipt?.fts?.[0]?.key &&
        receipt?.fts?.[0]?.key !== ndcTknNear?.key
    )?.fts?.[0];

    let contractDecimal = ft1?.ft_metas?.decimals;

    const TotalWNearSpent = Number(
      (ft1?.amount / Math.pow(10, contractDecimal)).toFixed(2)
    );

    const TotalNDCGained = Number(
      (ndcTknNear?.amount / Math.pow(10, 8)).toFixed(2)
    );
    const { data: NDCNearData } = await axios.get(
      'https://api.nearblocks.io/v1/fts/nearnvidia.near'
    );
    const total_supply_api = Number(
      parseFloat(NDCNearData?.contracts?.[0]?.total_supply).toFixed(2)
    );
    const total_supply = 2800000000000;
    const _holders = parseFloat(NDCNearData?.contracts?.[0]?.holders);
    const { data: wrapNearData } = await axios.get(
      'https://api.nearblocks.io/v1/fts/wrap.near',
      {
        headers: {
          Authorization: `Bearer ${process.env.NEAR_API_KEY}`,
        },
      }
    );

    const { data: dynamicNearData } = await axios.get(
      `https://api.nearblocks.io/v1/fts/${ft1?.ft_metas?.contract}`
    );

    let price = Number(dynamicNearData?.contracts?.[0]?.price);
    let spent = Number(TotalWNearSpent * price);
    let NDCPrice = Number((spent / TotalNDCGained).toFixed(11));

    if (ft1?.ft_metas?.contract === 'wrap.near') {
      ndcPrice = NDCPrice;
    } else {

      const {data : dexData} = await axios.get('https://api.dexscreener.com/latest/dex/tokens/nearnvidia.near');
    
      NDCPrice =  dexData?.pairs?.[0]?.priceUsd;;
      spent = TotalNDCGained * NDCPrice;
    }
    spent = Number(spent.toFixed(2));

    const nearPrice = Number(
      parseFloat(wrapNearData?.contracts?.[0]?.price).toFixed(2)
    );

    let gifLink = 'https://t.me/bdrbotres/15';

    const fdv = Number(total_supply_api * NDCPrice);
    const marketCap = Number(total_supply * NDCPrice);
    const bought = new Intl.NumberFormat('en-US').format(
      Math.ceil(TotalNDCGained)
    );
    if (ft1 && ndcTknNear && spent) {
      const q = query(collection(db, 'topics'), where('data', '==', 'buy_bot'));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        bot.sendAnimation(
          // msg.chat.id,
          doc?.data()?.chat_id,
          gifLink,
          {
            caption: `
<b>NEW <a href="${NDCUrl}">NEARVIDIA</a> Buy!</b>

${'🎮'.repeat(Math.ceil(spent / 5) > 500 ? 500 : Math.ceil(spent / 5))}${
              Math.ceil(spent / 5) > 500 ? '...' : ''
            }

💰 <b>Spent</b>: $${spent} (${Number((spent / nearPrice).toFixed(2))} NEAR)
⚫ <b>Bought</b>: ${bought} $NVIDIA
💴 <b>Price</b>: $${NDCPrice?.toFixed(10)}
🔄 <b>Supply</b>: ${Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 2,
            }).format(total_supply)}
🏦 <b>MarketCap</b>: $${Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 2,
            }).format(marketCap)}
💳 <b>FDV</b>: $${Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 2,
            }).format(fdv)}
🟢 <b>NEAR Price</b>: $${nearPrice}

<a href="https://nearblocks.io/txns/${transactionHash}">Tx</a> | <a href="https://twitter.com/nearvidia">X</a> | <a href="https://www.nvidia.com/gtc/session-catalog/?search=S63046&tab.allsessions=1700692987788001F1cG#/">Website</a> | <a href="https://t.me/NearoBotAnnouncements">Announcements</a>
          `,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Buy Ref.finance', url: buyUrl }],
                [{ text: 'Buy with Dragonbot', url: "https://t.me/near_dragon_bot" }],
                [{ text: 'Chart', url: charUrl }],
              ],
            },
            message_thread_id: doc?.data()?.message_thread_id,
          }
        );
      });
    }
    holders = _holders;
    bot.removeListener('message');
    await setDoc(docRef, { lastTxn, ndcPrice: NDCPrice });
  });
});
