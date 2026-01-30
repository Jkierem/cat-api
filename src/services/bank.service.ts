import { Effect, Schema } from "effect";
import { Persistance } from "../adapters/persistance.ts";
import { ApiKey, Transaction, User, Username } from "../model.ts";

export class InsufficientFunds
extends Schema.TaggedError<InsufficientFunds>("InsufficientFunds")("InsufficientFunds", {}) {}

export class UserNotFound
extends Schema.TaggedError<UserNotFound>("UserNotFound")("UserNotFound", {}) {}

export class Bank extends Effect.Service<Bank>()("Bank", {
    accessors: true,
    effect: Effect.gen(function*(){
        const users = yield* Persistance.Users;
        return {
            create: Effect.fn(function*(apiKey: typeof ApiKey.Type, username: typeof Username.Type){
                const newUser = yield* Schema.decodeUnknown(User)({
                    id: apiKey,
                    username,
                    balance: 0
                });

                yield* users.update(prev => Effect.sync(() => prev.set(apiKey, newUser)))

                return newUser
            }, Effect.orDie),
            read: Effect.fn(function*(id: typeof ApiKey.Type){
                const allUsers = yield* users.get;

                return yield* Effect.fromNullable(allUsers.get(id));
            }, Effect.catchTag("NoSuchElementException", () => new UserNotFound)),
            attemptTransaction: Effect.fn(function*(tx: typeof Transaction.Type){
                const allUsers = yield* users.get;

                const user = yield* Effect.fromNullable(allUsers.get(tx.to));

                if( tx.amount < 0 && user.balance < Math.abs(tx.amount) ){
                    return yield* new InsufficientFunds;
                }

                const updatedUser = {
                    ...user,
                    balance: user.balance + tx.amount
                }

                yield* users.update(prev => Effect.sync(() => prev.set(tx.to, updatedUser)))
                
                return updatedUser
            }, Effect.catchTag("NoSuchElementException", () => new UserNotFound))
        }
    })
}){}