import { Context, NarrowedContext } from "telegraf";
import { Update } from "telegraf/types";
import dayjs from "dayjs";
import { GuildPlatformData } from "@guildxyz/sdk";
import Bot from "../Bot";
import {
  sendMessageForSupergroup,
  sendNotASuperGroup,
  sendNotAnAdministrator,
  kickUser
} from "./common";
import logger from "../utils/logger";
import { createPollText, initPoll, markdownEscape } from "../utils/utils";
import pollStorage from "./pollStorage";
import { Poll } from "./types";
import Main from "../Main";

const messageUpdate = async (
  ctx: NarrowedContext<Context, Update.MessageUpdate>
): Promise<void> => {
  try {
    const msg = ctx.update.message as {
      chat: { id: number; type: string };
      from: { id: number };
      text: string;
    };

    if (msg.chat.type === "private") {
      const userId = msg.from.id;
      const messageText = msg.text.trim();

      switch (pollStorage.getUserStep(userId)) {
        case 1: {
          pollStorage.savePollQuestion(userId, messageText);

          const buttons = [
            [
              {
                text: "Yes",
                callback_data: "desc;yes"
              },
              {
                text: "No",
                callback_data: "desc;no"
              }
            ]
          ];

          await ctx.reply("Do you want to add a description for the poll?", {
            reply_markup: {
              inline_keyboard: buttons
            }
          });

          return;
        }

        case 2: {
          pollStorage.savePollDescription(userId, messageText);
          pollStorage.setUserStep(userId, 3);

          await ctx.reply("Please give me the first option of your poll.");

          return;
        }

        case 3: {
          const optionSaved = pollStorage.savePollOption(userId, messageText);

          if (!optionSaved) {
            await ctx.reply("This option has already been added.");

            return;
          }

          if (pollStorage.getPoll(userId).options.length === 1) {
            await ctx.reply("Please give me the second option of your poll.");
          } else {
            await ctx.reply(
              "Please give me a new option or go to the next step by using /enough"
            );
          }

          return;
        }

        case 4: {
          const dateRegex =
            /([1-9][0-9]*|[0-9]):([0-1][0-9]|[0-9]|[2][0-4]):([0-5][0-9]|[0-9])/;
          const found = messageText.match(dateRegex);

          if (!found) {
            await ctx.reply(
              "The message you sent me is not in the DD:HH:mm format.\n" +
                "Please verify the contents of your message and send again."
            );

            return;
          }

          const [day, hour, minute] = found[0].split(":");

          const expDate = dayjs()
            .add(parseInt(day, 10), "day")
            .add(parseInt(hour, 10), "hour")
            .add(parseInt(minute, 10), "minute")
            .unix()
            .toString();

          pollStorage.savePollExpDate(userId, expDate);
          pollStorage.setUserStep(userId, 4);

          const poll = {
            id: 69,
            ...pollStorage.getPoll(userId)
          } as unknown as Poll;

          await ctx.replyWithMarkdownV2(
            markdownEscape(await createPollText(poll))
          );

          await ctx.reply(
            "You can accept it by using /done,\n" +
              "reset the data by using /reset\n" +
              "or cancel it using /cancel."
          );

          return;
        }

        default: {
          break;
        }
      }

      await ctx.replyWithMarkdownV2(
        markdownEscape(
          "I'm sorry, but I couldn't interpret your request.\n" +
            "You can find more information on [docs.guild.xyz](https://docs.guild.xyz/)."
        )
      );
    }
  } catch (err) {
    logger.error(err.message);
  }
};

const channelPostUpdate = async (
  ctx: NarrowedContext<Context, Update.ChannelPostUpdate>
): Promise<void> => {
  try {
    const post = ctx.update.channel_post as {
      message_id: number;
      chat: { id: number };
      text: string;
    };

    const channelId = post.chat.id;

    switch (post.text) {
      case "/poll": {
        await initPoll(ctx);
        await Bot.client.deleteMessage(channelId, post.message_id);

        break;
      }

      case "/groupid": {
        ctx.reply(
          "You can only use this command in a group.\n" +
            "Please use the /channelid command for groups",
          {
            reply_to_message_id: post.message_id
          }
        );

        break;
      }

      case "/channelid": {
        await ctx.replyWithMarkdownV2(markdownEscape(`\`${channelId}\``), {
          reply_to_message_id: post.message_id
        });

        break;
      }

      default: {
        break;
      }
    }
  } catch (err) {
    logger.error(err.message);
  }
};

