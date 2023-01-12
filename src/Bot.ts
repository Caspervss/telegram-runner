import { Telegraf, Telegram } from "telegraf";
import { UserFromGetMe } from "telegraf/types";
import * as TGCommands from "./service/commands";
import * as TGEvents from "./service/events";
import logger from "./utils/logger";
import { getErrorResult } from "./utils/utils";

export default class Bot {
  public static client: Telegram;

  public static info: UserFromGetMe;

  static setup(token: string): void {
    const bot = new Telegraf(token);

    this.client = bot.telegram;

    // built-in commands
    bot.help(TGCommands.helpCommand);

    // other commands
    bot.command("ping", TGCommands.pingCommand);
    bot.command("groupid", TGCommands.groupIdCommand);
    bot.command("add", TGCommands.addCommand);
    bot.command("guild", TGCommands.guildCommand);

    Bot.client.setMyCommands([
      { command: "help", description: "Show instructions" },
      { command: "ping", description: "Ping the bot" },
      { command: "groupid", description: "Get the ID of the group" },
      { command: "channelid", description: "Get the ID of the channel" },
      { command: "add", description: "Click to add Guild bot to your group" },
      { command: "guild", description: "Visit the official guild website" }
    ]);

    // event listeners
    bot.on("text", TGEvents.messageUpdate);
    bot.on("channel_post", TGEvents.channelPostUpdate);
    bot.on("chat_member", TGEvents.chatMemberUpdate);
    bot.on("my_chat_member", TGEvents.myChatMemberUpdate);
    bot.on("chat_join_request", TGEvents.joinRequestUpdate);
    bot.on("left_chat_member", TGEvents.leftChatMemberUpdate);

    // starting the bot
    bot
      .launch({
        allowedUpdates: [
          "chat_member",
          "my_chat_member",
          "message",
          "channel_post",
          "chosen_inline_result",
          "callback_query",
          "chat_join_request"
        ]
      })
      .then(() => {
        this.info = bot.botInfo;
      });

    // logging middleware for bot errors
    bot.catch((err) => {
      logger.error(`bot catch error - ${JSON.stringify(getErrorResult(err))}`);
    });

    // enable graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));

    logger.verbose("Guild bot is alive...");
  }
}
