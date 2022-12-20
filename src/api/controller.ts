import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { getGroupName, getUser, isIn, isMember } from "./actions";
import { IsMemberParam } from "./types";
import { getErrorResult } from "../utils/utils";
import logger from "../utils/logger";
import { service } from "./service";

const controller = {
  access: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await service.access(req.body);
      res.status(200).json(result);
    } catch (err) {
      logger.error(`access - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  },

  guild: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await service.guild(req.body);
      res.status(200).json(result);
    } catch (err) {
      logger.error(`guild - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  },

  role: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await service.role(req.body);
      res.status(200).json(result);
    } catch (err) {
      logger.error(`role - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  },

  info: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { platformGuildId } = req.params;

      const result = await service.info(platformGuildId);
      res.status(200).json(result);
    } catch (err) {
      logger.error(`info - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  },

  resolveUser: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await service.resolveUser(req.body);
      res.status(200).json(result);
    } catch (err) {
      logger.error(`resolveUser - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  },

  isMember: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const params: IsMemberParam = req.body;
      let isTelegramMember = false;

      await Promise.all(
        params.groupIds.map(async (groupId) => {
          const inGroup = await isMember(groupId, params.platformUserId);

          if (inGroup) {
            isTelegramMember = true;
          }
        })
      );

      res.status(200).json(isTelegramMember);
    } catch (err) {
      logger.error(`isMember - ${err.message}`);
    }
  },

  isIn: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { groupId } = req.params;

    try {
      const result = await isIn(+groupId);
      logger.verbose({
        message: `isIn result - ${result}`,
        meta: groupId
      });
      res.status(200).json(result);
    } catch (err) {
      logger.error(`isIn - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  },

  getGroupNameById: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { groupId } = req.params;

    try {
      const result = await getGroupName(+groupId);
      logger.verbose({
        message: `getGroupNameById result - ${result}`,
        meta: groupId
      });
      res.status(200).json(result);
    } catch (err) {
      logger.error(`getGroupNameById - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  },

  getUser: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { platformUserId } = req.params;
      const result = await getUser(+platformUserId);
      logger.verbose({
        message: `getUser result - ${result}`,
        meta: platformUserId
      });
      res.status(200).json(result);
    } catch (err) {
      logger.error(`getUser - ${err.message}`);
      res.status(400).json(getErrorResult(err));
    }
  }
};

export { controller };
