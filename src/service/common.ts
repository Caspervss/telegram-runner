import { isMember } from "../api/actions";
import { AccessResult } from "../api/types";
import Bot from "../Bot";
import config from "../config";
import logger from "../utils/logger";
import { markdownEscape } from "../utils/utils";

const getGroupName = async (groupId: number): Promise<string> => {
  try {
    const group = (await Bot.client.getChat(groupId)) as { title: string };

    return group.title;
  } catch (err) {
    logger.error({ message: `getGroupName - ${err.message}`, groupId });
    return undefined;
  }
};

const generateInvite = async (groupId: string): Promise<string | undefined> => {
  try {
    return (
      await Bot.client.createChatInviteLink(groupId, {
        creates_join_request: true
      })
    ).invite_link;
  } catch (err) {
    logger.error({ message: `generateInvite - ${err.message}`, groupId });
    return undefined;
  }
};

const kickUser = async (
  groupId: number,
  userId: number,
  reason?: string
): Promise<AccessResult> => {
  logger.verbose({
    message: "kickUser params",
    meta: { groupId, userId, reason }
  });

  try {
    const wasMember = await isMember(groupId.toString(), userId);
    if (!wasMember) {
      logger.verbose({
        message: "kickUser - The user was not in the group!",
        meta: { groupId, userId, reason }
      });

      return {
        success: true,
        errorMsg: `The user was not in the group!`
      };
    }

    // By default, this method guarantees that after the call the user is not a member of the chat, but will be able to join it.
    // So if the user is a member of the chat they will also be removed from the chat. https://core.telegram.org/bots/api#unbanchatmember
    await Bot.client.unbanChatMember(groupId, userId);
    const isNotMemberNow = !(await isMember(groupId.toString(), userId));
    const groupName = await getGroupName(groupId);

    try {
      if (wasMember && isNotMemberNow) {
        await Bot.client.sendMessage(
          userId,
          `You have been kicked from the group "${groupName}"${
            reason ? `, because you ${reason}` : ""
          }.`
        );
      }

      logger.verbose({
        message: "kickUser - successfully kicked",
        meta: { groupId, userId, reason }
      });

      return {
        success: isNotMemberNow,
        errorMsg: null
      };
    } catch (_) {
      const errorMsg = `The bot can't initiate conversation with user "${userId}"`;
      logger.warn(errorMsg);

      return {
        success: isNotMemberNow,
        errorMsg
      };
    }
  } catch (err) {
    const errorMsg = err.response?.description;
    logger.error({ message: `kickUser - ${errorMsg}`, groupId, userId });

    return { success: false, errorMsg };
  }
};

const sendMessageForSupergroup = async (groupId: number): Promise<void> => {
  try {
    const groupName = await getGroupName(groupId);

    await Bot.client.sendMessage(
      groupId,
      markdownEscape(
        `This is the group ID of "${groupName}": \`${groupId}\` .\n` +
          "Paste it to the Guild creation interface!"
      ),
      { parse_mode: "MarkdownV2" }
    );
    await Bot.client.sendPhoto(groupId, config.assets.groupIdImage);
    await Bot.client.sendMessage(
      groupId,
      markdownEscape(
        "It is critically important to *set Group type to 'Private Group'* to create a functioning Guild.\n" +
          "If the visibility of your group is already set to private, you have nothing to do."
      ),
      { parse_mode: "MarkdownV2" }
    );
  } catch (err) {
    logger.error({
      message: `sendMessageForSupergroup - ${err.message}`,
      groupId
    });
  }
};

const sendNotASuperGroup = async (groupId: number): Promise<void> => {
  try {
    await Bot.client.sendMessage(
      groupId,
      markdownEscape(
        "This Group is currently not a Supergroup.\n" +
          "Please make sure to enable *all of the admin rights* for the bot."
      ),
      { parse_mode: "MarkdownV2" }
    );
    await Bot.client.sendAnimation(groupId, config.assets.adminVideo);
  } catch (err) {
    logger.error({ message: `sendNotASuperGroup - ${err.message}`, groupId });
  }
};

const sendNotAnAdministrator = async (groupId: number): Promise<void> => {
  try {
    await Bot.client.sendMessage(
      groupId,
      markdownEscape(
        "Please make sure to enable *all of the admin rights* for the bot."
      ),
      { parse_mode: "MarkdownV2" }
    );
    await Bot.client.sendAnimation(groupId, config.assets.adminVideo);
  } catch (err) {
    logger.error({
      message: `sendNotAnAdministrator - ${err.message}`,
      groupId
    });
  }
};

export {
  getGroupName,
  generateInvite,
  kickUser,
  sendNotASuperGroup,
  sendMessageForSupergroup,
  sendNotAnAdministrator
};
