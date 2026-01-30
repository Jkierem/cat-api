import { Effect, Either, Schema, type Layer } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { StorageLayer } from "./storage.ts";

export interface StoredEntity<A> {
    get: Effect.Effect<A, NoSuchElementException>,
    set(value: A): Effect.Effect<void>,
    remove: Effect.Effect<void>,
    update: <E>(fn: (a: A) => Effect.Effect<A, E>) => Effect.Effect<void, E> 
}

export function fromString(key: string): Effect.Effect<StoredEntity<string>, never, StorageLayer>;
export function fromString<E,R>(key: string, storage: Layer.Layer<StorageLayer, E, R>): Effect.Effect<StoredEntity<string>, E, R>;
export function fromString<E,R>(
    key: string, storage?: Layer.Layer<StorageLayer, E, R>
): Effect.Effect<StoredEntity<string>, never, StorageLayer> | Effect.Effect<StoredEntity<string>, E, R> {
    if( storage ){
        return fromString(key).pipe(Effect.provide(storage));
    } else {
        return StorageLayer.pipe(
            Effect.map(storage => {
                return {
                    get: storage.get(key),
                    set: (value: string) => storage.set(key, value),
                    remove: storage.remove(key),
                    update: fn => storage.get(key).pipe(
                        Effect.flatMap(fn),
                        Effect.flatMap(updated => storage.set(key, updated))
                    )
                } as StoredEntity<string>
            })
        )
    }
}

export function fromSchema<A>(config: { key: string, schema: Schema.Schema<A, string>, initialize?: Effect.Effect<A> }): Effect.Effect<StoredEntity<A>, never, StorageLayer>;
export function fromSchema<A,E,R>(config: { key: string, schema: Schema.Schema<A, string>, storage: Layer.Layer<StorageLayer, E, R>, initialize?: Effect.Effect<A> }): Effect.Effect<StoredEntity<A>, E, R>;
/**
 * Creates a StoredEntity from a Schema. 
 * The Schema must encode into string
 * 
 * See **Schema.parseJSON** for handling complex structures
 */
export function fromSchema<A,E,R>(
    ...args: 
     | [config: { key: string, schema: Schema.Schema<A, string> }]
     | [config: { key: string, schema: Schema.Schema<A, string>, storage: Layer.Layer<StorageLayer, E, R> }]
): Effect.Effect<StoredEntity<A>, never, StorageLayer> | Effect.Effect<StoredEntity<A>, E, R>
{
        const { key, schema, storage, initialize } = args[0] as { 
            key: string, 
            schema: Schema.Schema<A, string>, 
            storage: Layer.Layer<StorageLayer, E, R>,
            initialize?: Effect.Effect<A>
        }

        if( storage ){
            return fromSchema({ key, schema, initialize }).pipe(Effect.provide(storage))
        }

        const encode = Schema.encode(schema);
        const decode = Schema.decode(schema);
        return StorageLayer.pipe(
            Effect.tap(storage => initialize && initialize.pipe(
                Effect.flatMap(initialValue => encode(initialValue)),
                Effect.andThen(encoded => storage.set(key, encoded)),
                Effect.ignoreLogged,
                Effect.unlessEffect(storage.get(key).pipe(
                    Effect.flatMap(raw => decode(raw).pipe(
                        Effect.tapError(() => storage.remove(key))
                    )),
                    Effect.isSuccess
                ))
            )),
            Effect.map(storage => {
                return {
                    get: Effect.gen(function*(){
                        const raw = yield* storage.get(key);
                        const decoded = yield* decode(raw)
                            .pipe(Effect.catchAll(
                                Effect.fn(function*(e){
                                    yield* storage.remove(key)
                                    yield* Effect.logError(`Stored value for ${key} is invalid and cannot be decoded. Thus removed.`, e)
                                    return yield* new NoSuchElementException
                                })
                            ))
                        return decoded
                    }),
                    set: Effect.fn(function*(value: A){
                        const encoded = yield* encode(value)
                            .pipe(Effect.either)
                        if( Either.isRight(encoded) ){
                            return yield* storage.set(key, encoded.right)
                        } else {
                            return yield* Effect.logError(`Unable to encode value for ${key}`, encoded.left)
                        }
                    }),
                    remove: storage.remove(key),
                    update: Effect.fnUntraced(function*(fn){
                        const raw = yield* storage.get(key);
                        const prev = yield* decode(raw)
                            .pipe(Effect.catchAll(
                                Effect.fn(function*(e){
                                    yield* storage.remove(key)
                                    yield* Effect.logError(`Stored value for ${key} is invalid and cannot be decoded. Thus removed.`, e)
                                    return yield* new NoSuchElementException
                                })
                            ))
                        const next = yield* fn(prev);
                        yield* encode(next).pipe(
                            Effect.flatMap(encoded => storage.set(key, encoded)),
                            Effect.catchAll((e) => Effect.logError(`Unable to encode value for ${key}`, e)),
                        )
                    })
                } as StoredEntity<A>
            })
        )
}