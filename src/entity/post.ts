import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  BaseEntity,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Field, Int, ObjectType } from "type-graphql";
import { User } from "./user";
import { Updoot } from "./updoot";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String!)
  @Column()
  title!: string;

  @Field(() => String!)
  @Column()
  description!: string;

  @Field(() => Int)
  @Column()
  creatorId!: number;

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.posts)
  creator!: User;

  @Field(() => [Updoot])
  @OneToMany(() => Updoot, (updoot) => updoot.post)
  updoots!: Updoot[];

  @Field(() => Date)
  @CreateDateColumn({ name: "createdAt" })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: "updatedAt" })
  updatedAt!: Date;
}
