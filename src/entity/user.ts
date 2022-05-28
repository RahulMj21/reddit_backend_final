import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
} from "typeorm";
import { Field, Int, ObjectType } from "type-graphql";
import { Post } from "./post";
import { Updoot } from "./updoot";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column("text")
  name!: string;

  @Field(() => String)
  @Column({ type: "text", unique: true })
  email!: string;

  @Column("text")
  password!: string;

  @OneToMany(() => Post, (post) => post.creator)
  posts!: Post[];

  @Field(() => [Updoot])
  @OneToMany(() => Updoot, (updoot) => updoot.user)
  updoots!: Updoot[];

  @Field(() => String)
  @CreateDateColumn({ name: "createdAt" })
  createdAt!: Date;

  @Field(() => String)
  @UpdateDateColumn({ name: "updatedAt" })
  updatedAt!: Date;
}
