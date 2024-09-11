import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import authMiddlewares from "../middlewares/auth.middlewares.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

//캐릭터 생성
router.post("/character", authMiddlewares, async (req, res, next) => {
    const { accountId } = req.account;
    const { charName } = req.body;

    const account = await prisma.accounts.findFirst({
        where: { accountId: accountId }
    });

    if (!account) {
        return res
            .status(400)
            .json({ errorMessage: "계정이 존재하지 않습니다." });
    }

    const isName = await prisma.characters.findFirst({
        where: {
            charName: charName
        }
    });

    if (isName) {
        return res
            .status(400)
            .json({ errorMessage: "이미 존재하는 이름입니다." });
    }

    const character = await prisma.characters.create({
        data: {
            accountId: accountId,
            charName: charName
        }
    });

    return res.status(201).json({ data: character.charName });
});

//캐릭터 삭제
router.delete("/character/:charId", authMiddlewares, async (req, res, next) => {
    const { charId } = req.params;
    const { accountId } = req.account;

    const character = await prisma.characters.findFirst({
        where: {
            charId: +charId,
            accountId: accountId
        }
    });

    if (!character) {
        return res
            .status(400)
            .json({ errorMessage: "삭제하려는 캐릭터가 존재하지 않습니다." });
    }

    const deleteChar = await prisma.characters.delete({
        where: { charId: +character.charId }
    });

    return res
        .status(200)
        .json({ message: `${character.charName}이 삭제되었습니다.` });
});

//캐릭터 상세 조회
router.get("/character/:charId", async (req, res, next) => {
    const authorizationHeader = req.headers["authorization"]; //accountId가 아니라 id
    const { charId } = req.params;

    if (!authorizationHeader) {
        const character = await prisma.characters.findFirst({
            where: { charId: +charId },
            select: {
                charLv: true,
                charName: true,
                charHealth: true,
                charPower: true
            }
        });
        return res.status(200).json({ data: character });
    }

    const [tokenId, token] = authorizationHeader.split(" ");
    const { id } = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);

    const account = await prisma.accounts.findFirst({
        where: { id: id }
    });

    if (!account) {
        const character = await prisma.characters.findFirst({
            where: { charId: +charId },
            select: {
                charLv: true,
                charName: true,
                charHealth: true,
                charPower: true
            }
        });
        return res.status(200).json({ data: character });
    }

    const character = await prisma.characters.findFirst({
        where: { charId: +charId },
        select: {
            charLv: true,
            charName: true,
            charHealth: true,
            charPower: true,
            charMoney: true
        }
    });
    return res.status(200).json({ data: character });
});

// 캐릭터 레벨업!
router.put("/charLv/:charId", authMiddlewares, async (req, res, next) => {
    const { charId } = req.params;
    const { accountId } = req.account;

    const character = await prisma.characters.findFirst({
        where: {
            accountId: +accountId,
            charId: +charId
        }
    });

    if (!character) {
        return res
            .status(400)
            .json({ errorMessage: "해당하는 캐릭터가 존재하지 않습니다." });
    }

    await prisma.characters.update({
        where: {
            charId: character.charId
        },
        data: {
            charLv: character.charLv + 30,
            charHealth: character.charHealth + 60,
            charPower: character.charPower + 30
        }
    });

    return res
        .status(200)
        .json({ message: "캐릭터가 보스몬스터를 쓰러트려 폭렙했습니다." });
});

export default router;
