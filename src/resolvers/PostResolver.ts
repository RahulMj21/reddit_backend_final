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
  FieldResolver,
  Root,
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

@ObjectType()
export class PaginatedPost {
  @Field(() => [Post], { nullable: true })
  posts!: Post[];

  @Field(() => Boolean)
  hasMore!: boolean;
}

@Resolver(Post)
export default class {
  @FieldResolver(() => String)
  descriptionSnippet(@Root() root: Post) {
    return root.description.slice(0, 50);
  }

  @Query(() => PaginatedPost)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Date, { nullable: true }) cursor: Date,
    @Ctx()
    { PostRepo }: MyContext
  ): Promise<PaginatedPost> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const post = PostRepo.createQueryBuilder("post")
      .orderBy('"createdAt"', "DESC")
      .take(realLimitPlusOne);

    if (cursor) {
      post.where(`"createdAt" < :cursor`, { cursor });
    }
    const posts = await post.getMany();
    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
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
