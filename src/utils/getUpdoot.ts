import { Updoot } from "../entity/updoot";
import { dataSource } from "./connectDb";

type FindInputType = {
  postId: number;
  userId: number;
};

export const getUpdoot = async (input: FindInputType) => {
  const updoot = await dataSource.getRepository(Updoot).findOneBy(input);
  if (!updoot) return null;
  return updoot;
};

export const getUpdootsByIds = async (inputs: FindInputType[]) => {
  return inputs.map((input) => getUpdoot(input));
};
