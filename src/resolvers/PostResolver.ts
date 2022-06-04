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
import { getUpdoot } from "../utils/getUpdoot";
import CustomError from "../utils/CustomError";
import { FieldError } from "./UserResolver";
import { User } from "../entity/user";

@InputType()
export class PostInput {
  @Field()
  title!: string;

  @Field(() => String)
  description!: string;
}
@InputType()
export class UpdatePostInput {
  @Field(() => Int!)
  id!: number;

  @Field(() => String!)
  title!: string;

  @Field(() => String!)
  description!: string;
}

@ObjectType()
export class PostResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Post, { nullable: true })
  post?: Post;
}

@ObjectType()
export class PaginatedPosts {
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

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(@Root() post: Post, @Ctx() { req }: MyContext) {
    const { userId } = req.session;
    if (!userId) return null;
    // const updoot = await UpdootLoader.load({ userId, postId: post.id });
    const updoot = await getUpdoot({ userId, postId: post.id });
    if (!updoot) return null;
    return updoot.value;
  }

  // @FieldResolver(() => User, { nullable: true })
  // async creator(@Root() { creatorId }: Post, @Ctx() { UserLoader }: MyContext) {
  //   return await UserLoader.load(creatorId);
  // }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int!) postId: number,
    @Arg("value", () => Int!) value: number,
    @Ctx() { req, UpdootRepo, PostRepo }: MyContext
  ) {
    try {
      const { userId } = req.session;
      let realValue = value <= -1 ? -1 : 1;

      const post = await PostRepo.findOneBy({ id: postId });
      if (!post) return false;

      // let updoot = await UpdootRepo.findOne({ where: { userId, postId } });
      let updoot = await getUpdoot({ userId, postId });

      // user has voted before on the post
      if (updoot && updoot.value !== realValue) {
        updoot.value = realValue;
      } //user not voted yet
      else if (!updoot) {
        updoot = UpdootRepo.create({
          userId,
          postId,
          value: realValue,
        });
      }
      await updoot.save();

      post.points = post.points + realValue;
      await post.save();

      return true;
    } catch (error: any) {
      return false;
    }
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => Date, { nullable: true }) cursor: Date,
    @Ctx()
    { PostRepo }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const post = PostRepo.createQueryBuilder("post")
      .leftJoinAndSelect(`post.creator`, "creator")
      .orderBy(`post."createdAt"`, "DESC")
      .limit(realLimitPlusOne);

    if (cursor) {
      post.where(`post."createdAt" < :cursor`, { cursor });
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
    const post = await PostRepo.findOne({
      relations: ["creator"],
      where: { id },
    });
    if (!post) return { errors: [new CustomError("id", "post not found")] };
    return { post };
  }

  @Mutation(() => PostResponse, { nullable: true })
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input")
    input: PostInput,
    @Ctx()
    { PostRepo, req }: MyContext
  ): Promise<PostResponse | null> {
    const data = {
      ...input,
      creatorId: req.session.userId,
    };
    const post = PostRepo.create(data);
    await post.save();
    const newPost = await PostRepo.createQueryBuilder("post")
      .leftJoinAndSelect("post.creator", "creator")
      .where({ id: post.id })
      .getOne();

    return { post: newPost as Post };
  }

  @Mutation(() => PostResponse)
  async updatePost(
    @Arg("input", () => UpdatePostInput)
    { id, title, description }: UpdatePostInput,
    @Ctx()
    { PostRepo, req }: MyContext
  ): Promise<PostResponse> {
    try {
      // 1'st way-------------->
      if (!req.session.userId)
        return { errors: [new CustomError("user", "unauthorized user")] };
      const post = await PostRepo.findOneBy({
        id,
        creatorId: req.session.userId,
      });

      if (!post) {
        return { errors: [new CustomError("id", "post not found")] };
      }

      post.title = title;
      post.description = description;

      await post.save();

      // 2'nd way--------->
      // const result = await PostRepo.createQueryBuilder("post")
      //   .update()
      //   .set({ title, description })
      //   .where(`post.id=:id and post."creatorId"=:creatorId`, {
      //     id,
      //     creatorId: req.session.userId,
      //   })
      //   .returning("*")
      //   .execute();

      // if (result.raw.length < 1) {
      //   return { errors: [new CustomError("ustom", "cannot update")] };
      // }
      // return { post: result.raw[0] };

      return { post };
    } catch (error: any) {
      return { errors: [new CustomError("id", error.message)] };
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int)
    id: number,
    @Ctx()
    { PostRepo, req }: MyContext
  ): Promise<Boolean> {
    const userId = req.session.userId;
    if (!userId) return false;

    const post = await PostRepo.findOneBy({ id, creatorId: userId });
    if (!post) return false;

    await post.remove();
    return true;
  }
}
