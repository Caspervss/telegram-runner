import { Context, NarrowedContext } from "telegraf";
import { Chat, Update } from "telegraf/types";
import Bot from "../Bot";
import {
  sendMessageForSupergroup,
  sendNotASuperGroup,
  sendNotAnAdministrator,
  kickUser
} from "./common";
import logger from "../utils/logger";
import { markdownEscape } from "../utils/utils";
import Main from "../Main";
import { getGuild, getUserAccess } from "../api/actions";

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
      await ctx.replyWithMarkdownV2(
        markdownEscape(
          "I'm sorry, but I couldn't interpret your request.\n" +
            "You can find more information on [docs.guild.xyz](https://docs.guild.xyz/)."
        )
      );
    }
  } catch (err) {
    logger.error(`messageUpdate - ${err.message}`);
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
    logger.error(`channelPostUpdate - ${err.message}`);
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
    logger.verbose({
      message: "onUserJoined - User successfully joined",
      meta: { platformGuildId, platformUserId }
    });
  } catch (err) {
    logger.error(`onUserJoined - ${err.message}`);
  }
};

const chatMemberUpdate = async (
  ctx: NarrowedContext<Context, Update.ChatMemberUpdate>
) => {
  try {
    const {
      chat,
      new_chat_member: newChatMember,
      from: invitator,
      invite_link: invLink
    } = ctx.update.chat_member;

    const groupId = chat.id;
    const groupTitle = (chat as Chat.GroupChat).title;
    const invitatorName =
      invitator.username || invitator.first_name || invitator.last_name;

    const newChatMemberName =
      newChatMember.user.username ||
      newChatMember.user.first_name ||
      newChatMember.user.last_name;

    if (newChatMember?.status === "member") {
      const guild = await getGuild(groupId.toString());
      const { access, reason } = await getUserAccess(
        newChatMember.user.id.toString(),
        groupId.toString()
      );

      if (!access || access.roles?.length === 0) {
        const kickMessage =
          reason ??
          `You do not have access to this reward. To check the requirements, visit here: ${guild.url}`;
        await kickUser(groupId, newChatMember.user.id, kickMessage);
        await Bot.client.sendMessage(
          invitator.id,
          `You can not invite ${newChatMemberName} to "${groupTitle}" chat, because it does not have access to this reward.`
        );
        logger.verbose({
          message: "Invited member got kicked",
          meta: {
            invitatorId: invitator.id,
            invitatorName,
            platformGuildId: groupId,
            kickedUserId: newChatMember.user.id,
            kickedUserName: newChatMemberName
          }
        });
      } else {
        await onUserJoined(newChatMember.user.id, groupId);
        const bot = await Bot.client.getMe();
        const message =
          invLink?.creator?.id === bot.id
            ? `Your request to join to the "${groupTitle}" chat has been accepted! If you want more info on possible rewards, visit here: ${guild.url}`
            : `You got invited to "${groupTitle}" chat by ${invitatorName}. You've also joined the ${guild.name} Guild, so if you want more info on possible rewards, visit here: ${guild.url}`;
        await Bot.client.sendMessage(newChatMember.user.id, message);
        logger.verbose({
          message: "Invited member got accepted and joined to the guild",
          meta: {
            invitatorId: invitator.id,
            invitatorName,
            platformGuildId: groupId,
            newUserId: newChatMember.user.id,
            newChatMemberName
          }
        });
      }
    }
  } catch (err) {
    logger.error(`chatMemberUpdate - ${err.message}`);
  }
};

const myChatMemberUpdate = async (
  ctx: NarrowedContext<Context, Update.MyChatMemberUpdate>
): Promise<void> => {
  try {
    const { my_chat_member } = ctx.update;
    const { chat, old_chat_member, new_chat_member } = my_chat_member;

    if (old_chat_member?.status === "kicked") {
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
    logger.error(`myChatMemberUpdate - ${err.message}`);
  }
};

const joinRequestUpdate = async (
  ctx: NarrowedContext<Context, Update.ChatJoinRequestUpdate>
): Promise<void> => {
  const { chatJoinRequest } = ctx;
  const platformGuildId = chatJoinRequest.chat.id.toString();
  const platformUserId = chatJoinRequest.from.id.toString();

  logger.verbose({
    message: "joinRequestUpdate params",
    meta: { platformGuildId, platformUserId }
  });

  const { access, reason } = await getUserAccess(
    platformUserId,
    platformGuildId
  );

  try {
    if (!access || access.roles?.length === 0) {
      await ctx.declineChatJoinRequest(ctx.chatJoinRequest.from.id);

      const guild = await getGuild(platformGuildId);

      await Bot.client.sendMessage(
        platformUserId,
        reason ??
          `Your join request was declined because you do not have access to this reward. To check the requirements, visit here: ${guild.url}`
      );

      logger.verbose({
        message: "Join request declined",
        meta: { access, platformGuildId, platformUserId }
      });

      return;
    }

    await onUserJoined(+platformUserId, +platformGuildId);
    await ctx.approveChatJoinRequest(ctx.chatJoinRequest.from.id);
    logger.verbose({
      message: "Join request approved",
      meta: { access, platformGuildId, platformUserId }
    });
  } catch (error) {
    logger.error(`Join request approve/decline - ${error}`);
  }
};

const leftChatMemberUpdate = async (
  ctx: NarrowedContext<Context, any>
): Promise<void> => {
  console.log(ctx.update);
  const msg = ctx.update.message;

  const from = msg?.from;
  const chat = msg?.chat;
  const leftChatMember = msg?.left_chat_member;

  logger.verbose(
    `User "id: ${leftChatMember?.id} - username: ${leftChatMember?.username}" left the group / has been kicked by "id: ${from?.id} - username: ${from?.username}". Chat "id: ${chat?.id} - title: ${chat?.title} - type: ${chat?.type}`
  );
};

export {
  messageUpdate,
  channelPostUpdate,
  onUserJoined,
  chatMemberUpdate,
  myChatMemberUpdate,
  joinRequestUpdate,
  leftChatMemberUpdate
};
