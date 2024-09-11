import express from "express";
import accounts from "./src/routers/account.js";
import character from "./src/routers/characters.js";
import items from "./src/routers/items.js";
import store from "./src/routers/store.js";
import invens from "./src/routers/invens.js";
import equips from "./src/routers/equips.js";
import money from "./src/routers/moneyBuy.js";
import errorHandlingMiddleware from "./src/middlewares/error-handling.middleware.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3407;

app.use(express.json());

app.use("/api", [accounts, character, items, store, invens, equips, money]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
    console.log(PORT, `로 서버가 열렸습니다.`);
});
