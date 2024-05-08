// const fs = require('fs');
// const path = require('path');
// const {
//   collection,
//   onSnapshot,
//   addDoc,
//   deleteDoc,
//   query,
//   where,
//   getDocs,
// } = require('firebase/firestore');
// const { db } = require('./firebase');
// const bot = require('./telegram');
// const puppeteer = require('puppeteer');

// // ! controllers information
// const controllersPath = path.resolve(__dirname, '../data/controllers.json');
// const controllers =
//   JSON.parse(fs.readFileSync(controllersPath, 'utf8') || '[]') || [];

// (async () => {
//   const browser = await puppeteer.launch();
//   onSnapshot(collection(db, 'tweets'), (snapshot) => {
//     snapshot.docs.forEach(async (doc) => {
//       const id = doc.data()?.link?.split('/')?.pop();
//       const page = await browser.newPage();
//       await page.goto(`https://platform.twitter.com/embed/Tweet.html?id=${id}`);
//       let fulfilled = false;
//       while (!fulfilled) {
//         await page.reload({ waitUntil: 'networkidle0' });
//         const likesElem = await page.waitForSelector(
//           '.css-901oao.css-1hf3ou5.r-14j79pv.r-1qd0xha.r-1b43r93.r-b88u0q.r-1cwl3u0.r-13hce6t.r-bcqeeo.r-qvutc0 .css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0'
//         );
//         const likes = await likesElem.evaluate((el) => el.textContent);
//         const endText = likes[likes.length - 1];
//         if (endText === 'K')
//           fulfilled = parseInt(likes) * 1000 >= doc.data()?.likes;
//         else if (endText === 'M')
//           fulfilled = parseInt(likes) * 1000000 >= doc.data()?.likes;
//         else if (endText === 'B')
//           fulfilled = parseInt(likes) * 1000000000 >= doc.data()?.likes;
//         else fulfilled = parseInt(likes) >= doc.data()?.likes;
//       }
//       await page.close();
//       bot.setChatPermissions(doc.data()?.chat_id, {
//         can_invite_users: true,
//         can_send_media_messages: true,
//         can_send_messages: true,
//         can_send_other_messages: true,
//         can_send_audios: true,
//         can_send_polls: true,
//         can_send_documents: true,
//         can_send_photos: true,
//         can_send_videos: true,
//         can_send_video_notes: true,
//         can_send_voice_notes: true,
//         can_add_web_page_previews: true,
//         can_change_info: true,
//         can_manage_topics: true,
//         can_pin_messages: true,
//       });
//       bot.sendMessage(doc.data()?.chat_id, 'Requirement fulfilled.');
//       await deleteDoc(doc.ref);
//     });
//   });
// })();

// bot.onText(/\/lockdown/, async (_msg) => {
//   if (!controllers?.includes(_msg?.from?.id)) return;
//   if (
//     /creator|administrator/.test(
//       (await bot.getChatMember(_msg.chat.id, _msg.from.id)).status
//     ) &&
//     _msg.chat.type !== 'private'
//   ) {
//     bot.setChatPermissions(_msg.chat.id, {
//       can_invite_users: false,
//       can_send_media_messages: false,
//       can_send_messages: false,
//       can_send_other_messages: false,
//       can_send_audios: false,
//       can_send_polls: false,
//       can_send_documents: false,
//       can_send_photos: false,
//       can_send_videos: false,
//       can_send_video_notes: false,
//       can_send_voice_notes: false,
//       can_add_web_page_previews: false,
//       can_change_info: false,
//       can_manage_topics: false,
//       can_pin_messages: false,
//     });

//     bot.sendMessage(_msg.chat.id, 'Enter X link:', {
//       message_thread_id: _msg?.message_thread_id,
//     });

//     let twitterLink = '';
//     let likes = 0;
//     bot.on('message', async (msg) => {
//       if (msg.text?.includes('/cancel')) {
//         return bot.removeListener('message');
//       }
//       if (!twitterLink) {
//         const pattern =
//           /^https:\/\/(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+$/;
//         const link = msg.text?.trim()?.split('?')?.[0];
//         if (pattern.test(link)) {
//           twitterLink = link;
//           bot.sendMessage(msg.chat.id, 'Enter the number of likes required:', {
//             message_thread_id: _msg?.message_thread_id,
//           });
//         } else {
//           bot.sendMessage(msg.chat.id, 'Invalid x link. Enter again:', {
//             message_thread_id: _msg?.message_thread_id,
//           });
//         }
//       } else if (!likes) {
//         if (parseInt(msg.text.trim())) {
//           likes = parseInt(msg.text.trim());
//           await addDoc(collection(db, 'tweets'), {
//             chat_id: msg.chat.id,
//             link: twitterLink,
//             likes,
//           });
//         } else {
//           bot.sendMessage(msg.chat.id, 'Invalid number.', {
//             message_thread_id: _msg?.message_thread_id,
//           });
//         }
//       }
//     });
//   }
// });

// bot.onText(/\/cancel/, async (msg) => {
//   if (
//     /creator|administrator/.test(
//       (await bot.getChatMember(msg.chat.id, msg.from.id)).status
//     ) &&
//     msg.chat.type !== 'private'
//   ) {
//     bot.setChatPermissions(msg.chat.id, {
//       can_invite_users: true,
//       can_send_media_messages: true,
//       can_send_messages: true,
//       can_send_other_messages: true,
//       can_send_audios: true,
//       can_send_polls: true,
//       can_send_documents: true,
//       can_send_photos: true,
//       can_send_videos: true,
//       can_send_video_notes: true,
//       can_send_voice_notes: true,
//       can_add_web_page_previews: true,
//       can_change_info: true,
//       can_manage_topics: true,
//       can_pin_messages: true,
//     });
//     const tweetsRef = collection(db, 'tweets');
//     const q = query(tweetsRef, where('chat_id', '==', msg.chat.id));
//     const querySnapshot = await getDocs(q);

//     if (querySnapshot.empty) return;

//     querySnapshot.forEach(async (doc) => {
//       await deleteDoc(doc.ref);
//     });

//     bot.sendMessage(msg.chat.id, 'Requirement cancelled.', {
//       message_thread_id: msg?.message_thread_id,
//     });
//   }
// });
