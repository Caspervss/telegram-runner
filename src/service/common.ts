import axios from "axios";
import { CommunityResult } from "../api/types";
import Bot from "../Bot";
import config from "../config";
import logger from "../utils/logger";
import { getUserHash, logAxiosResponse } from "../utils/utils";

const getGroupName = async (groupId: string): Promise<string> =>
  ((await Bot.Client.getChat(groupId)) as { title: string }).title;

const fetchCommunitiesOfUser = async (
  platformUserId: string
): Promise<CommunityResult[]> => {
  logger.verbose(
    `Called fetchCommunitiesOfUser, platformUserId=${platformUserId}`
  );
  const userHash = await getUserHash(platformUserId);
  logger.verbose(`fetchCommunitiesOfUser userHash - ${userHash}`);

  const res = await axios.get(`${config.backendUrl}/communities/${userHash}`);

  logAxiosResponse(res);

  return (res.data as CommunityResult[]).filter(
    (community) => community.telegramIsMember
  );
};

const leaveCommunity = async (
  platformUserId: string,
  communityId: string
): Promise<void> => {
  logger.verbose(
    `Called leaveCommunity, platformUserId=${platformUserId}, communityId=${communityId}`
  );

  try {
    const userHash = await getUserHash(platformUserId);
    logger.verbose(`leaveCommunity userHash - ${userHash}`);
    const res = await axios.post(
      `${config.backendUrl}/user/removeFromPlatform`,
      {
        platformUserId: userHash,
        platform: config.platform,
        communityId,
        triggerKick: true
      }
    );

    logAxiosResponse(res);

    logger.debug(JSON.stringify(res.data));
  } catch (err) {
    logger.error(err);
  }
};

const kickUser = async (
  groupId: string,
  platformUserId: string,
  reason: string
): Promise<void> => {
  logger.verbose(
    `Called kickUser, groupId=${groupId}, platformUserId=${platformUserId}, ` +
      `reason=${reason}`
  );

  try {
    await Bot.Client.kickChatMember(groupId, +platformUserId);

    const groupName = await getGroupName(groupId);

    await Bot.Client.sendMessage(
      platformUserId,
      "You have been kicked from the group " +
        `${groupName}, because you ${reason}.`
    );
  } catch (err) {
    logger.error(
      "An error occured while trying to remove a Telegram user with userId " +
        `"${platformUserId}", because:\n${err}`
    );
  }
};

export { getGroupName, fetchCommunitiesOfUser, leaveCommunity, kickUser };
