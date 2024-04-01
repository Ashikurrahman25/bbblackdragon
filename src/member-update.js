const {
  query,
  where,
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp,
  getDoc,
  deleteDoc,
  updateDoc,
  deleteField,
} = require('firebase/firestore');
const bot = require('./telegram');
const { db } = require('./firebase');
const { createCanvas } = require('canvas');
const portal = require('./portal');

// Function to generate random character
function randomChar() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return chars.charAt(Math.floor(Math.random() * chars.length));
}

// Function to generate random rotation angle
function randomRotation() {
  return Math.random() * 50 - 25;
}

// Function to generate random lines
function drawRandomLines(ctx, width, height, numLines) {
  for (let i = 0; i < numLines; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.strokeStyle = '#00000075';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Function to generate captcha
function generateCaptcha(length) {
  const canvas = createCanvas(length * 30, 50);
  const ctx = canvas.getContext('2d');
  ctx.font = '25px';

  let text = '';

  // Set background color
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw random lines
  drawRandomLines(ctx, canvas.width, canvas.height, 20);

  // Draw captcha characters
  for (let i = 0; i < length; i++) {
    const char = randomChar();
    text += char;
    ctx.font = '25px LiberationSans';
    ctx.fillStyle = '#000';
    const x = i * 30 + 10;
    const y = 30;
    const angle = (randomRotation() * Math.PI) / 180;

    ctx.save(); // Save the current state
    ctx.translate(x, y); // Translate to the character's position
    ctx.rotate(angle); // Rotate around the character's center
    ctx.fillText(char, -ctx.measureText(char).width / 2, 0); // Draw the character centered
    ctx.restore(); // Restore the previous state
  }
  return { buffer: canvas.toBuffer(), text };
}

bot.on('left_chat_member', async (msg) => {
  try {
    await bot.deleteMessage(msg?.chat?.id, msg?.message_id);
    if (msg?.left_chat_member?.is_bot) {
      if ((await bot.getMe())?.username === msg?.left_chat_member?.username) {
        const commands = await getDocs(
          query(
            collection(db, 'commands'),
            where('chat_id', '==', msg?.chat?.id)
          )
        );
        commands.forEach(async (doc) => await deleteDoc(doc.ref));
        await deleteDoc(doc(db, 'configs', msg?.chat?.id?.toString()));
        const members = await getDocs(
          query(
            collection(db, 'members'),
            where('chat_id', '==', msg?.chat?.id)
          )
        );
        members.forEach(async (doc) => await deleteDoc(doc.ref));
        const topics = await getDocs(
          query(collection(db, 'topics'), where('chat_id', '==', msg?.chat?.id))
        );
        topics.forEach(async (doc) => await deleteDoc(doc.ref));
      }
    } else {
      await deleteDoc(
        doc(db, 'members', `${msg?.left_chat_member?.id}&${msg?.chat?.id}`)
      );
    }
  } catch (error) {
    console.log(error);
  }
});

bot.on('new_chat_members', async (msg) => {
  try {
    await bot.deleteMessage(msg?.chat?.id, msg?.message_id);
    const botConfig = await getDoc(
      doc(db, 'configs', msg?.chat?.id?.toString())
    );
    const isPortal = botConfig?.data()?.isPortal;
    const captcha = await getDoc(
      doc(db, 'captchas', msg?.chat?.id?.toString())
    );

    const welcomeMessage = await getDoc(
      doc(db, 'welcomeMessages', msg?.chat?.id?.toString())
    );

    msg?.new_chat_members?.forEach(async (member) => {
      try {
        if (!member?.is_bot && isPortal) {
          await setDoc(doc(db, 'members', `${member?.id}&${msg.chat?.id}`), {
            chat_id: msg.chat.id,
            username: member?.username || null,
            first_name: member?.first_name || null,
            joined_at: Timestamp?.now() || null,
            is_verified: true,
          });
          if (welcomeMessage?.exists()) {
            welcomeMessage
              ?.data()
              ?.message_thread_id?.forEach(async (threadId) => {
                const msgText = welcomeMessage
                  ?.data()
                  ?.text?.replace(
                    /{username}/g,
                    `@${member?.username}` || member?.first_name
                  )
                  ?.replace(/{first_name}/g, member?.first_name)
                  ?.replace(/{last_name}/g, member?.last_name)
                  ?.replace(/{group_name}/g, msg?.chat?.title);

                const sendMsg = await bot.sendMessage(
                  msg?.chat?.id,
                  msgText,
                  {
                     message_thread_id: threadId
                  }
                );

                setTimeout(() => {
                  bot.deleteMessage(sendMsg?.chat?.id, sendMsg?.message_id);
                }, 10000);
              });
          }
          // const q = query(
          //   collection(db, 'topics'),
          //   where('data', '==', 'welcome_message'),
          //   where('chat_id', '==', msg?.chat?.id)
          // );
          // const querySnapshot = await getDocs(q);
          // querySnapshot.forEach((doc) => {
          //   bot.sendMessage(
          //     doc?.data()?.chat_id,
          //     `${member?.username || member?.first_name} Welcome`,
          //     { message_thread_id: doc?.data()?.message_thread_id }
          //   );
          // });
          return;
        }
        if (!member?.is_bot && captcha?.data()?.status && !isPortal) {
          bot.restrictChatMember(msg?.chat?.id, member?.id, {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
          });
          let verifyMsg;
          if (captcha?.data()?.media_type === 'photo') {
            verifyMsg = await bot.sendPhoto(
              msg.chat.id,
              captcha?.data()?.media,
              {
                caption:
                  captcha
                    ?.data()
                    ?.text.replace(
                      /{username}/g,
                      `@${member?.username}` || member?.first_name
                    )
                    ?.replace(/{first_name}/g, member?.first_name)
                    ?.replace(/{last_name}/g, member?.last_name)
                    ?.replace(/{group_name}/g, msg?.chat?.title) +
                  `
\nThis message will be deleted after 5 minutes.
                  `,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: captcha?.data()?.button,
                        url: `http://t.me/${
                          (
                            await bot?.getMe()
                          ).username
                        }?start=${msg.chat.id}`,
                      },
                    ],
                  ],
                },
              }
            );
          } else if (captcha?.data()?.media_type === 'video') {
            verifyMsg = await bot.sendVideo(
              msg.chat.id,
              captcha?.data()?.media,
              {
                caption:
                  captcha
                    ?.data()
                    ?.text.replace(
                      /{username}/g,
                      `@${member?.username}` || member?.first_name
                    )
                    ?.replace(/{first_name}/g, member?.first_name)
                    ?.replace(/{last_name}/g, member?.last_name)
                    ?.replace(/{group_name}/g, msg?.chat?.title) +
                  `
\nThis message will be deleted after 5 minutes.
                  `,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: captcha?.data()?.button,
                        url: `http://t.me/${
                          (
                            await bot?.getMe()
                          ).username
                        }?start=${msg.chat.id}`,
                      },
                    ],
                  ],
                },
              }
            );
          } else if (captcha?.data()?.media_type === 'animation') {
            verifyMsg = await bot.sendAnimation(
              msg.chat.id,
              captcha?.data()?.media,
              {
                caption:
                  captcha
                    ?.data()
                    ?.text.replace(
                      /{username}/g,
                      `@${member?.username}` || member?.first_name
                    )
                    ?.replace(/{first_name}/g, member?.first_name)
                    ?.replace(/{last_name}/g, member?.last_name)
                    ?.replace(/{group_name}/g, msg?.chat?.title) +
                  `
\nThis message will be deleted after 5 minutes.
                  `,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: captcha?.data()?.button,
                        url: `http://t.me/${
                          (
                            await bot?.getMe()
                          ).username
                        }?start=${msg.chat.id}`,
                      },
                    ],
                  ],
                },
              }
            );
          }
          setTimeout(async () => {
            if (verifyMsg?.message_id) {
              await bot.deleteMessage(msg?.chat?.id, verifyMsg?.message_id);
            }
          }, 5 * 60 * 1000); // 5 minutes
          await setDoc(doc(db, 'members', `${member?.id}&${msg.chat?.id}`), {
            chat_id: msg.chat.id,
            username: member?.username || null,
            first_name: member?.first_name || null,
            joined_at: Timestamp?.now() || null,
            is_verified: false,
            verifyMsgId: isPortal ? null : verifyMsg?.message_id,
          });
        } else {
          await setDoc(doc(db, 'members', `${member?.id}&${msg.chat?.id}`), {
            chat_id: msg.chat.id,
            username: member?.username || null,
            first_name: member?.first_name || null,
            joined_at: Timestamp?.now() || null,
            is_verified: true,
          });

          if (welcomeMessage?.exists()) {
            welcomeMessage
              ?.data()
              ?.message_thread_id?.forEach(async (threadId) => {
                const msgText = welcomeMessage
                  ?.data()
                  ?.text?.replace(
                    /{username}/g,
                    `@${member?.username}` || member?.first_name
                  )
                  ?.replace(/{first_name}/g, member?.first_name)
                  ?.replace(/{last_name}/g, member?.last_name)
                  ?.replace(/{group_name}/g, msg?.chat?.title);

                const sendMsg = await bot.sendMessage(
                  msg?.chat?.id,
                  msgText,
                  {
                    message_thread_id: threadId
                  }
                );

                setTimeout(() => {
                  bot.deleteMessage(sendMsg?.chat?.id, sendMsg?.message_id);
                }, 10000);
              });
          }
        }
      } catch (error) {
        // console.log(error);
      }
    });
  } catch (error) {
    // console.log(error);
  }
});

bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = parseInt(msg?.text?.split(' ')[1]);
    if (chatId) {
      const groupInfo = await bot.getChat(chatId);
      const botConfig = await getDoc(doc(db, 'configs', chatId?.toString()));
      const captcha = await getDoc(doc(db, 'captchas', chatId?.toString()));
      const isPortal = botConfig?.data()?.isPortal;

      const tempLink = await bot.createChatInviteLink(chatId, {
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 120,
      });

      if (captcha?.data()?.status || isPortal) {
        const member = await getDoc(
          doc(db, 'members', `${msg?.chat?.id}&${chatId}`)
        );
        if (member?.data()?.is_verified) {
          await updateDoc(doc(db, 'members', `${msg?.chat?.id}&${chatId}`), {
            is_verified: true,
          });
          if (captcha?.data()?.media_type === 'photo') {
            return bot.sendPhoto(msg?.chat?.id, captcha?.data()?.media, {
              caption: `You have already passed the verification test.
Click below to join ${groupInfo?.title}.
        `,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Click here to join',
                      url: tempLink.invite_link,
                    },
                  ],
                ],
              },
            });
          } else if (captcha?.data()?.media_type === 'video') {
            return bot.sendVideo(msg?.chat?.id, captcha?.data()?.media, {
              caption: `You have already passed the verification test.
Click below to join ${groupInfo?.title}.
        `,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Click here to join',
                      url: tempLink.invite_link,
                    },
                  ],
                ],
              },
            });
          } else if (captcha?.data()?.media_type === 'animation') {
            return bot.sendAnimation(msg?.chat?.id, captcha?.data()?.media, {
              caption: `You have already passed the verification test.
Click below to join ${groupInfo?.title}.
        `,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Click here to join',
                      url: tempLink.invite_link,
                    },
                  ],
                ],
              },
            });
          } else {
            return bot.sendMessage(
              msg?.chat?.id,
              `You have already passed the verification test.
Click below to join ${groupInfo?.title}.
        `,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Click here to join',
                        url: tempLink.invite_link,
                      },
                    ],
                  ],
                },
              }
            );
          }
        }

        let attempts = 0;
        let captchaBuffer = generateCaptcha(6);
        const sendCaptcha = async (captcha) => {
          attempts++;
          try {
            if (attempts > 5) {
              await bot.sendMessage(
                msg?.chat?.id,
                `
Sorry ${
                  msg?.chat?.username || msg?.chat?.first_name
                }, you have failed the verification test.
                `
              );
              await bot.banChatMember(chatId, msg?.chat?.id, {
                revoke_messages: true,
              });
              bot.removeListener('message');
              return;
            }
            await bot.sendPhoto(msg?.chat?.id, captcha.buffer, {
              caption: `
You have ${6 - attempts} attempt${6 - attempts > 1 ? 's' : ''} left.

${
  msg?.chat?.username ? `@${msg.chat.username}` : msg?.chat?.first_name
} requires you to pass a verification test to join ${groupInfo?.title}.

Enter the text in the image below to verify you're human.
  `,
            });
          } catch (error) {}
        };
        await sendCaptcha(captchaBuffer);
        bot.on('message', async (_msg) => {
          if (_msg?.chat?.id !== msg?.chat?.id) return;
          if (_msg?.text === captchaBuffer.text) {
            bot.restrictChatMember(chatId, msg?.chat?.id, {
              can_send_messages: true,
              can_send_media_messages: true,
              can_send_other_messages: true,
              can_add_web_page_previews: true,
            });
            if (isPortal)
              await setDoc(doc(db, 'members', `${_msg?.chat?.id}&${chatId}`), {
                chat_id: chatId,
                username: _msg?.chat?.username || null,
                first_name: _msg?.chat?.first_name || null,
                joined_at: Timestamp?.now() || null,
                is_verified: true,
                verifyMsgId: null,
              });
            else
              await updateDoc(
                doc(db, 'members', `${_msg?.chat?.id}&${chatId}`),
                {
                  is_verified: true,
                  verifyMsgId: deleteField(),
                }
              );
            if (member?.data()?.verifyMsgId)
              await bot.deleteMessage(chatId, member?.data()?.verifyMsgId);

            if (captcha?.data()?.media_type === 'photo') {
              bot.sendPhoto(_msg?.chat?.id, captcha?.data()?.media, {
                caption: `You have passed the verification test.
Click below to join ${groupInfo?.title}.
            `,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Click here to join',
                        url: tempLink.invite_link,
                      },
                    ],
                  ],
                },
              });
            } else if (captcha?.data()?.media_type === 'video') {
              bot.sendVideo(_msg?.chat?.id, captcha?.data()?.media, {
                caption: `You have passed the verification test.
Click below to join ${groupInfo?.title}.
            `,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Click here to join',
                        url: tempLink.invite_link,
                      },
                    ],
                  ],
                },
              });
            } else if (captcha?.data()?.media_type === 'animation') {
              bot.sendAnimation(_msg?.chat?.id, captcha?.data()?.media, {
                caption: `You have passed the verification test.
Click below to join ${groupInfo?.title}.
            `,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Click here to join',
                        url: tempLink.invite_link,
                      },
                    ],
                  ],
                },
              });
            } else {
              bot.sendMessage(
                _msg?.chat?.id,
                `You have passed the verification test.
Click below to join ${groupInfo?.title}.
            `,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: 'Click here to join',
                          url: tempLink.invite_link,
                        },
                      ],
                    ],
                  },
                }
              );
            }
            bot.removeListener('message');
          } else {
            captchaBuffer = generateCaptcha(6);
            sendCaptcha(captchaBuffer);
            // bot.sendMessage(
            //   _msg?.chat?.id,
            //   `Sorry ${
            //     _msg?.chat?.username || _msg?.chat?.first_name
            //   }, you have failed the verification test.`
            // );
            // bot.banChatMember(chatId, _msg?.chat?.id, {
            //   revoke_messages: true,
            // });
          }
        });
      } else {
        bot.sendPhoto(
          msg?.chat?.id,
          'https://t.me/regex_ulala_ulala_regex_404/6',
          {
            caption: `Click below to join ${groupInfo?.title}.
      `,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Click here to join',
                    url: tempLink.invite_link,
                  },
                ],
              ],
            },
          }
        );
      }
    } else {
      if (msg.chat.type === 'private') {
        return bot.sendMessage(
          msg?.chat?.id,
          `
<b>${(await bot.getMe())?.username} Quick Setup</b>

You can SETUP your <b>${
            (await bot.getMe())?.username || (await bot.getMe())?.first_name
          }</b> in your group.

First add ${
            (await bot.getMe())?.username || (await bot.getMe())?.first_name
          } to your group as admin.

1. use <code>/setup</code> for Portal, Welcome Message, Buy Bot & enable or disable Captcha.
<em>(${
            (await bot.getMe())?.username || (await bot.getMe())?.first_name
          } admins can setup the buy bot for now)</em>
2. use <code>/lockdown</code> for lock sending messages until a milestone fulfilled in Twitter or X
3. use <code>/cancel</code> for unlock sending messages.
4. use <code>/command</code> for setting up custom command
  - <code>/command</code> [name] [message]
  - <code>/command</code> (this will show all available commands)
5. use <code>/remove</code> for removing a custom command
  - <code>/remove</code> [name]

To access Setup Menu

You can setup portal, change the welcome message, captcha for a group from here. Using <code>/setup</code>
`,
          { parse_mode: 'HTML' }
        );
      }
      // portal(msg);
    }
  } catch (error) {
    // console.log(error);
  }
});
