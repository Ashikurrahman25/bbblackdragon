const bot = require('../telegram');
const {
  query,
  collection,
  where,
  getDocs,
  deleteDoc,
  addDoc,
} = require('firebase/firestore');
const { db } = require('../firebase');

// ! controllers information
const controllers = require('../../data/controllers.json');
const commands = require('../../data/commands.json');

bot.on('message', async (msg) => {
  if (
    msg?.text?.startsWith('/command') ||
    msg?.caption?.startsWith('/command')
  ) {
    try {
      if (
        /creator|administrator/.test(
          (await bot.getChatMember(msg.chat.id, msg.from.id)).status
        ) &&
        msg.chat.type !== 'private'
      ) {
        const [_, command, ...replies] =
          (msg?.text ? msg?.text?.split(' ') : msg?.caption?.split(' ')) || [];
        if (command?.startsWith('/')) {
          return bot.sendMessage(
            msg?.chat?.id,
            'Command should not start with /',
            {
              reply_to_message_id: msg?.message_id,
              message_thread_id: msg?.message_thread_id,
            }
          );
        }
        if (commands?.includes(command)) {
          return bot.sendMessage(
            msg?.chat?.id,
            '🚫 This is a build-in command',
            {
              reply_to_message_id: msg?.message_id,
              message_thread_id: msg?.message_thread_id,
            }
          );
        }
        if (!command) {
          const q = msg?.message_thread_id
            ? query(
                collection(db, 'commands'),
                where('chat_id', '==', msg?.chat?.id),
                where('message_thread_id', '==', msg?.message_thread_id)
              )
            : query(
                collection(db, 'commands'),
                where('chat_id', '==', msg?.chat?.id)
              );
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            return bot.sendMessage(
              msg?.chat?.id,
              'No commands found for this chat',
              {
                reply_to_message_id: msg?.message_id,
                message_thread_id: msg?.message_thread_id,
              }
            );
          } else {
            let commands = '';
            querySnapshot.forEach((doc) => {
              commands += `<code>${doc.data().command}</code>\n`;
            });
            return bot.sendMessage(
              msg?.chat?.id,
              `Commands for this chat:\n${commands}`,
              {
                parse_mode: 'HTML',
                reply_to_message_id: msg?.message_id,
                message_thread_id: msg?.message_thread_id,
              }
            );
          }
        }
        if (!replies?.length) {
          return bot.sendMessage(msg?.chat?.id, 'No reply message provided', {
            reply_to_message_id: msg?.message_id,
            message_thread_id: msg?.message_thread_id,
          });
        }
        const q = msg?.message_thread_id
          ? query(
              collection(db, 'commands'),
              where('chat_id', '==', msg?.chat?.id),
              where('command', '==', command),
              where('message_thread_id', '==', msg?.message_thread_id)
            )
          : query(
              collection(db, 'commands'),
              where('command', '==', command),
              where('chat_id', '==', msg?.chat?.id)
            );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          let photo, video, animation;
          if (!msg?.media_group_id) {
            photo = msg?.photo?.[0]?.file_id;
            animation = msg?.animation?.file_id;
            video = msg?.video?.file_id;
          }
          await addDoc(collection(db, 'commands'), {
            chat_id: msg?.chat?.id,
            command,
            reply: replies?.join(' '),
            ...(msg?.message_thread_id && {
              message_thread_id: msg?.message_thread_id,
            }),
            ...(photo && { photo }),
            ...(video && { video }),
            ...(animation && { animation }),
            type: photo
              ? 'photo'
              : video
              ? 'video'
              : animation
              ? 'animation'
              : 'text',
          });
          bot.sendMessage(
            msg?.chat?.id,
            `Command for <code>${command}</code> has been set`,
            {
              parse_mode: 'HTML',
              message_thread_id: msg?.message_thread_id,
            }
          );
        } else {
          bot.sendMessage(
            msg?.chat?.id,
            `Command for <code>${command}</code> already exists`,
            {
              parse_mode: 'HTML',
              reply_to_message_id: msg?.message_id,
              message_thread_id: msg?.message_thread_id,
            }
          );
        }
      }
    } catch (error) {
      // console.log(error);
    }
  }
});

