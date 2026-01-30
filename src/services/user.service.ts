import { Effect, pipe } from "effect";
import { Keys, RegisterResult } from "./keys.service.ts";
import { Bank } from "./bank.service.ts";
import type { Username } from "../model.ts";

export class UserService extends Effect.Service<UserService>()("UserService",{
    accessors: true,
    effect: Effect.gen(function*(){
        const keys = yield* Keys;
        const bank = yield* Bank;

        return {
            createIfNew: Effect.fn(function*(username: typeof Username.Type){
                return yield* pipe(
                    yield* keys.register(username),
                    RegisterResult.$match({
                        New: ({ key }) => bank.create(key, username),
                        Old: ({ key }) => bank.read(key).pipe(Effect.orDie)
                    }),
                    Effect.map(user => user.id)
                )
            })
        }
    })
}){}