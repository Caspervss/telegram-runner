import { Router } from "express";
import { body } from "express-validator";
import { controller } from "./controller";
import validators from "./validators";

const createRouter = () => {
  const router: Router = Router();

  router.post(
    "/access",
    body().isArray(),
    body("*.action").isIn(["ADD", "REMOVE"]),
    body("*.platformGuildData"),
    validators.bodyIdValidator("*.platformUserId"),
    validators.bodyIdValidator("*.platformGuildId"),
    validators.bodyStringValidator("*.guildName"),
    validators.bodyArrayValidator("*.roles"),
    validators.bodyStringValidator("*.roles.*.roleName"),
    controller.access
  );

  router.post(
    "/guild",
    body("action").isIn(["CREATE", "UPDATE", "DELETE"]),
    body("platformGuildData").optional(),
    validators.bodyIdValidator("platformGuildId"),
    controller.guild
  );

  router.post(
    "/role",
    body("action").isIn(["CREATE", "UPDATE", "DELETE"]),
    body("platformGuildData").optional(),
    body("platformRoleData").optional(),
    validators.bodyIdValidator("platformGuildId"),
    validators.bodyIdValidator("platformRoleId").optional(),
    controller.role
  );

  router.get(
    "/info/:platformGuildId",
    validators.paramIdValidator("platformGuildId"),
    controller.info
  );

  router.post("/resolveUser", controller.resolveUser);

  router.post(
    "/isMember",
    validators.bodyIdValidator("platformUserId"),
    validators.bodyArrayValidator("groupIds"),
    controller.isMember
  );

  router.get(
    "/isIn/:groupId",
    validators.paramIdValidator("groupId"),
    controller.isIn
  );

  router.get(
    "/:groupId",
    validators.paramIdValidator("groupId"),
    controller.getGroupNameById
  );

  // TODO make like /userinfo in other connectors
  router.get(
    "/user/:platformUserId",
    validators.paramIdValidator("platformUserId"),
    controller.getUser
  );

  return router;
};

export default createRouter;
