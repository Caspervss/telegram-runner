import { Context, NarrowedContext } from "telegraf";
import { Update } from "telegraf/types";
import { GuildPlatformData } from "@guildxyz/sdk";
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
  } catch (err) {
    logger.error(`onUserJoined - ${err.message}`);
  }
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
          onUserJoined(userId, groupId);

          logger.verbose({
            message: "onChatMemberUpdate - successfully joined",
            meta: {
              groupId,
              userId,
              invite_link
            }
          });
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
  const platformGuildId = chatJoinRequest.chat.id;
  const platformUserId = chatJoinRequest.from.id;

  logger.verbose({
    message: "joinRequestUpdate params",
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
      logger.error(`SDK access (joinRequestUpdate) - ${error}`);
    }
  }

  try {
    if (!access || access.roles?.length === 0) {
      await ctx.declineChatJoinRequest(ctx.chatJoinRequest.from.id);

      await Bot.client.sendMessage(
        platformUserId,
        "Your join request was declined because you do not have access to it."
      );

      logger.verbose({
        message: "Join request declined",
        meta: { access, platformGuildId, platformUserId }
      });

      return;
    }

    await ctx.approveChatJoinRequest(ctx.chatJoinRequest.from.id);
    logger.verbose({
      message: "Join request approved",
      meta: { access, platformGuildId, platformUserId }
    });
  } catch (error) {
    logger.error(`Join request approve/decline - ${error}`);
  }
};

export {
  messageUpdate,
  channelPostUpdate,
  onUserJoined,
  chatMemberUpdate,
  myChatMemberUpdate,
  joinRequestUpdate
};
