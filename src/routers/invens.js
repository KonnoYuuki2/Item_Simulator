import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import authMiddlewares from "../middlewares/auth.middlewares.js";

const router = express.Router();

// 아이템 인벤 조회
router.get("/invens/:charId", authMiddlewares, async (req, res, next) => {
    const { accountId } = req.account;
    const { charId } = req.params;

    const character = await prisma.characters.findFirst({
        where: {
            charId: +charId,
            accountId: +accountId
        }
    });

    const inven = await prisma.invens.findMany({
        where: {
            charId: character.charId
        }
    });

    if (!character) {
        return res
            .status(400)
            .json({ errorMessage: "캐릭터가 존재하지 않습니다." });
    }

    if (!inven) {
        return res
            .status(400)
            .json({ errorMessage: "인벤토리가 존재하지 않습니다." });
    }

    let seeInven = [];

    for (let value of inven) {
        const quantity = value.quantity;

        const invenToitem = await prisma.items.findFirst({
            where: { itemCode: value.itemCode },
            select: {
                itemId: true,
                itemCode: true,
                itemLv: true,
                itemName: true,
                image: true
            }
        });

        seeInven.push({ ...invenToitem, quantity });
    }

    return res.status(200).json({ data: seeInven });
});

export default router;
