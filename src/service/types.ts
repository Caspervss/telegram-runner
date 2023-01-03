import { Context, NarrowedContext } from "telegraf";
import { Message, Update } from "telegraf/types";

type Ctx = NarrowedContext<
  Context,
  {
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
  }
> & { startPayload?: string };

export { Ctx };
