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

function addTxn(collection,txn) {
  const existingIds = collection.map((txn) => txn.transaction_hash);

  if (!existingIds.includes(txn.transaction_hash)) {
      collection.push(txn);
  }
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
      'https://api3.nearblocks.io/v1/fts/babyblackdragon.tkn.near'
    );
    holders = parseInt(data?.contracts?.[0]?.holders);
  } catch (error) {
    // console.log(error);
  }

  // ! urls
  const buyUrl = 'https://app.ref.finance/swap/#near|babyblackdragon.tkn.near';
  const NDCUrl = 'https://nearblocks.io/token/babyblackdragon.tkn.near';
  const charUrl = 'https://dexscreener.com/near/refv1-4840';

  let isFetching = false;
  const getData = async () => {
    isFetching = true;
    try {
      const { data } = await axios.get(
        'https://api3.nearblocks.io/v1/fts/babyblackdragon.tkn.near/txns?from=v2.ref-finance.near&page=1&per_page=25&order=desc'
      );
      const newTxns = [];
      data?.txns?.some((txn) => {
        if (txn?.transaction_hash === lastTxn) return true;

        addTxn(newTxns,txn);
      });
      newTxns.forEach(async (txn) => {
         if(txn?.involved_account_id != "v2.ref-finance.near"){
          return;
         }
        //{
        //   console.log("It's a buy- " + txn.transaction_hash);
        // }
        // else{
        //   console.log("It's a sell- " + txn.transaction_hash);

        // }
        const { data: transactionData } = await axios.get(
          `https://api3.nearblocks.io/v1/txns/${txn.transaction_hash}`
        );
        const ndcTknNear = transactionData?.txns?.[0]?.receipts?.find(
          (receipt) =>
            receipt?.fts?.[0]?.ft_meta?.contract === 'babyblackdragon.tkn.near'
        )?.fts?.[0];
        // console.log(ndcTknNear);

        const ft1 = transactionData?.txns?.[0]?.receipts?.find(
          (receipt) =>
            receipt?.fts?.[0]?.ft_meta?.contract &&
            receipt?.fts?.[0]?.event_index !== ndcTknNear?.event_index
        )?.fts?.[0];
        const TotalWNearSpent = Number(
          (Math.abs(ft1?.delta_amount) / Math.pow(10, 24)).toFixed(2)
        );
        
        const TotalNDCGained = Number(
          (Math.abs(ndcTknNear?.delta_amount) / Math.pow(10, 24)).toFixed(2)
        );
        const { data: NDCNearData } = await axios.get(
          'https://api3.nearblocks.io/v1/fts/babyblackdragon.tkn.near'
        );

        const total_supply_api = Number(
          parseFloat(NDCNearData?.contracts?.[0]?.total_supply).toFixed(2)
        );
        const total_supply = 2800000000000;
        const _holders = parseFloat(NDCNearData?.contracts?.[0]?.holders);
        const { data: wrapNearData } = await axios.get(
          'https://api3.nearblocks.io/v1/fts/wrap.near'
        );
        const { data: dynamicNearData } = await axios.get(
          `https://api3.nearblocks.io/v1/fts/${ft1?.ft_metas?.contract}`
        );

        const {data : dexData} = await axios.get('https://api.dexscreener.com/latest/dex/tokens/babyblackdragon.tkn.near');


        
        const price = dexData?.pairs?.[0]?.priceUsd;
        const nearPrice = Number(
          parseFloat(wrapNearData?.contracts?.[0]?.price).toFixed(2)
        );
        const spent = TotalNDCGained * price;

        if (spent < 5) {
          // console.log("Well didn't reach limit!");
          return;
        }
        let gifLink = 'https://t.me/bdrbotres/24';

        const NDCPrice = (spent / TotalNDCGained).toFixed(11);
        const marketCap = Number(total_supply_api * NDCPrice);
        const fdv = Number(total_supply_api * NDCPrice);
        const bought = new Intl.NumberFormat('en-US').format(
          Math.ceil(TotalNDCGained)
        );

        // console.log(NDCPrice + " " + spent);

        if (ft1 && ndcTknNear && spent) {
          const q = query(
            collection(db, 'topics'),
            where('data', '==', 'buy_bot')
          );
          const querySnapshot = await getDocs(q);

          // console.log('Got Snapshot');

          querySnapshot.forEach((doc) => {
            bot.sendAnimation(doc?.data()?.chat_id, gifLink, {
              caption: `
<b>NEW <a href="${NDCUrl}">BABYBLACKDRAGON</a> Buy!</b>

${'🐲'.repeat(Math.ceil(spent / 5) > 500 ? 500 : Math.ceil(spent / 5))}${
                Math.ceil(spent / 5) > 500 ? '...' : ''
              }

💰 <b>Spent</b>: $${Number(spent.toFixed(2))} (${Number((spent / nearPrice).toFixed(2))} NEAR)
⚫ <b>Bought</b>: ${bought} $BABYBLACKDRAGON
💴 <b>Price</b>: $${NDCPrice}
🔄 <b>Supply</b>: ${Intl.NumberFormat('en-US', {
                notation: 'compact',
                maximumFractionDigits: 2,
              }).format(total_supply_api)}
🏦 <b>MarketCap</b>: $${Intl.NumberFormat('en-US', {
                notation: 'compact',
                maximumFractionDigits: 2,
              }).format(marketCap)}     
🟢 <b>NEAR Price</b>: $${nearPrice}

<a href="https://nearblocks.io/txns/${
                txn.transaction_hash
              }">Tx</a> | <a href="https://twitter.com/babyisnear">X</a> | <a href="https://t.me/babyisnear">Website</a> | <a href="https://t.me/NearoBotUpdates">Updates</a>
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
        holders = _holders;
      });
      if (newTxns.length) {
        lastTxn = newTxns[0]?.transaction_hash;
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
  }, 7000);
})();