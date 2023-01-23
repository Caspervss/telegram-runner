/* eslint-disable no-unused-vars */

import * as dotenv from "dotenv";

dotenv.config();

const telegramToken = process.env.BOT_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const api = {
  prefix: "/api",
  port: process.env.PORT || 8991
};
const adminGroupVideo = process.env.ADMIN_GROUP_VIDEO_URL;
const adminChannelVideo = process.env.ADMIN_CHANNEL_VIDEO_URL;
const chatIdImage = process.env.CHAT_ID_IMAGE;
const nodeEnv = process.env.NODE_ENV || "development";

const botId = process.env.BOT_ID;
const unbanAtAddAccess = process.env.UNBAN_AT_ADD_ACCESS || false;

if (!telegramToken) {
  throw new Error("You need to specify the bot's BOT_TOKEN in the .env file.");
}

if (!backendUrl) {
  throw new Error("You need to specify the BACKEND_URL in the .env file.");
}

export default {
  telegramToken,
  backendUrl,
  api,
  platform: "TELEGRAM",
  assets: {
    chatIdImage,
    adminChannelVideo,
    adminGroupVideo
  },
  nodeEnv,
  unbanAtAddAccess,
  botId
};
