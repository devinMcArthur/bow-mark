import jwt from "jsonwebtoken";

const createJWT = (
  payload: string | object | Buffer,
  options?: jwt.SignOptions
) => {
  if (!process.env.JWT_SECRET) throw new Error("Must provide a JWT secret");

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

export default createJWT;
