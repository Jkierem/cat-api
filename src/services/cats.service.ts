import { Effect, Schema } from "effect";
import { Persistance } from "../adapters/persistance.ts";
import { Cats, CatPayload, Cat, Id } from "../model.ts";
import { Crypto } from "../adapters/crypto.ts";

export class InvalidCat
extends Schema.TaggedError<InvalidCat>("InvalidCat")("InvalidCat", {}){}

export class CatService extends Effect.Service<CatService>()("CatService", {
    accessors: true,
    effect: Effect.gen(function*() {
        const cats = yield* Persistance.Cats;
        const crypto = yield* Crypto;
        return {
            getAll: Effect.fnUntraced(function*(name: string = "", breed: string = ""){
                const allCats = yield* cats.get.pipe(Effect.catchAll(() => Cats.empty()))
                return allCats.filter(
                    cat => cat.name.startsWith(name) && cat.breed.startsWith(breed)
                )
            }),
            create: Effect.fnUntraced(function*(payload: typeof CatPayload.Type){
                const newCat = yield* Schema.decodeUnknown(Cat)({
                    id: Id.make(yield* crypto.uuid),
                    ...payload,
                }).pipe(Effect.mapError(() => new InvalidCat))

                yield* cats.update(prev => Effect.succeed([...prev, newCat]))
                return newCat
            }),
            delete: Effect.fnUntraced(function*(id: typeof Id.Type){
                return yield* cats.update(prev => Effect.succeed(prev.filter(cat => cat.id !== id)))
            }),
        }
    }),
}){}