const bot = require('./telegram');
const { doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');
const { db } = require('./firebase');

bot.on('message', async (msg) => {
  // console.log(msg);
  // const member = await getDoc(
  //   doc(db, 'members', `${msg?.from?.id}&${msg?.chat?.id}`)
  // );

  // if (
  //   !member.exists() &&
  //   !msg?.from?.is_bot &&
  //   !msg?.left_chat_member &&
  //   !msg?.new_chat_members
  // ) {
  //   await setDoc(doc(db, 'members', `${msg?.from?.id}&${msg?.chat?.id}`), {
  //     chat_id: msg.chat.id,
  //     username: msg?.from?.username,
  //     first_name: msg?.from?.first_name,
  //     joined_at: Timestamp.now(),
  //     is_verified: true,
  //   });
  // }
});
