import axios from "axios";
import { GuildPlatformData } from "@guildxyz/sdk";
import { getGroupName } from "../service/common";
import Bot from "../Bot";
import { IsInResult } from "./types";
import logger from "../utils/logger";
import config from "../config";
import Main from "../Main";

const isMember = async (
  groupId: string,
  platformUserId: number
): Promise<boolean> => {
  try {
    if (!platformUserId) {
      throw new Error(`PlatformUserId doesn't exists for ${platformUserId}.`);
    }

    const member = await Bot.client.getChatMember(groupId, +platformUserId);
    const inGroup = member !== undefined && member.status === "member";

    logger.verbose({
      message: "isMember result - ",
      meta: { groupId, platformUserId, inGroup }
    });
    return inGroup;
  } catch (_) {
    return false;
  }
};

const isIn = async (groupId: number): Promise<IsInResult> => {
  try {
    const chat = await Bot.client.getChat(groupId);

    if (!["supergroup", "channel"].includes(chat.type)) {
      return {
        ok: false,
        message:
          "This is not a Supergroup!\n" +
          "Please convert this group into a Supergroup first!"
      };
    }

    const botId = (await Bot.client.getMe()).id;
    const membership = await Bot.client.getChatMember(groupId, botId);

    if (membership.status !== "administrator") {
      return {
        ok: false,
        message: "It seems like our Bot hasn't got the right permissions."
      };
    }

    if (chat?.photo?.small_file_id) {
      try {
        const fileInfo = await axios.get(
          `https://api.telegram.org/bot${config.telegramToken}/getFile?file_id=${chat.photo.small_file_id}`
        );
        if (!fileInfo.data.ok) {
          throw Error("cannot fetch file info");
        }

        const blob = await axios.get(
          `https://api.telegram.org/file/bot${config.telegramToken}/${fileInfo.data.result.file_path}`,
          { responseType: "arraybuffer" }
        );

        return {
          ok: true,
          groupName: (chat as any).title,
          groupIcon: `data:image/jpeg;base64,${blob.data.toString("base64")}`
        };
      } catch {
        return {
          ok: true,
          groupName: (chat as any).title,
          groupIcon: ""
        };
      }
    }

    return {
      ok: true,
      groupName: (chat as any).title,
      groupIcon: ""
    };
  } catch (err) {
    return {
      ok: false,
      message: `You have to add @${Bot.info.username} to your Telegram group/channel to continue!`
    };
  }
};

const getUser = async (platformUserId: number) => {
  logger.verbose({ message: "getUser", meta: { platformUserId } });

  const chat = await Bot.client.getChat(platformUserId);

  if (chat?.photo?.small_file_id) {
    const fileInfo = await axios.get(
      `https://api.telegram.org/bot${config.telegramToken}/getFile?file_id=${chat.photo.small_file_id}`
    );

    if (!fileInfo.data.ok) {
      throw Error("cannot fetch file info");
    }

    const blob = await axios.get(
      `https://api.telegram.org/file/bot${config.telegramToken}/${fileInfo.data.result.file_path}`,
      { responseType: "arraybuffer" }
    );

    return {
      username: (chat as any).username,
      avatar: `data:image/jpeg;base64,${blob.data.toString("base64")}`
    };
  }

  return {
    username: (chat as any).username
  };
};

const getGuild = async (platformGuildId: string) => {
  const { urlName, name } = await Main.platform.guild.get(platformGuildId);
  const url = `https://guild.xyz/${urlName}?utm_source=telegram`;
  return { url, name };
};

const getUserAccess = async (
  platformUserId: string,
  platformGuildId: string
): Promise<{ access: GuildPlatformData; reason?: string }> => {
  let access: GuildPlatformData;
  try {
    access = await Main.platform.guild.getUserAccess(
      platformGuildId.toString(),
      platformUserId.toString()
    );
  } catch (err) {
    try {
      const errorMsg = err?.response?.data?.errors?.[0].msg;

      if (errorMsg.startsWith("Cannot find guild")) {
        logger.error(`No guild is associated with "${platformGuildId}" group.`);
      } else if (errorMsg.startsWith("Cannot find user")) {
        const guild = await getGuild(platformGuildId);
        const groupName = await getGroupName(+platformGuildId);

        return {
          access: null,
          reason: `You have been kicked from the "${groupName}" chat. Reason: Your telegram account is not connected with Guild. If you would like to join, you can do it here: ${guild.url}`
        };
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
  return { access };
};

export { getGroupName, isMember, isIn, getUser, getUserAccess, getGuild };
