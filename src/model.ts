import { Effect, Schema } from "effect";

export const Breed = Schema.Union(
    Schema.Literal("Calico"),
    Schema.Literal("Siamese"),
    Schema.Literal("Carey"),
    Schema.Literal("Persian"),
    Schema.Literal("Sphynx"),
    Schema.Literal("Unknown")
)

export const Id = Schema.String.pipe(Schema.brand("id"));

export const Cat = Schema.Struct({
    id: Id,
    name: Schema.String,
    breed: Breed
})

export const CatPayload = Schema.Struct({
    name: Schema.String,
    breed: Schema.String
})

export class Cats extends Schema.parseJson(Schema.Array(Cat)) {
    static empty(){
        return Effect.succeed([] as typeof Cats.Type)
    }
}

export const ApiKey = Schema.String.pipe(Schema.brand("ApiKey"))

export const Username = Schema.String.pipe(Schema.brand("username"));

/**
 * Schema.compose(
    Schema.asSchema(Schema.StringFromBase64),
    Schema.parseJson(Schema.MapFromRecord({
        key: Username,
        value: ApiKey
    }))
)
 */

export class ApiKeyMap extends Schema.parseJson(Schema.MapFromRecord({
    key: Username,
    value: ApiKey
})){
    static empty(){
        return Effect.succeed(new Map<typeof Username.Type, typeof ApiKey.Type>())
    }
}

export class User extends Schema.Struct({
    id: ApiKey,
    username: Username,
    balance: Schema.Number
}) {}

export class Transaction extends Schema.Class<Transaction>("Transaction")({
    to: ApiKey,
    amount: Schema.Number
}){
    verify(owner: typeof ApiKey.Type){
        return VerifiedTransaction.make({
            owner,
            amount: this.amount,
            to: this.to
        })
    }
}

export class VerifiedTransaction extends Schema.Struct({
    owner: ApiKey,
    to: ApiKey,
    amount: Schema.Number
}){}

export class UserMap extends Schema.parseJson(Schema.MapFromRecord({
    key: ApiKey,
    value: User
})) {
    static empty(){
        return Effect.succeed(new Map<typeof ApiKey.Type, typeof User.Type>())
    }
}