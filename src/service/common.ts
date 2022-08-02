// import dayjs from "dayjs";
import dayjs from "dayjs";
import { isMember } from "../api/actions";
import Bot from "../Bot";
import config from "../config";
import logger from "../utils/logger";
import { SuccessResult } from "./types";

const getGroupName = async (groupId: number): Promise<string> => {
  const group = (await Bot.client.getChat(groupId)) as { title: string };

  return group.title;
};

const generateInvite = async (groupId: string): Promise<string | undefined> => {
  try {
    return (
      await Bot.client.createChatInviteLink(groupId, {
        creates_join_request: true
      })
    ).invite_link;
  } catch (err) {
    logger.error(err);
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
    await Bot.client.banChatMember(groupId, +userId, dayjs().unix() + 30);
    const groupName = await getGroupName(groupId);

    try {
      await Bot.client.sendMessage(
        userId,
        "You have been kicked from the group " +
          `${groupName}${reason ? `, because you ${reason}` : ""}.`
      );

      return {
        success: !(await isMember(groupId.toString(), userId)),
        errorMsg: null
      };
    } catch (_) {
      const errorMsg = `The bot can't initiate conversation with user "${userId}"`;

      logger.warn(errorMsg);

      return {
        success: !(await isMember(groupId.toString(), userId)),
        errorMsg
      };
    }
  } catch (err) {
    const errorMsg = err.response?.description;

    logger.error(errorMsg);

    return { success: false, errorMsg };
  }
};

const sendMessageForSupergroup = async (groupId: number) => {
  const groupName = await getGroupName(groupId);

  await Bot.client.sendMessage(
    groupId,
    `This is the group ID of "${groupName}": \`${groupId}\` .\n` +
      "Paste it to the Guild creation interface!",
    { parse_mode: "Markdown" }
  );
  await Bot.client.sendPhoto(groupId, config.assets.groupIdImage);
  await Bot.client.sendMessage(
    groupId,
    "It is critically important to *set Group type to 'Private Group'* to create a functioning Guild",
    { parse_mode: "Markdown" }
  );
};

const sendNotASuperGroup = async (groupId: number) => {
  await Bot.client.sendMessage(
    groupId,
    "This Group is currently not a Supergroup.\n" +
      "Please make sure to enable *all of the admin rights* for the bot.",
    { parse_mode: "Markdown" }
  );
  await Bot.client.sendAnimation(groupId, config.assets.adminVideo);
};

const sendNotAnAdministrator = async (groupId: number) => {
  await Bot.client.sendMessage(
    groupId,
    "Please make sure to enable *all of the admin rights* for the bot.",
    { parse_mode: "Markdown" }
  );
  await Bot.client.sendAnimation(groupId, config.assets.adminVideo);
};

export {
  getGroupName,
  generateInvite,
  kickUser,
  sendNotASuperGroup,
  sendMessageForSupergroup,
  sendNotAnAdministrator
};
