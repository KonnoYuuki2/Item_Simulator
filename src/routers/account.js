import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

//회원가입
router.post("/accounts", async (req, res, next) => {
    const { id, password } = req.body;
    let regex = /^[a-z0-9]*$/;

    if (!regex.test(id)) {
        return res
            .status(400)
            .json({ message: "소문자와 숫자로 구성되지 않았습니다." });
    }

    const isExistedId = await prisma.accounts.findFirst({
        where: { id: id },
    });

    const hashedPassword = await bcrypt.hash(password, 5);
    if (isExistedId) {
        return res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    }

    const newAccount = await prisma.accounts.create({
        data: {
            id: id,
            password: hashedPassword,
            passCheck: hashedPassword,
        },
        select: {
            id: true,
        },
    });

    return res.status(200).json({ data: newAccount });
});

//로그인
router.post("/login", async (req, res, next) => {
    const { id, password } = req.body;
    const user = await prisma.accounts.findFirst({
        where: { id: id },
    });

    if (!user) {
        return res
            .status(400)
            .json({ errorMessage: "해당하는 id가 존재하지 않습니다." });
    }

    if (!(await bcrypt.compare(password, user.passCheck))) {
        return res
            .status(401)
            .json({ message: "비밀번호가 일치하지 않습니다." });
    }

    const accessToken = jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET_KEY, {
        expiresIn: "1d",

    });
    
    res.header("Authorization", `Bearer ${accessToken}`);
    
    req.session.accountId = res.getHeader("Authorization");

    return res.status(200).json({ Message: "로그인에 성공했습니다." });
});

export default router;
