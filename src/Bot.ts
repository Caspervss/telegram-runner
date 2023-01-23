import { Telegraf, Telegram } from "telegraf";
import { UserFromGetMe } from "telegraf/types";
import * as TGActions from "./service/actions";
import * as TGCommands from "./service/commands";
import * as TGEvents from "./service/events";
import { Ctx } from "./service/types";
import logger from "./utils/logger";
import { getErrorResult } from "./utils/utils";

export default class Bot {
  public static client: Telegram;

  public static info: UserFromGetMe;

  static setup(token: string): void {
    const bot = new Telegraf(token);

    this.client = bot.telegram;

    // registering middleware to log the duration of updates
    bot.use(async (_, next) => {
      const start = Date.now();

      await next();

      logger.verbose(`response time ${Date.now() - start}ms`);
    });

    // built-in commands
    bot.start(TGCommands.startCommand);
    bot.help(TGCommands.helpCommand);

    // other commands
    bot.command("ping", TGCommands.pingCommand);
    bot.command("status", TGCommands.statusUpdateCommand);
    bot.command("groupid", TGCommands.groupIdCommand);
    bot.command("add", TGCommands.addCommand);

    const noCommand = (ctx: Ctx) =>
      ctx.reply("This feature is currently not available");

    bot.command("poll", noCommand /* TGCommands.pollCommand */);
    bot.command("enough", noCommand /* TGCommands.enoughCommand */);
    bot.command("done", noCommand /* TGCommands.doneCommand */);
    bot.command("reset", noCommand /* TGCommands.resetCommand */);
    bot.command("cancel", noCommand /* TGCommands.cancelCommand */);

    // event listeners
    bot.on("text", TGEvents.messageUpdate);
    bot.on("channel_post", TGEvents.channelPostUpdate);
    bot.on("left_chat_member", TGEvents.leftChatMemberUpdate);
    bot.on("chat_member", TGEvents.chatMemberUpdate);
    bot.on("my_chat_member", TGEvents.myChatMemberUpdate);
    bot.on("chat_join_request", TGEvents.joinRequestUpdate);

    // action listeners
    bot.action(/;ChooseRequirement$/, TGActions.chooseRequirementAction);
    bot.action(/^desc;/, TGActions.pollDescriptionAction);
    bot.action(/;Vote$/, TGActions.voteAction);

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
      logger.error(getErrorResult(err));
    });

    // enable graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));

    logger.verbose("Guild bot is alive...");
  }
}
