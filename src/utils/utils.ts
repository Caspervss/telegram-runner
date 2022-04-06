/* eslint-disable consistent-return */
import axios, { AxiosResponse } from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ErrorResult } from "../api/types";
import Bot from "../Bot";
import config from "../config";
import pollStorage from "../service/pollStorage";
import { Poll, UserVote } from "../service/types";
import logger from "./logger";

dayjs.extend(utc);

const UnixTime = (date: Date): number =>
  Math.floor((date as unknown as number) / 1000);

const getErrorResult = (error: any): ErrorResult => {
  let errorMsg: string;

  if (error instanceof Error) {
    errorMsg = error.message;
  } else if (error?.response?.description) {
    errorMsg = error.response.description;
  } else {
    logger.error(error);
    errorMsg = "unknown error";
  }

  return {
    errors: [
      {
        msg: errorMsg
      }
    ]
  };
};

const logAxiosResponse = (res: AxiosResponse<any>) => {
  logger.verbose(
    `${res.status} ${res.statusText} data:${JSON.stringify(res.data)}`
  );
};

const extractBackendErrorMessage = (error: any) =>
  error.response?.data?.errors[0]?.msg;

const createPollText = async (
  poll: Poll,
  chatId: number | string
): Promise<string> => {
  let allVotes = 0;
  let numOfVoters = 0;
  let newPollText = `${poll.question}\n\n`;

  const pollResult = await axios.get(
    `${config.backendUrl}/poll/result/${poll.id}`
  );

  logAxiosResponse(pollResult);

  if (pollResult.data.length === 0) {
    throw new Error("Poll query failed for counting result.");
  }

  poll.options.forEach((option: string) => {
    allVotes += pollResult.data[option];
  });

  poll.options.forEach((option) => {
    newPollText += `${option}\n▫️${
      pollResult.data[option] > 0
        ? ((pollResult.data[option] / allVotes) * 100).toFixed(2)
        : "0"
    }%\n\n`;
  });

  const votersResponse = await axios.get(
    `${config.backendUrl}/poll/voters/${poll.id}`
  );

  logAxiosResponse(votersResponse);

  if (votersResponse.data.length === 0) {
    throw new Error("Failed to query user votes.");
  }

  const votesByOption: {
    [k: string]: UserVote[];
  } = votersResponse.data;

  poll.options.forEach((option: string) => {
    numOfVoters += votesByOption[option].length;
  });

  newPollText = newPollText.concat(
    `👥[${numOfVoters} person](https://t.me/${config.botUsername}?start=voters_${poll.id}_${chatId}) voted so far.`
  );

  if (dayjs().isAfter(dayjs.unix(poll.expDate))) {
    newPollText = newPollText.concat("\n\nPoll has already ended.");
  } else {
    newPollText = newPollText.concat(
      `\n\nPoll ends on ${dayjs
        .unix(poll.expDate)
        .utc()
        .format("YYYY-MM-DD HH:mm UTC")}`
    );
  }

  return newPollText;
};

const createVoteListText = async (
  chatId: string,
  poll: Poll,
  showBalance: boolean = true
): Promise<string> => {
  let allVotes: number = 0;
  let pollText: string = "Results:\n";

  const pollResult = await axios.get(
    `${config.backendUrl}/poll/result/${poll.id}`
  );

  logAxiosResponse(pollResult);

  if (pollResult.data.length === 0) {
    throw new Error("Poll query failed for listing votes.");
  }

  const votersResponse = await axios.get(
    `${config.backendUrl}/poll/voters/${poll.id}`
  );

  logAxiosResponse(votersResponse);

  if (votersResponse.data.length === 0) {
    throw new Error("Failed to query user votes.");
  }

  poll.options.forEach((option: string) => {
    allVotes += pollResult.data[option];
  });

  const optionVotes: {
    [k: string]: string[];
  } = Object.fromEntries(poll.options.map((option) => [option, []]));

  const votesByOption: {
    [k: string]: UserVote[];
  } = votersResponse.data;

  await Promise.all(
    poll.options.map(async (option) => {
      const votes = votesByOption[option];
      await Promise.all(
        votes.map(async (vote) => {
          const chatMember = await Bot.Client.getChatMember(
            chatId,
            parseInt(vote.tgId, 10)
          );

          if (showBalance) {
            optionVotes[option].push(
              chatMember
                ? `${chatMember.user.first_name} ${vote.balance}\n`
                : `Unknown_User ${vote.balance}\n`
            );
          } else {
            optionVotes[option].push(
              chatMember ? `${chatMember.user.first_name}\n` : `Unknown_User\n`
            );
          }
        })
      );
    })
  );

  poll.options.forEach((option: string) => {
    pollText += `\n▫️ ${option} - `;

    pollText += `${
      pollResult.data[option] > 0
        ? ((pollResult.data[option] / allVotes) * 100).toFixed(2)
        : 0
    }%\n`;

    pollText += optionVotes[option].join("");
  });

  return pollText;
};

