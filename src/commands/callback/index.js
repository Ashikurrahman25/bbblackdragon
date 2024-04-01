const fs = require('fs');
const path = require('path');
const bot = require('../../telegram');
const {
  query,
  collection,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  Timestamp,
} = require('firebase/firestore');
const { db } = require('../../firebase');
const portal = require('../../portal');

// ! controllers information
const controllersPath = path.resolve(
  __dirname,
  '../../../data/controllers.json'
);
const controllers =
  JSON.parse(fs.readFileSync(controllersPath, 'utf8') || '[]') || [];

bot.on('callback_query', async (_query) => {
  try {
    // ! for transaction information callback
    if (
      /creator|administrator/.test(
        (await bot.getChatMember(_query.message?.chat?.id, _query.from?.id))
          .status
      ) &&
      _query.message?.chat?.type !== 'private'
    ) {
      if (_query.data === 'buy_bot') {
        if (controllers?.includes(_query?.from?.id)) {
          bot.sendMessage(
            _query.message.chat.id,
            'Enable or Disable Buy Bot?',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Enable',
                      callback_data: 'enable_buy_bot',
                    },
                    {
                      text: 'Disable',
                      callback_data: 'disable_buy_bot',
                    },
                  ],
                ],
              },
              message_thread_id: _query.message.message_thread_id,
            }
          );
          bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        } else {
          bot.answerCallbackQuery(_query.id);
          bot.sendMessage(
            _query.message.chat.id,
            `Only ${
              (await bot.getMe())?.username || (await bot.getMe())?.first_name
            } admins can setup the buy bot for now.`
          );
        }
      } else if (_query.data === 'enable_buy_bot') {
        if (_query?.message?.is_topic_message) {
          const q = query(
            collection(db, 'topics'),
            where('data', '==', 'buy_bot'),
            where('chat_id', '==', _query?.message?.chat?.id),
            where(
              'message_thread_id',
              '==',
              _query?.message?.reply_to_message?.message_thread_id
            )
          );
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            await addDoc(collection(db, 'topics'), {
              chat_id: _query?.message?.chat?.id,
              message_thread_id:
                _query?.message?.reply_to_message?.message_thread_id,
              data: 'buy_bot',
            });
            bot.sendMessage(
              _query?.message?.chat?.id,
              'Buy Bot will be sent here from now on.',
              {
                message_thread_id:
                  _query?.message?.reply_to_message?.message_thread_id,
              }
            );
          }
        } else {
          const q = query(
            collection(db, 'topics'),
            where('data', '==', 'buy_bot'),
            where('chat_id', '==', _query?.message?.chat?.id)
          );
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            await addDoc(collection(db, 'topics'), {
              chat_id: _query?.message?.chat?.id,
              data: 'buy_bot',
            });
            bot.sendMessage(
              _query?.message?.chat?.id,
              'Buy Bot will be sent here from now on.',
              {
                message_thread_id: _query.message.message_thread_id,
              }
            );
          }
        }
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      } else if (_query.data === 'disable_buy_bot') {
        if (_query?.message?.is_topic_message) {
          const q = query(
            collection(db, 'topics'),
            where('data', '==', 'buy_bot'),
            where('chat_id', '==', _query?.message?.chat?.id),
            where(
              'message_thread_id',
              '==',
              _query?.message?.reply_to_message?.message_thread_id
            )
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
            bot.sendMessage(
              _query?.message?.chat?.id,
              'Buy Bot has been revoked.',
              {
                message_thread_id:
                  _query?.message?.reply_to_message?.message_thread_id,
              }
            );
          });
        } else {
          const q = query(
            collection(db, 'topics'),
            where('data', '==', 'buy_bot'),
            where('chat_id', '==', _query?.message?.chat?.id)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
            bot.sendMessage(
              _query?.message?.chat?.id,
              'Buy Bot has been revoked.',
              {
                message_thread_id: _query.message.message_thread_id,
              }
            );
          });
        }
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      }
      // ! for welcome message callback
      else if (_query.data === 'welcome_message') {
        bot.sendMessage(
          _query.message.chat.id,
          'Enable or Disable Welcome Message?',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Enable',
                    callback_data: 'enable_welcome_message',
                  },
                  {
                    text: 'Disable',
                    callback_data: 'disable_welcome_message',
                  },
                ],
              ],
            },
            message_thread_id: _query.message.message_thread_id,
          }
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      } else if (_query.data === 'enable_welcome_message') {
        const welcomeMessage = await getDoc(
          doc(db, 'welcomeMessages', _query?.message?.chat?.id?.toString())
        );
        if (!welcomeMessage.exists()) {
          await setDoc(
            doc(db, 'welcomeMessages', _query?.message?.chat?.id?.toString()),
            {
              created_at: Timestamp.now(),
              chat_id: _query?.message?.chat?.id,
              text: 'Welcome {username} to {group_name}',
              message_thread_id: [_query?.message?.message_thread_id || null],
            }
          );
        } else if (
          !welcomeMessage
            ?.data()
            ?.message_thread_id?.includes(
              _query?.message?.message_thread_id || null
            )
        ) {
          await updateDoc(
            doc(db, 'welcomeMessages', _query?.message?.chat?.id?.toString()),
            {
              message_thread_id: [
                ...welcomeMessage?.data()?.message_thread_id,
                _query?.message?.message_thread_id || null,
              ],
            }
          );
        }
        bot.sendMessage(
          _query?.message?.chat?.id,
          'Welcome Message will be sent here from now on.',
          { message_thread_id: _query.message.message_thread_id }
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      } else if (_query.data === 'disable_welcome_message') {
        const welcomeMessage = await getDoc(
          doc(db, 'welcomeMessages', _query?.message?.chat?.id?.toString())
        );
        if (welcomeMessage.exists()) {
          await updateDoc(
            doc(db, 'welcomeMessages', _query?.message?.chat?.id?.toString()),
            {
              message_thread_id: welcomeMessage
                ?.data()
                ?.message_thread_id?.filter(
                  (id) => id !== (_query?.message?.message_thread_id || null)
                ),
            }
          );
        }
        bot.sendMessage(
          _query?.message?.chat?.id,
          'Welcome Message has been revoked.',
          { message_thread_id: _query.message.message_thread_id }
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      }
      // ! for captcha callback
      else if (_query.data === 'captcha') {
        bot.sendMessage(_query.message.chat.id, 'Enable or Disable Captcha?', {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Enable',
                  callback_data: 'enable_captcha',
                },
                {
                  text: 'Disable',
                  callback_data: 'disable_captcha',
                },
              ],
            ],
          },
          message_thread_id: _query.message.message_thread_id,
        });
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      } else if (_query.data === 'enable_captcha') {
        const docRef = doc(
          db,
          'captchas',
          _query?.message?.chat?.id?.toString()
        );
        const captcha = await getDoc(docRef);
        if (!captcha.exists()) {
          await setDoc(docRef, {
            chat_id: _query?.message?.chat?.id,
            media: 'https://t.me/regex_ulala_ulala_regex_404/6',
            media_type: 'photo',
            text: '{username} requires verification to join',
            button: 'Verify',
            status: true,
          });
        } else {
          await updateDoc(docRef, { status: true });
        }
        bot.sendMessage(
          _query?.message?.chat?.id,
          'Captcha has been enabled.',
          {
            message_thread_id:
              _query?.message?.reply_to_message?.message_thread_id,
          }
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      } else if (_query.data === 'disable_captcha') {
        const docRef = doc(
          db,
          'captchas',
          _query?.message?.chat?.id?.toString()
        );
        const captcha = await getDoc(docRef);
        if (captcha.exists()) await updateDoc(docRef, { status: false });
        bot.sendMessage(
          _query?.message?.chat?.id,
          'Captcha has been disabled.',
          {
            message_thread_id:
              _query?.message?.reply_to_message?.message_thread_id,
          }
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      }
      // ! for portal callback
      else if (_query.data === 'portal') {
        bot.sendMessage(_query.message.chat.id, 'Enable or Disable Portal?', {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Enable',
                  callback_data: 'enable_portal',
                },
                {
                  text: 'Disable',
                  callback_data: 'disable_portal',
                },
              ],
            ],
          },
          message_thread_id: _query.message.message_thread_id,
        });
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      } else if (_query.data === 'enable_portal') {
        const docRef = doc(
          db,
          'configs',
          _query?.message?.chat?.id?.toString()
        );
        await updateDoc(docRef, { isPortal: true });
        bot.sendMessage(_query?.message?.chat?.id, 'Portal has been enabled.', {
          message_thread_id:
            _query?.message?.reply_to_message?.message_thread_id,
        });
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      } else if (_query.data === 'disable_portal') {
        const docRef = doc(
          db,
          'configs',
          _query?.message?.chat?.id?.toString()
        );
        await updateDoc(docRef, { isPortal: false });
        bot.sendMessage(
          _query?.message?.chat?.id,
          'Portal has been disabled.',
          {
            message_thread_id:
              _query?.message?.reply_to_message?.message_thread_id,
          }
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      }
    } else if (_query?.message?.chat?.type === 'private') {
      // ! for setup portal callback
      if (_query.data === 'setup_portal') {
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        portal(_query.message);
      } else if (/edit_portal_media&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'portals', chat_id);
        bot.sendMessage(
          _query.message.chat.id,
          '⚙️ Send portal media to use (Photo, gif or video)'
        );
        bot.answerCallbackQuery(_query.id);
        bot.on('message', async (msg, match) => {
          if (msg?.from?.id !== _query?.from?.id) return;
          if (match.type === 'photo') {
            await updateDoc(docRef, {
              chat_id,
              media: msg.photo[0].file_id,
              media_type: 'photo',
            });
            bot.sendMessage(
              _query.message.chat.id,
              'Portal media has been updated successfully.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Edit Media',
                        callback_data: `edit_portal_media&${chat_id}`,
                      },
                      {
                        text: 'Edit Text',
                        callback_data: `edit_portal_text&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Edit Button',
                        callback_data: `edit_portal_button&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Create Portal',
                        callback_data: `create_portal&${chat_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            bot.removeListener('message');
          } else if (match.type === 'animation') {
            await updateDoc(docRef, {
              chat_id,
              media: msg.animation.file_id,
              media_type: 'animation',
            });
            bot.sendMessage(
              _query.message.chat.id,
              'Portal media has been updated successfully.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Edit Media',
                        callback_data: `edit_portal_media&${chat_id}`,
                      },
                      {
                        text: 'Edit Text',
                        callback_data: `edit_portal_text&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Edit Button',
                        callback_data: `edit_portal_button&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Create Portal',
                        callback_data: `create_portal&${chat_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            bot.removeListener('message');
          } else if (match.type === 'video') {
            await updateDoc(docRef, {
              chat_id,
              media: msg.video.file_id,
              media_type: 'video',
            });
            bot.sendMessage(
              _query.message.chat.id,
              'Portal media has been updated successfully.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Edit Media',
                        callback_data: `edit_portal_media&${chat_id}`,
                      },
                      {
                        text: 'Edit Text',
                        callback_data: `edit_portal_text&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Edit Button',
                        callback_data: `edit_portal_button&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Create Portal',
                        callback_data: `create_portal&${chat_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            bot.removeListener('message');
          } else {
            bot.sendMessage(
              _query.message.chat.id,
              '⚠️ Send a valid media type (Photo, gif or video)'
            );
          }
          bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        });
      } else if (/edit_portal_text&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'portals', chat_id);
        bot.sendMessage(_query.message.chat.id, '⚙️ Send portal text to use');
        bot.answerCallbackQuery(_query.id);
        bot.on('message', async (msg) => {
          if (msg?.from?.id !== _query?.from?.id) return;
          await updateDoc(docRef, {
            chat_id,
            text: msg.text,
          });
          bot.sendMessage(
            _query.message.chat.id,
            'Portal text has been updated successfully.',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Edit Media',
                      callback_data: `edit_portal_media&${chat_id}`,
                    },
                    {
                      text: 'Edit Text',
                      callback_data: `edit_portal_text&${chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Edit Button',
                      callback_data: `edit_portal_button&${chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Create Portal',
                      callback_data: `create_portal&${chat_id}`,
                    },
                  ],
                ],
              },
            }
          );
          bot.removeListener('message');
          bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        });
      } else if (/edit_portal_button&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'portals', chat_id?.toString());
        bot.sendMessage(
          _query.message.chat.id,
          '⚙️ Send portal button text to use'
        );
        bot.answerCallbackQuery(_query.id);
        bot.on('message', async (msg) => {
          if (msg?.from?.id !== _query?.from?.id) return;
          await updateDoc(docRef, {
            chat_id,
            button: msg.text,
          });
          bot.sendMessage(
            _query.message.chat.id,
            'Portal button text has been updated successfully.',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Edit Media',
                      callback_data: `edit_portal_media&${chat_id}`,
                    },
                    {
                      text: 'Edit Text',
                      callback_data: `edit_portal_text&${chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Edit Button',
                      callback_data: `edit_portal_button&${chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Create Portal',
                      callback_data: `create_portal&${chat_id}`,
                    },
                  ],
                ],
              },
            }
          );
          bot.removeListener('message');
          bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        });
      } else if (/create_portal&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'portals', chat_id?.toString());
        const portal = await getDoc(docRef);
        if (portal?.data()?.message_id) {
          try {
            await bot.deleteMessage(
              portal?.data()?.channel_id,
              portal?.data()?.message_id
            );
          } catch (error) {}
        }

        bot.answerCallbackQuery(_query.id);
        if (portal?.exists()) {
          try {
            const configDoc = doc(
              db,
              'configs',
              portal?.data()?.group_id?.toString()
            );
            const config = await getDoc(configDoc);
            if (!config.exists()) {
              await setDoc(configDoc, {
                chat_id,
                isPortal: true,
              });

              await bot.sendMessage(
                _query.message.chat.id,
                'Your portal has been created!'
              );
            } else {
              await updateDoc(configDoc, {
                isPortal: true,
              });

              await bot.sendMessage(
                _query.message.chat.id,
                'Your portal has been updated!'
              );
            }
          } catch (error) {}
        }

        if (portal?.data()?.media_type === 'photo') {
          try {
            const m = await bot.sendPhoto(
              portal?.data()?.channel_id,
              portal?.data()?.media,
              {
                caption: portal?.data()?.text,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: portal.data().button,
                        url: `https://t.me/${
                          (
                            await bot.getMe()
                          ).username
                        }?start=${portal?.data()?.group_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            await updateDoc(docRef, {
              message_id: m.message_id,
            });
          } catch (error) {}
        } else if (portal?.data()?.media_type === 'animation') {
          try {
            const m = await bot.sendAnimation(
              portal?.data()?.channel_id,
              portal?.data()?.media,
              {
                caption: portal?.data()?.text,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: portal.data().button,
                        url: `https://t.me/${
                          (
                            await bot.getMe()
                          ).username
                        }?start=${portal?.data()?.group_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            await updateDoc(docRef, {
              message_id: m.message_id,
            });
          } catch (error) {}
        } else if (portal?.data()?.media_type === 'video') {
          try {
            const m = await bot.sendVideo(
              portal?.data()?.channel_id,
              portal?.data()?.media,
              {
                caption: portal?.data()?.text,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: portal.data().button,
                        url: `https://t.me/${
                          (
                            await bot.getMe()
                          ).username
                        }?start=${portal?.data()?.group_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            await updateDoc(docRef, {
              message_id: m.message_id,
            });
          } catch (error) {}
        } else {
          try {
            const m = await bot.sendPhoto(
              portal?.data()?.channel_id,
              portal?.data()?.media,
              {
                caption: portal?.data()?.text,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: portal.data().button,
                        url: `https://t.me/${
                          (
                            await bot.getMe()
                          ).username
                        }?start=${portal?.data()?.group_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            await updateDoc(docRef, {
              message_id: m.message_id,
            });
          } catch (error) {}
        }
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      }
      // ! for welcome message callback
      else if (_query.data === 'edit_welcome_message') {
        bot.answerCallbackQuery(_query.id);
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        bot.sendMessage(
          _query.message.chat.id,
          `
⚙️ Select a group to edit welcome message

You can use the following variables in your welcome message:
- {username} = username
- {first_name} = first name
- {last_name} = last name
- {group_name} = group name

<em>(${(await bot.getMe())?.username} will be automatically added as admin)</em>
        `,
          {
            parse_mode: 'HTML',
            reply_markup: {
              resize_keyboard: true,
              remove_keyboard: true,
              keyboard: [
                [
                  {
                    text: 'Choose a group',
                    request_chat: {
                      request_id: 3,
                      chat_is_channel: false,
                      bot_is_member: true,
                      chat_is_created: true,
                      bot_administrator_rights: {
                        can_manage_chat: true,
                        can_delete_messages: true,
                        can_manage_video_chats: true,
                        can_restrict_members: true,
                        can_promote_members: true,
                        can_change_info: true,
                        can_invite_users: true,
                        can_post_stories: true,
                        can_edit_stories: true,
                        can_delete_stories: true,
                        can_post_messages: true,
                        can_edit_messages: true,
                        can_pin_messages: true,
                        can_manage_topics: true,
                      },
                      user_administrator_rights: {
                        can_manage_chat: true,
                        can_delete_messages: true,
                        can_manage_video_chats: true,
                        can_restrict_members: true,
                        can_promote_members: true,
                        can_change_info: true,
                        can_invite_users: true,
                        can_post_stories: true,
                        can_edit_stories: true,
                        can_delete_stories: true,
                        can_post_messages: true,
                        can_edit_messages: true,
                        can_pin_messages: true,
                        can_manage_topics: true,
                      },
                    },
                  },
                ],
              ],
            },
          }
        );
        bot.on('message', async (_msg) => {
          if (_query?.from?.id !== _msg?.from?.id) return;
          if (_msg?.chat_shared) {
            if (_msg?.chat_shared?.request_id === 3) {
              const groupInfo = await bot.getChat(_msg?.chat_shared?.chat_id);
              bot.deleteMessage(_msg?.chat?.id, _msg?.message_id);
              const welcomeMessageExists = await getDoc(
                doc(
                  db,
                  'welcomeMessages',
                  _msg?.chat_shared?.chat_id?.toString()
                )
              );
              await setDoc(
                doc(
                  db,
                  'welcomeMessages',
                  _msg?.chat_shared?.chat_id?.toString()
                ),
                {
                  created_at: Timestamp.now(),
                  chat_id: _msg?.chat_shared?.chat_id,
                  text:
                    welcomeMessageExists?.data()?.text ||
                    'Welcome {username} to {group_name}',
                  media_type:
                    welcomeMessageExists?.data()?.media_type || 'photo',
                  message_thread_id:
                    welcomeMessageExists?.data()?.message_thread_id || [],
                }
              );

              bot.sendMessage(
                _query.message?.chat?.id,
                `
<b>Welcome message setup is almost done for ${groupInfo?.title}</b>

Customize your welcome message to your liking and press 'Create Welcome Message' to make the welcome message
              `,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: 'Edit Text',
                          callback_data: `edit_welcome_text&${_msg?.chat_shared?.chat_id}`,
                        },
                      ],
                      [
                        {
                          text: 'Create Welcome Message',
                          callback_data: `create_welcome_message&${_msg?.chat_shared?.chat_id}`,
                        },
                      ],
                    ],
                  },
                }
              );
            }
          }
          bot.removeListener('message');
        });
      } else if (/edit_welcome_text&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'welcomeMessages', chat_id);
        bot.sendMessage(
          _query.message.chat.id,
          `
⚙️ Send welcome text to use

You can use the following variables in your welcome message:
- {username} = username
- {first_name} = first name
- {last_name} = last name
- {group_name} = group name
`
        );
        bot.answerCallbackQuery(_query.id);
        bot.on('message', async (msg) => {
          if (_query?.from?.id !== msg?.from?.id) return;
          await updateDoc(docRef, {
            chat_id,
            text: msg.text,
          });
          bot.sendMessage(
            _query.message.chat.id,
            'Welcome text has been updated successfully.',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Edit Text',
                      callback_data: `edit_welcome_text&${chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Create Welcome Message',
                      callback_data: `create_welcome_message&${chat_id}`,
                    },
                  ],
                ],
              },
            }
          );
          bot.removeListener('message');
          bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        });
      } else if (/create_welcome_message&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        bot.sendMessage(
          _query.message.chat.id,
          'Your welcome message has been created!'
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      }
      // ! for captcha callback
      else if (_query.data === 'edit_captcha') {
        bot.answerCallbackQuery(_query.id);
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        bot.sendMessage(
          _query.message.chat.id,
          `
⚙️ Select a group to edit captcha

You can use the following variables in your captcha message:
- {username} = username
- {first_name} = first name
- {last_name} = last name
- {group_name} = group name

<em>(${(await bot.getMe())?.username} will be automatically added as admin)</em>
`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              resize_keyboard: true,
              remove_keyboard: true,
              keyboard: [
                [
                  {
                    text: 'Choose a group',
                    request_chat: {
                      request_id: 4,
                      chat_is_channel: false,
                      bot_is_member: true,
                      chat_is_created: true,
                      bot_administrator_rights: {
                        can_manage_chat: true,
                        can_delete_messages: true,
                        can_manage_video_chats: true,
                        can_restrict_members: true,
                        can_promote_members: true,
                        can_change_info: true,
                        can_invite_users: true,
                        can_post_stories: true,
                        can_edit_stories: true,
                        can_delete_stories: true,
                        can_post_messages: true,
                        can_edit_messages: true,
                        can_pin_messages: true,
                        can_manage_topics: true,
                      },
                      user_administrator_rights: {
                        can_manage_chat: true,
                        can_delete_messages: true,
                        can_manage_video_chats: true,
                        can_restrict_members: true,
                        can_promote_members: true,
                        can_change_info: true,
                        can_invite_users: true,
                        can_post_stories: true,
                        can_edit_stories: true,
                        can_delete_stories: true,
                        can_post_messages: true,
                        can_edit_messages: true,
                        can_pin_messages: true,
                        can_manage_topics: true,
                      },
                    },
                  },
                ],
              ],
            },
          }
        );
        bot.on('message', async (_msg) => {
          if (_query?.from?.id !== _msg?.from?.id) return;
          if (_msg?.chat_shared) {
            if (_msg?.chat_shared?.request_id === 4) {
              const groupInfo = await bot.getChat(_msg?.chat_shared?.chat_id);
              bot.deleteMessage(_msg?.chat?.id, _msg?.message_id);
              const docRef = doc(
                db,
                'captchas',
                _msg?.chat_shared?.chat_id?.toString()
              );
              const captcha = await getDoc(docRef);
              if (!captcha.exists()) {
                await setDoc(docRef, {
                  chat_id: _msg?.chat_shared?.chat_id,
                  media: 'https://t.me/regex_ulala_ulala_regex_404/6',
                  media_type: 'photo',
                  text: '{username} requires verification to join',
                  button: 'Verify',
                  status: true,
                });
              }

              bot.sendMessage(
                _query.message?.chat?.id,
                `
<b>Captcha setup almost done for ${groupInfo?.title}</b>

Customize your captcha to your liking and press 'Create Captcha' to make the captcha
              `,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: 'Edit Media',
                          callback_data: `edit_captcha_media&${_msg?.chat_shared?.chat_id}`,
                        },
                        {
                          text: 'Edit Text',
                          callback_data: `edit_captcha_text&${_msg?.chat_shared?.chat_id}`,
                        },
                      ],
                      [
                        {
                          text: 'Edit Button',
                          callback_data: `edit_captcha_button&${_msg?.chat_shared?.chat_id}`,
                        },
                      ],
                      [
                        {
                          text: 'Create Captcha',
                          callback_data: `create_captcha&${_msg?.chat_shared?.chat_id}`,
                        },
                      ],
                    ],
                  },
                }
              );
            }
          }
          bot.removeListener('message');
        });
      } else if (/edit_captcha_media&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'captchas', chat_id);
        bot.sendMessage(
          _query.message.chat.id,
          '⚙️ Send captcha media to use (Photo, gif or video)'
        );
        bot.answerCallbackQuery(_query.id);
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        bot.on('message', async (msg, match) => {
          if (_query?.from?.id !== msg?.from?.id) return;
          if (match?.type === 'photo') {
            await updateDoc(docRef, {
              chat_id,
              media: msg.photo[0].file_id,
              media_type: 'photo',
            });
            bot.sendMessage(
              _query.message.chat.id,
              'Captcha media has been updated successfully.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Edit Media',
                        callback_data: `edit_captcha_media&${chat_id}`,
                      },
                      {
                        text: 'Edit Text',
                        callback_data: `edit_captcha_text&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Edit Button',
                        callback_data: `edit_captcha_button&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Create Captcha',
                        callback_data: `create_captcha&${chat_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            bot.removeListener('message');
          } else if (match?.type === 'animation') {
            await updateDoc(docRef, {
              chat_id,
              media: msg.animation.file_id,
              media_type: 'animation',
            });
            bot.sendMessage(
              _query.message.chat.id,
              'Captcha media has been updated successfully.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Edit Media',
                        callback_data: `edit_captcha_media&${chat_id}`,
                      },
                      {
                        text: 'Edit Text',
                        callback_data: `edit_captcha_text&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Edit Button',
                        callback_data: `edit_captcha_button&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Create Captcha',
                        callback_data: `create_captcha&${chat_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            bot.removeListener('message');
          } else if (match?.type === 'video') {
            await updateDoc(docRef, {
              chat_id,
              media: msg.video.file_id,
              media_type: 'video',
            });
            bot.sendMessage(
              _query.message.chat.id,
              'Captcha media has been updated successfully.',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Edit Media',
                        callback_data: `edit_captcha_media&${chat_id}`,
                      },
                      {
                        text: 'Edit Text',
                        callback_data: `edit_captcha_text&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Edit Button',
                        callback_data: `edit_captcha_button&${chat_id}`,
                      },
                    ],
                    [
                      {
                        text: 'Create Captcha',
                        callback_data: `create_captcha&${chat_id}`,
                      },
                    ],
                  ],
                },
              }
            );
            bot.deleteMessage(
              _query.message.chat.id,
              _query.message.message_id
            );
            bot.removeListener('message');
          } else {
            bot.sendMessage(
              _query.message.chat.id,
              '⚠️ Send a valid media type (Photo, gif or video)'
            );
          }
        });
      } else if (/edit_captcha_text&/.test(_query.data)) {
      } else if (/edit_captcha_button&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'captchas', chat_id);
        bot.sendMessage(
          _query.message.chat.id,
          '⚙️ Send captcha button text to use'
        );
        bot.answerCallbackQuery(_query.id);
        bot.on('message', async (msg) => {
          if (_query?.from?.id !== msg?.from?.id) return;
          await updateDoc(docRef, {
            chat_id,
            button: msg.text,
          });
          bot.sendMessage(
            _query.message.chat.id,
            'Captcha button text has been updated successfully.',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Edit Media',
                      callback_data: `edit_captcha_media&${chat_id}`,
                    },
                    {
                      text: 'Edit Text',
                      callback_data: `edit_captcha_text&${chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Edit Button',
                      callback_data: `edit_captcha_button&${chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Create Captcha',
                      callback_data: `create_captcha&${chat_id}`,
                    },
                  ],
                ],
              },
            }
          );
          bot.removeListener('message');
          bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
        });
      } else if (/create_captcha&/.test(_query.data)) {
        const chat_id = _query.data.split('&')[1];
        if (!chat_id) return;
        const docRef = doc(db, 'captchas', chat_id);
        const captcha = await getDoc(docRef);

        bot.answerCallbackQuery(_query.id);
        bot.sendMessage(
          _query.message.chat.id,
          'Your captcha has been created!'
        );
        bot.deleteMessage(_query.message.chat.id, _query.message.message_id);
      }
    }
  } catch (error) {
    // console.log(error);
  }
});
