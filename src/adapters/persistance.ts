import { Effect } from "effect";
import { fromSchema } from "../support/stored-entity.ts";
import { ApiKeyMap, Cats, UserMap } from "../model.ts";
import { StorageLayer } from "../support/storage.ts";

export class Persistance extends Effect.Service<Persistance>()("Persistance", {
    accessors: true,
    effect: Effect.gen(function*(){
        return {
            ApiKeys: yield* fromSchema({
                key: "api-keys",
                schema: ApiKeyMap,
                initialize: ApiKeyMap.empty(),
                storage: StorageLayer.FileSystem
            }),
            Cats: yield* fromSchema({
                key: "cats",
                schema: Cats,
                initialize: Cats.empty(),
                storage: StorageLayer.FileSystem
            }),
            Users: yield* fromSchema({
                key: "users",
                schema: UserMap,
                initialize: UserMap.empty(),
                storage: StorageLayer.FileSystem
            }),
        }
    })
}){}