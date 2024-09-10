import { Configuration, getConfig } from "@/config";
import * as routers from "@/routers/index";
import cors from "cors";
import express, { Application } from "express";
import path from "path";

class Server {
  config: Configuration;
  app: Application;

  constructor() {
    this.config = getConfig();
    this.app = express();

    this.register();
  }

  register() {
    this.app.use(cors({ origin: this.config.allowedOrigins }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use("/auth", new routers.Authentication().router);
    this.app.use("/books", new routers.Book().router);
    this.app.use("/cart", new routers.Cart().router);
    this.app.use("/categories", new routers.Category().router);

    this.app.use("/images", express.static(path.join(__dirname, "..", this.config.uploadDir)));
  }

  start() {
    this.app.listen(this.config.port, () => {
      console.log(`The server is listening to port ${this.config.port} ...`);
    });
  }
}

const server = new Server();
server.start();
