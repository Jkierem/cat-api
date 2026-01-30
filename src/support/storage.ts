import { Effect, Layer } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { Environment } from "../adapters/environment.ts";
import { FileSystem, KeyValueStore, Path } from "@effect/platform";

export class StorageLayer extends Effect.Tag("adapters/StorageLayer")<
    StorageLayer,
    {
        get(key: string): Effect.Effect<string, NoSuchElementException>,
        set(key: string, value: string): Effect.Effect<void>,
        remove(key: string): Effect.Effect<void>,
        clear(): Effect.Effect<void>
    }
>(){
    static FileSystem = Layer.effect(this, Effect.gen(function*(){
        const folder = yield* Environment.PersistanceFolder;
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        return {
            get: (name: string) => fs
                .readFileString(path.join(folder, name))
                .pipe(Effect.mapError(() => new NoSuchElementException)),
            clear: Effect.fn(function*(){
                const files = yield* fs.readDirectory(folder)
                for (let file of files) {
                    yield* fs.remove(path.join(folder, file));
                }
            }, Effect.orDie),
            remove: Effect.fnUntraced(function*(key: string){
                return yield* fs.remove(path.join(folder, key))
            }, Effect.orDie),
            set: Effect.fnUntraced(function*(key: string, value: string){
                return yield* fs.writeFileString(path.join(folder, key), value)
            }, Effect.orDie),
        }
    }))

    static KeyValue = Layer.effect(this, Effect.gen(function*(){
        const kv = yield* KeyValueStore.KeyValueStore;
        return {
            get(key) {
                return kv.get(key).pipe(
                    Effect.flatten,
                    Effect.mapError(() => new NoSuchElementException())
                )
            },
            clear() {
                return kv.clear.pipe(Effect.orDie)
            },
            remove(key) {
                return kv.remove(key).pipe(Effect.orDie)
            },
            set(key, value) {
                return kv.set(key, value).pipe(Effect.orDie)
            },
        }
    }))
}