bot.onText(/\/remove/, async (msg) => {
  try {
    if (controllers?.includes(msg?.from?.id)) {
      const [_, command] = msg?.text?.split(' ') || [];
      if (command?.startsWith('/')) {
        return bot.sendMessage(
          msg?.chat?.id,
          'Command should not start with /',
          {
            reply_to_message_id: msg?.message_id,
            message_thread_id: msg?.message_thread_id,
          }
        );
      }
      if (!command) {
        return bot.sendMessage(msg?.chat?.id, 'No command provided', {
          reply_to_message_id: msg?.message_id,
          message_thread_id: msg?.message_thread_id,
        });
      }
      if (commands?.includes(command)) {
        return bot.sendMessage(msg?.chat?.id, '🚫 This is a build-in command', {
          reply_to_message_id: msg?.message_id,
          message_thread_id: msg?.message_thread_id,
        });
      }

      const q = msg?.message_thread_id
        ? query(
            collection(db, 'commands'),
            where('chat_id', '==', msg?.chat?.id),
            where('command', '==', command),
            where('message_thread_id', '==', msg?.message_thread_id)
          )
        : query(
            collection(db, 'commands'),
            where('command', '==', command),
            where('chat_id', '==', msg?.chat?.id)
          );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        bot.sendMessage(
          msg?.chat?.id,
          `Command for <code>${command}</code> does not exist`,
          {
            parse_mode: 'HTML',
            reply_to_message_id: msg?.message_id,
            message_thread_id: msg?.message_thread_id,
          }
        );
      } else {
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        bot.sendMessage(
          msg?.chat?.id,
          `Command for <code>${command}</code> has been removed`,
          {
            parse_mode: 'HTML',
            message_thread_id: msg?.message_thread_id,
          }
        );
      }
    }
  } catch (error) {
    // console.log(error);
  }
});

bot.onText(/\/(.+)/, async (msg) => {
  try {
    const commandEntity = msg?.entities?.find(
      (entity) => entity.type === 'bot_command'
    );
    const command = msg?.text?.substring(
      commandEntity?.offset + 1,
      commandEntity?.offset + 1 + commandEntity?.length
    );
    // if (
    //   !commands?.includes(command) &&
    //   /creator|administrator/.test(
    //     (await bot.getChatMember(msg.chat.id, msg.from.id)).status
    //   )
    // ) {
    const q = msg?.message_thread_id
      ? query(
          collection(db, 'commands'),
          where('chat_id', '==', msg?.chat?.id),
          where('command', '==', command),
          where('message_thread_id', '==', msg?.message_thread_id)
        )
      : query(
          collection(db, 'commands'),
          where('command', '==', command),
          where('chat_id', '==', msg?.chat?.id)
        );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        if (!msg?.message_thread_id && doc.data().message_thread_id) {
        } else {
          if (doc?.data()?.type === 'photo') {
            bot.sendPhoto(msg?.chat?.id, doc.data().photo, {
              caption: doc.data().reply,
              reply_to_message_id: msg?.message_id,
              message_thread_id: msg?.message_thread_id,
            });
          } else if (doc?.data()?.type === 'video') {
            bot.sendVideo(msg?.chat?.id, doc.data().video, {
              caption: doc.data().reply,
              reply_to_message_id: msg?.message_id,
              message_thread_id: msg?.message_thread_id,
            });
          } else if (doc?.data()?.type === 'animation') {
            bot.sendAnimation(msg?.chat?.id, doc.data().animation, {
              caption: doc.data().reply,
              reply_to_message_id: msg?.message_id,
              message_thread_id: msg?.message_thread_id,
            });
          } else {
            bot.sendMessage(msg?.chat?.id, doc.data().reply, {
              reply_to_message_id: msg?.message_id,
              message_thread_id: msg?.message_thread_id,
            });
          }
        }
      });
    }
    // }
  } catch (error) {
    // console.log(error);
  }
});
