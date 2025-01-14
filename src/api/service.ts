import { createHash, createHmac } from "crypto";
import Bot from "../Bot";
import config from "../config";
import { generateInvite, kickUser } from "../service/common";
import logger from "../utils/logger";
import { getGroupName, getGuild, isMember } from "./actions";
import {
  AccessEventParams,
  AccessResult,
  GuildEventParams,
  GuildEventResponse,
  OauthData,
  RoleEventParams,
  RoleEventResponse
} from "./types";

const service = {
  access: async (params: AccessEventParams[]): Promise<AccessResult[]> => {
    logger.verbose({ message: "access params", meta: params });

    const results = await Promise.all(
      params.map(async (item) => {
        const { action, platformUserId, platformGuildId } = item;
        let result: AccessResult;

        try {
          if (action === "ADD") {
            if (config.unbanAtAddAccess === "true") {
              await Bot.client.unbanChatMember(
                platformGuildId,
                +platformUserId,
                { only_if_banned: true }
              );
            }
            result = {
              success: await isMember(platformGuildId, +platformUserId),
              errorMsg: null
            };
          }
          if (action === "REMOVE") {
            const [guild, groupName] = await Promise.all([
              getGuild(platformGuildId),
              getGroupName(+platformGuildId)
            ]);

            result = await kickUser(
              +platformGuildId,
              +platformUserId,
              `You have been kicked from the group "${groupName}". Reason: Have not fulfilled the requirements, disconnected your Telegram account or just left the guild. If you want to check the guild, visit here: ${guild.url}`
            );
          }
          return result;
        } catch (error) {
          return {
            success: false,
            errorMsg: error.message
          };
        }
      })
    );

    logger.verbose({ message: "access result", meta: results });

    return results;
  },

  guild: async (params: GuildEventParams): Promise<GuildEventResponse> => {
    logger.verbose({ message: "guild params", meta: params });

    const { platformGuildId } = params;

    const result = {
      platformGuildId,
      platformGuildData: {}
    };

    logger.verbose({ message: "guild result", meta: result });

    return result;
  },

  role: async (params: RoleEventParams): Promise<RoleEventResponse> => {
    logger.verbose({ message: "role params", meta: params });

    const { platformRoleId } = params;

    const result = {
      platformGuildData: {},
      platformRoleId
    };

    logger.verbose({ message: "role result", meta: result });

    return result;
  },

  info: async (platformGuildId: string) => {
    logger.verbose({ message: "info params", meta: { platformGuildId } });

    const [name, invite] = await Promise.all([
      getGroupName(+platformGuildId),
      generateInvite(platformGuildId)
    ]);
    const result = { name, invite };

    logger.verbose({ message: "info result", meta: result });

    return result;
  },

  resolveUser: async (params) => {
    logger.verbose({ message: "resolveUser params", meta: params });

    const hashOfToken = createHash("sha256")
      .update(config.telegramToken)
      .digest();

    const verify = (authData: OauthData) => {
      const { hash, ...rest } = authData;

      const hashRecreation = createHmac("sha256", hashOfToken)
        .update(
          Object.entries(rest)
            .map(([key, value]) => `${key}=${value}`)
            .sort()
            .join("\n")
        )
        .digest("hex");

      return hash === hashRecreation;
    };

    const result = {
      platformUserId: verify(params) ? params.id : null,
      platformUserData: null
    };

    logger.verbose({ message: "resolveUser result", meta: result });

    return result;
  }
};

export { service };
