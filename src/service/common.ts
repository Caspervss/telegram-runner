import dayjs from "dayjs";
import { isMember } from "../api/actions";
import Bot from "../Bot";
import config from "../config";
import logger from "../utils/logger";
import { markdownEscape } from "../utils/utils";
import { SuccessResult } from "./types";

const getGroupName = async (groupId: number): Promise<string> => {
  try {
    const group = (await Bot.client.getChat(groupId)) as { title: string };

    return group.title;
  } catch (err) {
    logger.error({ message: err.message, groupId });
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
    logger.error({ message: err.message, groupId });
    return undefined;
  }
};

const kickUser = async (
  groupId: number,
  userId: number,
  reason?: string
): Promise<SuccessResult> => {
  logger.verbose({
    message: "kickUser",
    meta: { groupId, userId, reason }
  });

  try {
    const wasMember = await isMember(groupId.toString(), userId);
    await Bot.client.banChatMember(groupId, userId, dayjs().unix() + 40);
    const isNotMemberNow = !(await isMember(groupId.toString(), userId));
    const groupName = await getGroupName(groupId);

    try {
      if (wasMember && isNotMemberNow) {
        await Bot.client.sendMessage(
          userId,
          "You have been kicked from the group " +
            `${groupName}${reason ? `, because you ${reason}` : ""}.`
        );
      }

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

    logger.error({ message: errorMsg, groupId, userId });

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
    logger.error({ message: err.message, groupId });
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
    logger.error({ message: err.message, groupId });
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
    logger.error({ message: err.message, groupId });
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
