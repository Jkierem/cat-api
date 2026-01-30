import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { ApiLive } from "./api.ts"
import { Environment } from "./adapters/environment.ts"
import { createServer } from "node:http"

const ServerLayer = Environment.Port
    .pipe(
        Effect.map(port => NodeHttpServer.layer(createServer, { port })),
        Layer.unwrapEffect
    )

const SwaggerMiddleware = Environment.Mode
    .pipe(
        Effect.tap(mode => Effect.logInfo(`Running in ${mode} mode...`)),
        Effect.map(mode => mode === "development"),
        Effect.map(dev => dev
            ? HttpApiSwagger.layer({ path: "/swagger" })
            : Layer.empty
        ),
        Layer.unwrapEffect
    )

export const ServerLive = HttpApiBuilder.serve(
    HttpMiddleware.logger,
).pipe(
    HttpServer.withLogAddress,
    Layer.provide(SwaggerMiddleware),
    Layer.provide(HttpApiBuilder.middlewareCors()),
    Layer.provide(ApiLive),
    Layer.provide(ServerLayer),
    Layer.provide(Environment.Default)
)