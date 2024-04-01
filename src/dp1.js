const axios = require('axios');
const {
  doc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  onSnapshot,
} = require('firebase/firestore');
const { db } = require('./firebase');
const bot = require('./telegram');


function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  })
}


(async () => {
  // ! get last transaction data
  let lastTxn;
  const docRef = doc(db, 'config', 'bot-config');
  onSnapshot(docRef, (doc) => {
    const data = doc.data();
    lastTxn = data?.lastTxn;
  });

  // ! collect holders information when the server starts
  let holders = 0;
  try {
    const { data } = await axios.get(
      'https://api3.nearblocks.io/v1/fts/nearnvidia.near'
    );
    holders = parseInt(data?.contracts?.[0]?.holders);
  } catch (error) {
    // console.log(error);
  }

  // ! urls
  const buyUrl = 'https://app.ref.finance/swap/#near|nearnvidia.near';
  const NDCUrl = 'https://nearblocks.io/token/nearnvidia.near';
  const charUrl = 'https://dexscreener.com/near/refv1-4547';

  let isFetching = false;
  const getData = async () => {
    isFetching = true;
    try {

      console.log("Sending request");
      const { data } = await axios.get(
        'https://api.pikespeak.ai/money/token-last-txs/nearnvidia.near', 
        {
        headers: {
          'accept': 'application/json',
          'x-api-key': '3f857e71-518f-4b68-9d7b-5f3932a00e8c'
        }
      });
      
      console.log("Request sent " + data.txs);
      const newTxns = [];

      data?.txs?.some((txn) => {
        //  console.log(txn);
        if (txn?.transaction_id === lastTxn || txn?.sender != "v2.ref-finance.near") return true;
        newTxns.push(txn);
      });

      newTxns.forEach(async (txn) => {
        console.log(txn);
      await delay(3000);

      const { data: NDCNearData } = await axios.get(
        'https://api3.nearblocks.io/v1/fts/nearnvidia.near'
      );
      const total_supply_api = Number(
        parseFloat(NDCNearData?.contracts?.[0]?.total_supply).toFixed(2)
      );

console.log(total_supply);
        // const { data: transactionData } = await axios.get(
        //   `https://api3.nearblocks.io/v1/txns/${txn?.transaction_hash}`
        // );
        // const ndcTknNear = transactionData?.txns?.[0]?.receipts?.find(
        //   (receipt) =>
        //     receipt?.fts?.[0]?.ft_metas?.contract === 'nearnvidia.near'
        // )?.fts?.[0];
        // const ft1 = transactionData?.txns?.[0]?.receipts?.find(
        //   (receipt) =>
        //     receipt?.fts?.[0]?.ft_metas?.contract &&
        //     receipt?.fts?.[0]?.key !== ndcTknNear?.key
        // )?.fts?.[0];
        // const TotalWNearSpent = Number(
        //   (ft1?.amount / Math.pow(10, 24)).toFixed(2)
        // );
        // const TotalNDCGained = Number(
        //   (ndcTknNear?.amount / Math.pow(10, 24)).toFixed(2)
        // );

      
        // const _holders = parseFloat(NDCNearData?.contracts?.[0]?.holders);
        const { data: wrapNearData } = await axios.get(
          'https://api3.nearblocks.io/v1/fts/wrap.near'
        );
        // const { data: dynamicNearData } = await axios.get(
        //   `https://api3.nearblocks.io/v1/fts/${ft1?.ft_metas?.contract}`
        // );

        // const price = Number(dynamicNearData?.contracts?.[0]?.price);
        const nearPrice = Number(
          parseFloat(wrapNearData?.contracts?.[0]?.price).toFixed(2)
        );
        console.log(nearPrice);

        const {data : dexData} = await axios.get('https://api.dexscreener.com/latest/dex/tokens/nearnvidia.near');

        console.log(dexData?.pairs?.[0]?.priceUsd);
        const totalTokenGained = Number(txn.amount);
        const tokenPrice =  dexData?.pairs?.[0]?.priceUsd;;
        const spent = Number((totalTokenGained * tokenPrice).toFixed(2));
        const total_supply = 77590000000000;


        console.log(spent);

        if (spent < 5) {
          // console.log("Well didn't reach limit!");
          return;
        }
        let gifLink = 'https://t.me/bdrbotres/15';

        
        const marketCap = Number(total_supply * tokenPrice);
        const fdv = Number(total_supply_api * tokenPrice);
        const bought = new Intl.NumberFormat('en-US').format(
          Math.ceil(totalTokenGained)
        );
        if (spent) {
          const q = query(
            collection(db, 'topics'),
            where('data', '==', 'buy_bot')
          );
          const querySnapshot = await getDocs(q);

          console.log('Got Snapshot');

          querySnapshot.forEach((doc) => {
            bot.sendAnimation(doc?.data()?.chat_id, gifLink, {
              caption: `
<b>NEW <a href="${NDCUrl}">BLACKDRAGON</a> Buy!</b>

${'🐉' + '🔥'.repeat(Math.ceil(spent / 5) > 500 ? 500 : Math.ceil(spent / 5))}${
                Math.ceil(spent / 5) > 500 ? '...' : ''
              }

💰 <b>Spent</b>: $${spent} (${Number((spent / nearPrice).toFixed(2))} NEAR)
⚫ <b>Bought</b>: ${bought} $BLACKDRAGON
💴 <b>Price</b>: $${tokenPrice}
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

<a href="https://nearblocks.io/txns/${
                txn?.transaction_hash
              }">Tx</a> | <a href="https://twitter.com/nearvidia">X</a> | <a href="https://www.nvidia.com/gtc/session-catalog/?search=S63046&tab.allsessions=1700692987788001F1cG#/">Website</a> | <a href="https://t.me/NearoBotAnnouncements">Announcements</a>
          `,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Buy on Ref.finance', url: buyUrl }],
                  [{ text: 'Buy with Dragonbot', url: "https://t.me/near_dragon_bot" }],
                  [{ text: 'Chart', url: charUrl }],
                ],
              },
              message_thread_id: doc?.data()?.message_thread_id,
            });
          });
        }
        // holders = _holders;
      });
      if (newTxns.length) {
        lastTxn = newTxns[0]?.transaction_id;
        await setDoc(docRef, { lastTxn });
      }
    } catch (error) {
      // console.log(
      //   'This error occurred for calling : https://api3.nearblocks.io/v1/fts/ndc.tkn.near/txns?from=v2.ref-finance.near&page=1&per_page=25&order=desc'
      // );
      // console.log(error);
    } finally {
      isFetching = false;
    }
  };
  getData();
  setInterval(() => {
    if (!isFetching) getData();
  }, 20000);
})();