const pollBuildResponse = async (userId: string): Promise<boolean> => {
  switch (pollStorage.getUserStep(userId)) {
    case undefined:
      await Bot.Client.sendMessage(
        userId,
        "Please use the /poll command in a guild."
      );
      return true;
    case 0:
      await Bot.Client.sendMessage(
        userId,
        "Please use the /poll command in a guild."
      );
      return true;
    case 1:
      await Bot.Client.sendMessage(
        userId,
        "A poll must have a token as the base of the weighted vote."
      );
      return true;
    case 2:
      await Bot.Client.sendMessage(
        userId,
        "A poll must have a question. Please send me the question of your poll."
      );
      return true;
    case 3:
      await Bot.Client.sendMessage(
        userId,
        "A poll must have a duration. Please send me the duration of your poll in DD:HH:mm format."
      );
      return true;
    case 4:
      await Bot.Client.sendMessage(
        userId,
        "A poll must have options. Please send me the first one."
      );
      return true;
    case 5:
      await Bot.Client.sendMessage(
        userId,
        "A poll must have more than one option. Please send me a second one."
      );
      return true;
    default:
      break;
  }
  return false;
};

const sendPollTokenPicker = async (
  ctx: any,
  guildId: number
): Promise<void> => {
  const guildRes = await axios.get(`${config.backendUrl}/guild/${guildId}`);

  if (!guildRes) {
    ctx.reply("Something went wrong. Please try again or contact us.");
    return;
  }

  const requirements = guildRes.data.roles[0].requirements.filter(
    (requirement) => requirement.type === "ERC20"
  );

  if (requirements.length === 0) {
    await Bot.Client.sendMessage(
      ctx.message.from.id,
      "Your guild has no requirement with an appropriate token standard." +
        "Weighted polls only support ERC20."
    );
    return;
  }

  const tokenButtons = requirements.map((requirement) => {
    const { name, chain, address, id } = requirement;

    return [
      {
        text: `${name}-${chain}-${address}`,
        callback_data: `${name}-${chain};${id};PickRequirement`
      }
    ];
  });

  await Bot.Client.sendMessage(
    ctx.message.from.id,
    "Let's start creating your poll. You can use /reset or /cancel to restart or stop the process at any time.\n\n" +
      "First, please choose a token as the base of the weighted vote.",
    {
      reply_markup: {
        inline_keyboard: tokenButtons
      }
    }
  );
};

const updatePollTexts = async (
  pollText: string,
  newPollText: string,
  poll: Poll,
  chatId: string,
  pollMessageId: string,
  adminId: string,
  adminMessageId: number
): Promise<void> => {
  try {
    if (newPollText === pollText) {
      return;
    }

    if (dayjs().isAfter(dayjs.unix(poll.expDate))) {
      // Delete buttons
      await Bot.Client.editMessageText(
        adminId,
        adminMessageId,
        undefined,
        newPollText,
        { parse_mode: "Markdown" }
      );

      await Bot.Client.editMessageText(
        chatId,
        parseInt(pollMessageId, 10),
        undefined,
        newPollText,
        { parse_mode: "Markdown" }
      );

      return;
    }

    const voteButtonRow = poll.options.map((option) => [
      {
        text: option,
        callback_data: `${option};${poll.id};${adminId}:${adminMessageId};Vote`
      }
    ]);

    const listVotersButton = {
      text: "List Voters",
      callback_data: `${chatId}:${pollMessageId};${poll.id};ListVoters`
    };

    const updateResultButton = {
      text: "Update Result",
      callback_data: `${chatId}:${pollMessageId};${poll.id};UpdateResult`
    };

    await Bot.Client.editMessageText(
      chatId,
      parseInt(pollMessageId, 10),
      undefined,
      newPollText,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: voteButtonRow
        }
      }
    );

    await Bot.Client.editMessageText(
      adminId,
      adminMessageId,
      undefined,
      newPollText,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[listVotersButton, updateResultButton]]
        }
      }
    );
  } catch (err) {
    logger.error(err);
  }
};

export {
  UnixTime,
  getErrorResult,
  logAxiosResponse,
  extractBackendErrorMessage,
  createPollText,
  createVoteListText,
  pollBuildResponse,
  sendPollTokenPicker,
  updatePollTexts
};
