import { Effect } from "effect";
import { randomUUID } from "node:crypto"

export class Crypto extends Effect.Service<Crypto>()("Crypto", {
    accessors: true,
    succeed: {
        uuid: Effect.sync(() => randomUUID())
    }
}){}