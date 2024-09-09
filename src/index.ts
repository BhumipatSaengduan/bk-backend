import { Configuration, getConfig } from "@/config";
import * as routers from "@/routers/index";
import express, { Application } from "express";
import { isAuthenticated } from "./routers/auth";

class Server {
  config: Configuration;
  app: Application;

  constructor() {
    this.config = getConfig();
    this.app = express();

    this.register();
  }

  register() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use("/auth", new routers.Authentication().router);
    this.app.get("/me", isAuthenticated, async (req, res) => {
      return res.json({ user: req.user });
    });
  }

  start() {
    this.app.listen(this.config.port, () => {
      console.log(`The server is listening to port ${this.config.port} ...`);
    });
  }
}

const server = new Server();
server.start();
