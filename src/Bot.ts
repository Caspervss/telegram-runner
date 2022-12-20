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
    bot.start(TGCommands.startCommand);
    bot.help(TGCommands.helpCommand);

    // other commands
    bot.command("ping", TGCommands.pingCommand);
    bot.command("groupid", TGCommands.groupIdCommand);
    bot.command("add", TGCommands.addCommand);

    Bot.client.setMyCommands([
      { command: "help", description: "Show instructions" },
      { command: "ping", description: "Ping the bot" },
      { command: "groupid", description: "Get the ID of the group" },
      { command: "channelid", description: "Get the ID of the channel" },
      { command: "add", description: "Click to add Guild bot to your group" },
      { command: "start", description: "Visit the official guild website" }
    ]);

    // set default administrator rights for supergroups
    Bot.client.setMyDefaultAdministratorRights({
      rights: {
        can_manage_chat: true,
        can_invite_users: true,
        can_restrict_members: true,
        is_anonymous: false,
        can_change_info: false,
        can_pin_messages: false,
        can_edit_messages: false,
        can_post_messages: false,
        can_promote_members: false,
        can_delete_messages: false,
        can_manage_video_chats: false
      }
    });

    // set default administrator rights for channels
    Bot.client.setMyDefaultAdministratorRights({
      rights: {
        can_manage_chat: true,
        can_invite_users: true,
        can_post_messages: true,
        can_restrict_members: true,
        is_anonymous: false,
        can_change_info: false,
        can_pin_messages: false,
        can_edit_messages: false,
        can_promote_members: false,
        can_delete_messages: false,
        can_manage_video_chats: false
      },
      forChannels: true
    });

    // event listeners
    bot.on("text", TGEvents.messageUpdate);
    bot.on("channel_post", TGEvents.channelPostUpdate);
    bot.on("chat_member", TGEvents.chatMemberUpdate);
    bot.on("my_chat_member", TGEvents.myChatMemberUpdate);
    bot.on("chat_join_request", TGEvents.joinRequestUpdate);

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
      logger.error(`bot catch error - ${getErrorResult(err)}`);
    });

    // enable graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));

    logger.verbose("Guild bot is alive...");
  }
}
