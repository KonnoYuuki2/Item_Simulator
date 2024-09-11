import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import authMiddlewares from "../middlewares/auth.middlewares.js";

const router = express.Router();

// 이게 호출될 때마다 돈이 추가됨
router.put("/money/:charId", authMiddlewares, async (req, res, next) => {
    const { accountId } = req.account;
    const { charId } = req.params;

    const character = await prisma.characters.findFirst({
        where: {
            accountId: +accountId,
            charId: +charId
        }
    });

    if (!character) {
        return res
            .status(400)
            .json({ errorMessage: "캐릭터가 존재하지 않습니다." });
    }

    await prisma.characters.update({
        where: { charId: character.charId },
        data: {
            charMoney: character.charMoney + 1000 // 100원은 좀 쪼잔하지않나...
        }
    });

    return res
        .status(200)
        .json({ Message: "캐릭터에 돈이 뒷돈이 입급되었습니다. 쉿." });
});

export default router;
