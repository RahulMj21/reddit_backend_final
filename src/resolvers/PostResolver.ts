import {
  Resolver,
  Query,
  Ctx,
  Int,
  Arg,
  Mutation,
  InputType,
  Field,
  ObjectType,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entity/post";
import isAuth from "../middlewares/isAuth";
import { MyContext } from "../types";
import CustomError from "../utils/CustomError";
import { FieldError } from "./UserResolver";

@InputType()
export class PostInput {
  @Field()
  title!: string;

  @Field(() => String)
  description!: string;
}
@InputType()
export class UpdatePostInput {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  title?: string;

  @Field(() => String)
  description?: string;
}

@ObjectType()
export class PostResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Post, { nullable: true })
  post?: Post;
}

@Resolver()
export default class {
  @Query(() => [Post], { nullable: true })
  async posts(
    @Ctx()
    { PostRepo }: MyContext
  ): Promise<Post[]> {
    return await PostRepo.find();
  }

  @Query(() => PostResponse)
  async post(
    @Arg("id", () => Int)
    id: number,
    @Ctx() { PostRepo }: MyContext
  ): Promise<PostResponse> {
    const post = await PostRepo.findOneBy({ id });
    if (!post) return { errors: [new CustomError("id", "post not found")] };
    return { post };
  }

  @Mutation(() => PostResponse)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input")
    input: PostInput,
    @Ctx()
    { PostRepo, req }: MyContext
  ): Promise<PostResponse> {
    const data = {
      ...input,
      creatorId: req.session.userId,
    };
    const post = PostRepo.create(data);
    await post.save();
    return { post };
  }

  @Mutation(() => PostResponse)
  async updatePost(
    @Arg("input", () => UpdatePostInput)
    { id, title, description }: UpdatePostInput,
    @Ctx()
    { PostRepo }: MyContext
  ): Promise<PostResponse> {
    try {
    } catch (error: any) {}
    const post = await PostRepo.findOneBy({ id });

    if (!post) {
      return { errors: [new CustomError("id", "post not found")] };
    }

    if (title) post.title = title;
    if (description) post.description = description;

    await post.save();
    return { post };
  }

  @Mutation(() => Boolean)
  async deletePost(
    @Arg("id", () => Int)
    id: number,
    @Ctx()
    { PostRepo }: MyContext
  ): Promise<Boolean> {
    const post = await PostRepo.findOneBy({ id });
    if (!post) return false;

    await post.remove();
    return true;
  }
}
