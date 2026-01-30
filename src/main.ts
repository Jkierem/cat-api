import { Effect, Layer } from "effect/index";
import { ServerLive } from "./server.ts";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { CatService } from "./services/cats.service.ts";
import { Keys } from "./services/keys.service.ts";
import { Persistance } from "./adapters/persistance.ts";
import { Crypto } from "./adapters/crypto.ts";
import { Environment } from "./adapters/environment.ts";
import { Bank } from "./services/bank.service.ts";
import { UserService } from "./services/user.service.ts";

const program = Layer.launch(ServerLive).pipe(
    Effect.provide(CatService.Default),
    Effect.provide(UserService.Default),
    Effect.provide(Keys.Default),
    Effect.provide(Bank.Default),
    Effect.provide(Persistance.Default),
    Effect.provide(Crypto.Default),
    Effect.provide(Environment.Default),
)

NodeRuntime.runMain(
    program.pipe(Effect.provide(NodeContext.layer))
)