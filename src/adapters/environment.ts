import { Config, Effect } from "effect";

export class Environment extends Effect.Service<Environment>()("Environment", {
    accessors: true,
    succeed: {
        PersistanceFolder: Config.string("PERSISTANCE_FOLDER").pipe(Config.withDefault("./.persist")),
        Port: Config.port("PORT").pipe(Config.withDefault(3000)),
        Mode: Config.string("MODE").pipe(Config.withDefault("development"))
    }
}){}