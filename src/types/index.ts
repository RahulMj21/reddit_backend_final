import { Request, Response } from "express";
import { Redis } from "ioredis";
import { Repository } from "typeorm";
import { Post } from "../entity/post";
import { User } from "../entity/user";

export type MyContext = {
  req: Request & { session: Express.Session };
  res: Response;
  redis: Redis;
  UserRepo: Repository<User>;
  PostRepo: Repository<Post>;
};
