import dotenv from "dotenv";
dotenv.config();
import "reflect-metadata";
import express from "express";
import { createServer } from "http";
import config from "config";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { HelloResolver } from "./resolvers/HelloResolver";
import PostResolver from "./resolvers/PostResolver";
import { UserResolver } from "./resolvers/UserResolver";
import session from "express-session";
import connectRedis from "connect-redis";
import Redis from "ioredis";
import cors from "cors";
import connectDb from "./utils/connectDb";
import { dataSource } from "./utils/connectDb";
import { User } from "./entity/user";
import { Post } from "./entity/post";

const port = config.get<number>("port");

async function main() {
  // connecting database
  await connectDb();
  const UserRepo = dataSource.getRepository(User);
  const PostRepo = dataSource.getRepository(Post);

  // initiating app
  const app = express();
  const server = createServer(app);

  app.use(
    cors({
      origin: ["http://localhost:3000"],
      credentials: true,
    })
  );

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    session({
      name: "qid",
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: config.get<boolean>("__prod__"),
      },
      saveUninitialized: false,
      secret: "sdlkfjdsfudfsldfdslfjdfuisdkfl",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    context: ({ req, res }) => ({ req, res, redis, UserRepo, PostRepo }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  server.listen(port, () => console.log("server is running on port-->", port));
}

main();
