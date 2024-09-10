import express from "express";
import accounts from "./src/routers/account.js";
import character from "./src/routers/characters.js";
import items from "./src/routers/items.js";
import store from './src/routers/store.js';
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import expressMysQLSession from "express-mysql-session";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3407;

const MySQLStore = expressMysQLSession(expressSession);
const sessionStore = new MySQLStore({
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    expiration: 1000 * 60 * 60 * 24, //1일
    createDatabaseTable: true, // 자동적으로 생성할건지
});

app.use(express.json());
app.use(cookieParser());
app.use(
    expressSession({
        secret: process.env.SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        expiration: {
            maxAge: 100 * 60 * 60 * 24, //1일 동안 쿠키를 사용할 수 있도록 설정
        },
        store: sessionStore, //외부 세션스토어를 사용할려고 한다.
    }),
);

app.use("/api", [accounts, character,items,store]);

app.listen(PORT, () => {
    console.log(PORT, `로 서버가 열렸습니다.`);
});
