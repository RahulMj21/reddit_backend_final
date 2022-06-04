import { User } from "../entity/user";
import { dataSource } from "./connectDb";

export const getUser = async (id: number) => {
  const user = await dataSource.getRepository(User).findOneBy({ id });
  if (!user) return null;
  return { ...user };
};

export const getUsersByIds = async (ids: number[]) => {
  return ids.map((id) => getUser(id));
};
