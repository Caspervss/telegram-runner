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

  router.post("/guild", controller.guild);

  router.post("/role", controller.role);

  router.get(
    "/info/:platformGuildId",
    validators.paramIdValidator("platformGuildId"),
    controller.info
  );

  router.post("/resolveUser", controller.resolveUser);

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
