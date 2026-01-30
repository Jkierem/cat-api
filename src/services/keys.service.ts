import { Effect, Schema, Data } from "effect";
import { Persistance } from "../adapters/persistance.ts";
import { ApiKey, ApiKeyMap, Username } from "../model.ts"
import { Crypto } from "../adapters/crypto.ts";

export class InvalidApiKey 
extends Schema.TaggedError<InvalidApiKey>("InvalidApiKey")("InvalidApiKey", {}){}

export type RegisterResult = Data.TaggedEnum<{
    New: { key: typeof ApiKey.Type },
    Old: { key: typeof ApiKey.Type }
}>;

export const RegisterResult = Data.taggedEnum<RegisterResult>();

export class Keys extends Effect.Service<Keys>()("Keys", {
    accessors: true,
    effect: Effect.gen(function*(){
        const keys = yield* Persistance.ApiKeys;
        const crypto = yield* Crypto;
        return {
            verify: Effect.fn(function*(key: typeof ApiKey.Type){
                const keyMap = yield* keys.get.pipe(
                    Effect.tapError(() => keys.set(new Map)),
                    Effect.catchAll(() => ApiKeyMap.empty())
                )
                return yield* [...keyMap.values()].includes(key) 
                    ? Effect.void 
                    : new InvalidApiKey;
            }),
            register: Effect.fn(function*(username: typeof Username.Type){
                const keyMap = yield* keys.get.pipe(
                    Effect.tapError(() => keys.set(new Map)),
                    Effect.catchAll(() => ApiKeyMap.empty())
                )
                const key = keyMap.get(username);
                if( !key ){
                    const newKey = ApiKey.make(yield* crypto.uuid)
                    keyMap.set(username, newKey)
                    yield* keys.set(keyMap);
                    return RegisterResult.New({ key: newKey })
                }
                return RegisterResult.Old({ key });
            })
        }
    })
}){}