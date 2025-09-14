import { Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { IUser } from "../models/User";

export function sendToken(res: Response, user: IUser) {
  const payload = { sub: user._id, role: user.role, name: user.name };

const options: SignOptions = {
  // use numeric seconds (here: 7 days)
  expiresIn: Number(env.JWT_EXPIRES_IN) || 7 * 24 * 60 * 60,
};


  // cast secret to string so TS stops complaining
  const token = jwt.sign(payload, env.JWT_SECRET as string, options);

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true in production with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
