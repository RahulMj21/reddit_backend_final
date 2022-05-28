import { Entity, BaseEntity, ManyToOne, PrimaryColumn, Column } from "typeorm";
import { Field, Int, ObjectType } from "type-graphql";
import { User } from "./user";
import { Post } from "./post";

@ObjectType()
@Entity()
export class Updoot extends BaseEntity {
  @Field(() => Int!)
  @PrimaryColumn()
  userId!: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.updoots)
  user!: User;

  @Field(() => Int!)
  @Column()
  value!: number;

  @Field(() => Int!)
  @PrimaryColumn()
  postId!: number;

  @Field(() => Post)
  @ManyToOne(() => Post, (post) => post.updoots)
  post!: Post;
}
