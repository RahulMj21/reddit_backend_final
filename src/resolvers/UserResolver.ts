import {
  ObjectType,
  Field,
  InputType,
  Ctx,
  Arg,
  Resolver,
  Mutation,
  Query,
  UseMiddleware,
  FieldResolver,
  Root,
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entity/user";
import argon from "argon2";
import CustomError from "../utils/CustomError";
import sendMail from "../utils/sendMail";
import { v4 } from "uuid";
import config from "config";
import isAuth from "../middlewares/isAuth";

@InputType()
export class RegisterInput {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  password!: string;
}
@InputType()
export class LoginInput {
  @Field()
  email!: string;

  @Field()
  password!: string;
}
@InputType()
export class ResetPasswordInput {
  @Field(() => String!)
  token!: string;

  @Field(() => String!)
  newPassword!: string;
}
@ObjectType()
export class FieldError {
  @Field()
  field!: string;

  @Field()
  message!: string;
}
@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}
@ObjectType()
export class ForgotPasswordResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Boolean, { nullable: true })
  success?: Boolean;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) return user.email;
    return "";
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("input")
    input: RegisterInput,
    @Ctx()
    { UserRepo, req }: MyContext
  ): Promise<UserResponse> {
    try {
      if (input.name.length < 3) {
        return {
          errors: [
            new CustomError(
              "name",
              "name must be longer than three characters"
            ),
          ],
        };
      }
      if (input.password.length < 6) {
        return {
          errors: [
            new CustomError(
              "password",
              "password must be longer than six characters"
            ),
          ],
        };
      }
      const hash = await argon.hash(input.password);
      const user = UserRepo.create({
        name: input.name,
        email: input.email,
        password: hash,
      });
      await user.save();

      req.session.userId = user.id;
      return {
        user,
      };
    } catch (error: any) {
      if (error.code === "23505") {
        return {
          errors: [new CustomError("email", "email already exists")],
        };
      }
      return {
        errors: [new CustomError("system_error", "something went wrong")],
      };
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("input", () => LoginInput)
    input: LoginInput,
    @Ctx()
    { UserRepo, req }: MyContext
  ): Promise<UserResponse> {
    try {
      const user = await UserRepo.findOneBy({ email: input.email });
      if (!user)
        return {
          errors: [new CustomError("email", "wrong email")],
        };
      const isMatched = await argon.verify(user.password, input.password);
      if (!isMatched)
        return {
          errors: [new CustomError("password", "wrong password")],
        };
      req.session.userId = user.id;
      return { user };
    } catch (error: any) {
      return {
        errors: [new CustomError("system_error", "something went wrong")],
      };
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async logout(
    @Ctx()
    { req, res }: MyContext
  ) {
    return new Promise((resolve) => {
      req.session.destroy((err) => {
        if (err) {
          console.log("logout error --> ", err), resolve(false);
          return;
        } else {
          res.clearCookie("qid");
          resolve(true);
        }
      });
    });
  }

  @Query(() => User, { nullable: true })
  async me(
    @Ctx()
    { UserRepo, req }: MyContext
  ) {
    if (!req.session.userId) return null;
    const user = await UserRepo.findOneBy({ id: req.session.userId });
    return user;
  }

  @Mutation(() => ForgotPasswordResponse)
  async forgotPassword(
    @Arg("email", () => String!)
    email: string,
    @Ctx()
    { UserRepo, redis }: MyContext
  ): Promise<ForgotPasswordResponse> {
    try {
      const user = await UserRepo.findOneBy({ email });
      if (!user) {
        return {
          errors: [new CustomError("email", "email not registered")],
        };
      }

      const token = v4();
      const html = `<a>http://localhost:3000/forgotpassword/${token}</a>`;

      const isMailSent = await sendMail(email, html);
      if (!isMailSent) {
        return {
          errors: [new CustomError("email", "email cannot be sent")],
        };
      } else {
        await redis.set(
          config.get<string>("forgotPasswordPrefix") + token,
          user.id,
          "EX",
          1000 * 60 * 60 // 1 hour
        );
        return {
          success: true,
        };
      }
    } catch (error: any) {
      return { errors: [new CustomError("email", "went wront")] };
    }
  }

  @Mutation(() => UserResponse)
  async resetPassword(
    @Arg("input")
    { token, newPassword }: ResetPasswordInput,
    @Ctx()
    { UserRepo, redis }: MyContext
  ) {
    if (newPassword.length < 6) {
      return {
        errors: [
          new CustomError("password", "password must me 6 characters long"),
        ],
      };
    }
    const key = config.get<string>("forgotPasswordPrefix") + token;
    const userId = await redis.get(key);
    if (!userId) {
      return { errors: [new CustomError("token", "token expired")] };
    }
    const id = parseInt(userId);
    const user = await UserRepo.findOneBy({ id });
    if (!user) {
      return { errors: [new CustomError("token", "token expired")] };
    }
    const hash = await argon.hash(newPassword);
    user.password = hash;

    user.save();

    await redis.del(key);

    return { user };
  }
}
