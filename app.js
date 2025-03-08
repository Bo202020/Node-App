import express from "express";
import path from "path";
import mongoose from "mongoose";
import User from "./schema.cjs";
import { generateToken, authenticateJWT, logout } from "./jsonWebTokens.js";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import multer from "multer";
const tokenBlacklist = new Set();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();
const app = express();
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
const smoochSans = process.env.SMOOCH_SANS;
const name = "Genie";
let regObjForResRenLog = {
  sans: smoochSans,
  page: "GSH",
  title: "Login",
};
const PORT = process.env.PORT;
const uri = "mongodb://127.0.0.1:27017/Users";
const upload = multer();
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use(
  helmet({
    noCache: true,
  })
);
app.use(cookieParser());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.set("view engine", "hbs");
app.set("views", "templates");
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("connected to mongodb"))
  .catch(() => console.error("error connecting to mongodb"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  if (!req.cookies.auth_token) {
    return res.redirect("/login");
  }
  res.render("index", { page: "GSH", title: "home", sans: smoochSans });
});

app.get("/about", (req, res) => {
  if (!req.cookies.auth_token) {
    return res.redirect("/login");
  }
  res.render("index", { page: "GSH", title: "about", sans: smoochSans });
});

app.get("/help", (req, res) => {
  if (!req.cookies.auth_token) {
    return res.redirect("/login");
  }
  res.render("index", { page: "GSH", title: "help", sans: smoochSans });
});

app.get("/signUp", (req, res) => {
  const oldToken = req.cookies.auth_token;
  tokenBlacklist.add(oldToken);
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.render("register", { page: "GSH", title: "Register", sans: smoochSans });
});
app.get("/login", (req, res) => {
  const oldToken = req.cookies.auth_token;
  tokenBlacklist.add(oldToken);
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.render("login", regObjForResRenLog);
});
app.get("/Quest", (req, res) => {
  res.render("quest", {
    page: `Say hello to the ${name}`,
    title: "GSH",
    sans: smoochSans,
    response: "Well then what are you waiting for!",
  });
});
app.get("/home", authenticateJWT, (req, res) => {
  if (!req.cookies.auth_token) {
    return res.redirect("/login");
  }
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.render("home", {
    sans: smoochSans,
    page: "GSH",
    title: req.user.email,
  });
});
app.get("/logout", (req, res) => {
  const token = req.cookies.auth_token;
  tokenBlacklist.add(token);
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.setHeader("Cache-Control", "no-store");
  res.redirect("/login");
});
app.get("/menu", (req, res) => {
  if (!req.cookies.auth_token) {
    return res.redirect("/login");
  }
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.render("menu", {
    sans: smoochSans,
    page: "GSH",
    title: "Play TIC TAC TOE",
  });
});
app.get("/tictactoe", (req, res) => {
  if (!req.cookies.auth_token) {
    return res.redirect("/login");
  }
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.render("menu", {
    sans: smoochSans,
    page: "GSH",
    title: "TIC TAC TOE",
  });
});
app.post("/question", (req, res) => {
  const input = req.body.question;
  fetch(`http://127.0.0.1:3001/question?query=${input}`)
    .then((response) => response.json())
    .then((data) => {
      res.render("quest", {
        page: `Say hello to the ${name}`,
        title: "GSH",
        sans: smoochSans,
        response: data.response,
      });
    })
    .catch((error) => {
      console.error(error);
      res.send("try again later");
    });
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  try {
    const isExisting = await User.findOne({ email });
    if (isExisting) {
      return res.redirect("/login");
    }
    const user = new User({ email, password });
    await user.save();

    const token = generateToken(user);

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3 * 60 * 60 * 1000,
    });

    res.redirect("/home");
  } catch (error) {
    console.error(error);
    res.render("404", {
      err: "400",
      msg: "Login unsuccesful, try again later",
      sans: smoochSans,
    });
  }
});

app.post("/login", upload.none(), async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  try {
    const oldToken = req.cookies.auth_token;
    tokenBlacklist.add(oldToken);
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("login", {
        sans: smoochSans,
        page: "GSH",
        title: "Login",
        errMsgE: "<p class='errMsg'>Email Not Found</p>",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        sans: smoochSans,
        page: "GSH",
        title: "Login",
        errMsgP: "<p class='errMsg'>Password Incorrect</p>",
        errMsgE: "",
      });
    }
    const token = generateToken(user);
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3 * 60 * 60 * 1000,
    });
    res.redirect("/home");
  } catch (e) {
    return res.json({
      success: false,
      err: "500",
      msg: "Something went wrong. Please try again later.",
    });
  }
});
app.get("*", (req, res) => {
  res.render("404", { err: "Could not find page", sans: smoochSans });
});

app.listen(PORT, () => console.log("server up"));
export default tokenBlacklist;
