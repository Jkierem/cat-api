import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { ApiKey, Cat, CatPayload, Cats, Id, Transaction, User, Username, VerifiedTransaction } from "./model.ts";
import { Effect, Layer, Schema } from "effect";
import { InvalidApiKey, Keys } from "./services/keys.service.ts";
import { CatService, InvalidCat } from "./services/cats.service.ts";
import { Bank, InsufficientFunds, UserNotFound } from "./services/bank.service.ts";
import { UserService } from "./services/user.service.ts";

const IdParam = HttpApiSchema.param("id", Id);

const UsernameParam = HttpApiSchema.param("username", Username);

const CatsGroup = HttpApiGroup.make("Cats")
  .add(
    HttpApiEndpoint.get("getAll")`/cats`
      .addSuccess(Cats)
      .setHeaders(Schema.Struct({ "x-api-key": ApiKey }))
      .setUrlParams(Schema.Struct({ 
        name: Schema.String.pipe(Schema.optional),
        breed: Schema.String.pipe(Schema.optional),
      }))
  )
  .add(
    HttpApiEndpoint.post("create")`/cat`
      .addSuccess(Cat)
      .addError(InvalidCat, { status: 400 })
      .setPayload(CatPayload)
      .setHeaders(Schema.Struct({ "x-api-key": ApiKey }))
  )
  .add(
    HttpApiEndpoint.del("delete")`/cat/${IdParam}`
      .addSuccess(Schema.Void)
      .setHeaders(Schema.Struct({ "x-api-key": ApiKey }))
  )
  .addError(InvalidApiKey, { status: 400 })
    
const KeysGroup = HttpApiGroup.make("Keys")
  .add(
    HttpApiEndpoint.get("register")`/register/${UsernameParam}`
      .addSuccess(ApiKey)
  )

const BankGroup = HttpApiGroup.make("Bank")
  .add(
    HttpApiEndpoint.get("info")`/user`
      .addSuccess(User)
      .setHeaders(Schema.Struct({ "x-api-key": ApiKey }))
  )
  .add(
    HttpApiEndpoint.post("transaction")`/user`
      .setPayload(Transaction)
      .addSuccess(VerifiedTransaction)
      .setHeaders(Schema.Struct({ "x-api-key": ApiKey }))
      .addError(InsufficientFunds, { status: 405 })
      .addError(InvalidApiKey, { status: 400 })
  )
  .addError(UserNotFound, { status: 404 })


export const Api = HttpApi.make("Cats")
  .add(CatsGroup)
  .add(KeysGroup)
  .add(BankGroup)

const CatsGroupLive = HttpApiBuilder.group(
  Api, 
  "Cats",
  handlers => 
    handlers
      .handle("create", Effect.fnUntraced(function*({ headers: { "x-api-key": key }, payload }){
        yield* Keys.verify(key);
        return yield* CatService.create(payload);
      }))
      .handle("delete", Effect.fnUntraced(function*({ headers: { "x-api-key": key }, path: { id }}){
        yield* Keys.verify(key);
        return yield* CatService.delete(id);
      }))
      .handle("getAll", Effect.fnUntraced(function*({ headers: { "x-api-key": key }, urlParams: { name, breed } }){
        yield* Keys.verify(key);
        return yield* CatService.getAll(name, breed)
      }))
)

const KeysGroupLive = HttpApiBuilder.group(
  Api,
  "Keys",
  handlers => 
    handlers.handle("register", Effect.fnUntraced(function*({ path }){
      return yield* UserService.createIfNew(path.username)
    }))
)

const BankGroupLive = HttpApiBuilder.group(
  Api,
  "Bank",
  handlers => 
    handlers
      .handle("info", Effect.fnUntraced(function*({ headers }){
        return yield* Bank.read(headers["x-api-key"])
      }))
      .handle("transaction", Effect.fnUntraced(function*({ payload, headers }){
        const owner = headers["x-api-key"];
        yield* Keys.verify(owner);
        return yield* Bank.attemptTransaction(payload).pipe(
          Effect.map(() => payload.verify(owner))
        )
      }))
)

export const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(CatsGroupLive),
  Layer.provide(KeysGroupLive),
  Layer.provide(BankGroupLive)
)