import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import authMiddlewares from "./middlewares/auth.middlewares.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

//캐릭터 생성
router.post("/character", authMiddlewares, async (req, res, next) => {
    const { accountId } = req.account;
    const { charName } = req.body;

    const account = await prisma.accounts.findFirst({
        where: { accountId: accountId },
    });

    if(!account) {
        return res.status(400).json({errorMessage: '계정이 존재하지 않습니다.'});
    }

    const isName = await prisma.characters.findFirst({
        where: {
            charName: charName,
        },
    });

    if (isName) {
        return res
            .status(400)
            .json({ errorMessage: "이미 존재하는 이름입니다." });
    }

    const character = await prisma.characters.create({
        data: {
            accountId: accountId,
            charName: charName,
        },
    });

    const inven = await prisma.invens.create({
        data: {
            charId: character.charId,
        }
    })

    const equip = await prisma.equips.create({
        data: {
            charId: character.charId,
        }
    })

    return res.status(200).json({ data: charName });
});

//캐릭터 삭제
router.delete("/character/:charId", authMiddlewares, async (req, res, next) => {
    const { charId } = req.params;
    const { accountId } = req.account;

    const character = await prisma.characters.findFirst({
        where: {
            charId: +charId,
            accountId: accountId,
        },
    });

    if (!character) {
        return res
            .status(400)
            .json({ errorMessage: "삭제하려는 캐릭터가 존재하지 않습니다." });
    }

    const deleteChar = await prisma.characters.delete({
        where: { charId: +character.charId },
    });

    return res.status(200).json({ message: "캐릭터가 삭제되었습니다." });
});

//캐릭터 상세 조회
router.get("/character/:charId", async (req, res, next) => {
    const { accountId } = req.session; //accountId가 아니라 id
    const { charId } = req.params;

    // 세션에 accountId가 있는지 없는지부터 확인을 한다.
    // 있다면 해당 Id로 account값을 가져온다.
    // 가져온 account 계정에 있는 Id들 중에서 해당하는 계정이 있는지 없는지 확인한다.(for in)

    if (!accountId) {
        const character = await prisma.characters.findFirst({
            where: { charId: +charId },
            select: {
                charName: true,
                charHealth: true,
                charPower: true,
            },
        });
        return res.status(200).json({ data: character });
    }

    const { id } = jwt.verify(accountId, process.env.ACCESS_TOKEN_SECRET_KEY);

    const account = await prisma.accounts.findFirst({
        where: { id: id },
    });

    if (!account) {
        const character = await prisma.characters.findFirst({
            where: { charId: +charId },
            select: {
                charName: true,
                charHealth: true,
                charPower: true,
            },
        });
        return res.status(200).json({ data: character });
    }

    const character = await prisma.characters.findFirst({
        where: { charId: +charId },
        select: {
            charName: true,
            charHealth: true,
            charPower: true,
            charMoney: true,
        },
    });
    return res.status(200).json({ data: character });
});




export default router;
