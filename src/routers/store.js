import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import authMiddlewares from "./middlewares/auth.middlewares.js";

const router = express.Router();
//console.log
// 아이템 구매
router.post("/store/:charId", authMiddlewares, async (req, res, next) => {
    const { accountId } = req.account;
    const { charId } = req.params;
    const { itemCode, count } = req.body;

    const character = await prisma.characters.findFirst({
        where: {
            accountId: +accountId,
            charId: +charId,
        },
    });

    if (!character) {
        return res
            .status(400)
            .json({ errorMessage: "캐릭터가 존재하지 않습니다." });
    }

    const item = await prisma.items.findFirst({
        where: { itemCode: +itemCode },
        select: {
            itemCode: true,
            itemHealth: true,
            itemName: true,
            itemPower: true,
            Price: true,
            image: true,
        },
    });

    if (!item) {
        return res
            .status(400)
            .json({ errorMessage: "해당하는 아이템이 존재하지 않습니다." });
    }

    const Finven = await prisma.invens.findFirst({
        where:{charId: +charId}
    })

    console.log(Finven);
    //해당하는 아이템이 존재한다면
    //아이템의 가격*count에 해당하는 값을  character의 돈에서 빼고
    //해당하는 캐릭터의 인벤에 추가한다.

    const char = await prisma.characters.update({
        where: { charId: +charId },
        data: {
            charMoney: character.charMoney - item.Price * count,
        },
    });

    const inven = await prisma.invens.update({
        where: { charId: +charId },
        data: {
            items: {
                upsert: { //있으면 업데이트 없으면 만듬
                    where: { itemCode: item.itemCode }, // 유니크 필드 기준으로 처리
                    create: {
                        itemName: item.itemName,
                        itemCode: item.itemCode,
                        image: item.image,
                        itemPower: item.itemPower,
                        itemHealth: item.itemHealth,
                        Price: item.Price,
                    },
                    update: {
                        itemName: item.itemName,
                    },
                },
            },
        },
    });
    return res.status(200).json({ data: char, inven });
});

//캐릭터가 보유한 인벤토리 조회

export default router;
