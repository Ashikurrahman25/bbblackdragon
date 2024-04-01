const { doc, setDoc, Timestamp, getDoc } = require('firebase/firestore');
const bot = require('./telegram');
const { db } = require('./firebase');

const portal = async (msg) => {
  try {
    await bot.sendMessage(
      msg?.chat?.id,
      `
For portal setup please click below and select the group you want to attach your portal to

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
                  data: 'choose_channel',
                  request_id: 1,
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
    const portal = {};
    let groupInfo;
    bot.on('message', async (_msg) => {
      if (msg?.chat?.id !== _msg?.from?.id) return;
      if (_msg?.chat_shared) {
        if (_msg?.chat_shared?.request_id === 1) {
          portal.group_id = _msg?.chat_shared?.chat_id;
          groupInfo = await bot.getChat(_msg?.chat_shared?.chat_id);
          bot.deleteMessage(_msg?.chat?.id, _msg?.message_id);
          bot.sendMessage(
            msg?.chat?.id,
            '<b>Select a channel where your portal will be created</b>',
            {
              parse_mode: 'HTML',
              reply_markup: {
                selective: true,
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [
                  [
                    {
                      text: 'Choose a channel',
                      request_chat: {
                        request_id: 2,
                        chat_is_channel: true,
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
        } else if (_msg?.chat_shared?.request_id === 2) {
          bot.deleteMessage(_msg?.chat?.id, _msg?.message_id);
          portal.channel_id = _msg?.chat_shared?.chat_id;
          const portalExists = await getDoc(
            doc(db, 'portals', _msg?.chat_shared?.chat_id?.toString())
          );
          await setDoc(
            doc(db, 'portals', _msg?.chat_shared?.chat_id?.toString()),
            {
              ...portal,
              created_at: Timestamp.now(),
              text:
                portalExists?.data()?.text ||
                `${groupInfo?.title} is protected by @${
                  (
                    await bot.getMe()
                  ).username
                }\n\nClick below to verify that you're human`,
              media:
                portalExists?.data()?.media ||
                'https://t.me/regex_ulala_ulala_regex_404/6',
              media_type: portalExists?.data()?.media_type || 'photo',
              button: portalExists?.data()?.button || 'Tap to Verify',
              message_id: portalExists?.data()?.message_id || null,
            }
          );

          bot.sendMessage(
            msg?.chat?.id,
            `
<b>Portal setup is almost completed</b>

Customize your portal to your liking and press 'Create Portal' to make the portal
      `,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Edit Media',
                      callback_data: `edit_portal_media&${_msg?.chat_shared?.chat_id}`,
                    },
                    {
                      text: 'Edit Text',
                      callback_data: `edit_portal_text&${_msg?.chat_shared?.chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Edit Button',
                      callback_data: `edit_portal_button&${_msg?.chat_shared?.chat_id}`,
                    },
                  ],
                  [
                    {
                      text: 'Create Portal',
                      callback_data: `create_portal&${_msg?.chat_shared?.chat_id}`,
                    },
                  ],
                ],
              },
            }
          );
          bot.removeListener('message');
        }
      }
    });
  } catch (error) {
    // console.log(error);
  }
};

module.exports = portal;