const onUserJoined = async (
  platformUserId: number,
  platformGuildId: number
): Promise<void> => {
  try {
    await Main.platform.user.join(
      platformGuildId.toString(),
      platformUserId.toString()
    );
  } catch (err) {
    logger.error(err.message);
  }
};

const leftChatMemberUpdate = async (
  ctx: NarrowedContext<Context, any>
): Promise<void> => {
  const msg = ctx.update.message;

  logger.verbose(
    `user "${msg.left_chat_member.id}" left group "${msg.chat.id}"`
  );
};

const chatMemberUpdate = async (
  ctx: NarrowedContext<Context, Update.ChatMemberUpdate>
) => {
  try {
    const {
      from: { id: userId },
      chat: { id: groupId },
      new_chat_member,
      invite_link: invLink
    } = ctx.update.chat_member;

    if (new_chat_member?.status === "member") {
      if (invLink) {
        const { invite_link } = invLink;

        const bot = await Bot.client.getMe();

        if (invLink.creator.id === bot.id) {
          logger.verbose({
            message: "onChatMemberUpdate",
            meta: {
              groupId,
              userId,
              invite_link
            }
          });

          onUserJoined(userId, groupId);
        } else {
          kickUser(groupId, userId, "haven't joined through Guild interface");
        }
      } else {
        kickUser(
          groupId,
          new_chat_member.user.id,
          "have joined the group without using an invite link.\n" +
            "If this is not the case then the admins did not set up the guild properly."
        );
      }
    }
  } catch (err) {
    logger.error(err.message);
  }
};

const myChatMemberUpdate = async (
  ctx: NarrowedContext<Context, Update.MyChatMemberUpdate>
): Promise<void> => {
  try {
    const { my_chat_member } = ctx.update;
    const { chat, old_chat_member, new_chat_member } = my_chat_member;

    if (old_chat_member?.status === "kicked") {
      // onBlocked(ctx);
      logger.warn(`User ${chat.id} has blocked the bot.`);
    } else if (
      new_chat_member?.status === "member" ||
      new_chat_member?.status === "administrator"
    ) {
      const groupId = chat.id;

      if (["supergroup", "channel"].includes(chat.type)) {
        if (new_chat_member?.status === "administrator") {
          await sendMessageForSupergroup(groupId);
        } else {
          await sendNotAnAdministrator(groupId);
        }
      } else {
        await sendNotASuperGroup(groupId);
      }
    }
  } catch (err) {
    logger.error(err.message);
  }
};

const joinRequestUpdate = async (
  ctx: NarrowedContext<Context, Update.ChatJoinRequestUpdate>
): Promise<void> => {
  const { chatJoinRequest } = ctx;
  const platformGuildId = chatJoinRequest.chat.id;
  const platformUserId = chatJoinRequest.from.id;

  logger.verbose({
    message: "joinRequestUpdate",
    meta: { platformGuildId, platformUserId }
  });

  let access: GuildPlatformData;

  try {
    access = await Main.platform.guild.getUserAccess(
      platformGuildId.toString(),
      platformUserId.toString()
    );
  } catch (err) {
    try {
      if (
        err?.response?.data?.errors?.[0].msg.startsWith("Cannot find guild")
      ) {
        logger.error("No guild is associated with this group.");
      } else if (
        err?.response?.data?.errors?.[0].msg.startsWith("Cannot find user")
      ) {
        await Main.platform.user.join(
          platformGuildId.toString(),
          platformUserId.toString()
        );
      } else {
        logger.error({
          message: err.message,
          groupId: platformGuildId,
          userId: platformUserId
        });
      }
    } catch (error) {
      logger.error(error);
    }
  }

  try {
    if (!access || access.roles?.length === 0) {
      await ctx.declineChatJoinRequest(ctx.chatJoinRequest.from.id);

      return;
    }

    await ctx.approveChatJoinRequest(ctx.chatJoinRequest.from.id);
  } catch (error) {
    logger.error(error);
  }
};

export {
  messageUpdate,
  channelPostUpdate,
  onUserJoined,
  leftChatMemberUpdate,
  chatMemberUpdate,
  myChatMemberUpdate,
  joinRequestUpdate
};
