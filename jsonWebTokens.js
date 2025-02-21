import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import tokenBlacklist from "./app.js";
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || "superSecretKey";

export const generateToken = (user) => {
  return jwt.sign({ email: user.email, id: user._id }, jwtSecret, {
    expiresIn: "3h",
  });
};

export const authenticateJWT = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token || tokenBlacklist.has(token)) {
    res.clearCookie(token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
    return res.redirect("/login");
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      res.clearCookie(token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
      });
      return res.redirect("/login");
    }

    req.user = user;
    next();
  });
};
export const logout = (req, res) => {
  res.clearCookie("auth_token");
  res.redirect("/login");
};
