import config from "config";
import { DataSource } from "typeorm";
import { Post } from "../entity/post";
import { User } from "../entity/user";

export const dataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: config.get<string>("dbUser"),
  password: config.get<string>("dbPassword"),
  database: config.get<string>("dbName"),
  logging: true,
  synchronize: true,
  entities: [User, Post],
});

const connectDb = async () => {
  return dataSource
    .initialize()
    .then(() => console.log("db connected.."))
    .catch((err: any) => console.log("db connection error --> ", err));
};
export default connectDb;
