import { Markup } from "telegraf";
import Bot from "../Bot";
import logger from "../utils/logger";
import { markdownEscape } from "../utils/utils";
import { Ctx } from "./types";

const helpCommand = async (ctx: Ctx): Promise<void> => {
  try {
    const helpHeader =
      "Hello there! I'm the Guild bot.\n" +
      "I'm part of the [Guild](https://docs.guild.xyz/) project and " +
      "I am your personal assistant.\n" +
      "I will always let you know whether you can join a guild or " +
      "whether you were kicked from a guild.\n";

    const commandsList =
      "/help - show instructions\n" +
      "/ping - check if I'm alive\n" +
      "/start - visit the official guild website\n" +
      "/channelid - shows the ID of the channel\n" +
      "/groupid - shows the ID of the group\n" +
      "/add - add Guild bot to your group";

    const helpFooter =
      "For more details about me read the documentation on " +
      "[github](https://github.com/agoraxyz/telegram-runner).";

    await ctx.replyWithMarkdownV2(
      markdownEscape(`${helpHeader}\n${commandsList}\n${helpFooter}`),
      {
        disable_web_page_preview: true
      }
    );
  } catch (error) {
    logger.error(`helpCommand - ${error.message}`);
  }
};

const startCommand = async (ctx: Ctx): Promise<void> => {
  try {
    await ctx.replyWithMarkdownV2(
      markdownEscape(
        "Visit the [Guild website](https://guild.xyz) to join guilds"
      )
    );
  } catch (error) {
    logger.error(`startCommand - ${error.message}`);
  }
};

const pingCommand = async (ctx: Ctx): Promise<void> => {
  const { message } = ctx.update;
  const messageTime = new Date(message.date * 1000).getTime();

  const currTime = new Date().getTime();

  try {
    await Bot.client.getMe();

    await ctx.replyWithMarkdownV2(
      markdownEscape(
        `Pong. The message latency is ${
          currTime - messageTime
        }ms. Bot API latency is ${new Date().getTime() - currTime}ms.`
      )
    );
  } catch (err) {
    logger.error(`pingCommand - ${err.message}`);
  }
};

const groupIdCommand = async (ctx: Ctx): Promise<void> => {
  try {
    await ctx.replyWithMarkdownV2(
      markdownEscape(`\`${ctx.update.message.chat.id}\``),
      {
        reply_to_message_id: ctx.update.message.message_id
      }
    );
  } catch (error) {
    logger.error(`groupIdCommand error - ${error.message}`);
  }
};

const addCommand = async (ctx: Ctx): Promise<void> => {
  try {
    await ctx.replyWithMarkdownV2(
      "Click to add Guild bot to your group",
      Markup.inlineKeyboard([
        Markup.button.url(
          "Add Guild bot to group",
          `https://t.me/${Bot.info.username}?startgroup=true&admin=post_messages+restrict_members+invite_users`
        ),
        Markup.button.url(
          "Add Guild bot to channel",
          `https://t.me/${Bot.info.username}?startchannel&admin=post_messages+restrict_members+invite_users`
        )
      ])
    );
  } catch (error) {
    logger.error(`addCommand error - ${error.message}`);
  }
};

export { helpCommand, startCommand, pingCommand, groupIdCommand, addCommand };
