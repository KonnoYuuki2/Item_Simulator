import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import authMiddlewares from "../middlewares/auth.middlewares.js";

const router = express.Router();
//console.log
// 아이템 구매
router.post("/store/:charId", authMiddlewares, async (req, res, next) => {
    try {
        const { accountId } = req.account;
        const { charId } = req.params;
        const { itemCode, count } = req.body;

        if(count <= 0) {
           return res.status(400).json({errorMessage: '지금 장난해?'});
        }

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

        const item = await prisma.items.findFirst({
            where: { itemCode: +itemCode }
        });

        if (!item) {
            return res
                .status(400)
                .json({ errorMessage: "해당하는 아이템이 존재하지 않습니다." });
        }

        if (character.charMoney < item.Price * count) {
            return res
                .status(400)
                .json({ errorMessage: "가진 돈이 부족합니다." });
        }

        const inven = await prisma.invens.findFirst({
            where: {
                charId: +charId,
                itemCode: item.itemCode
            }
        });

        // 해당하는 캐릭터와 아이템 아이디가 둘다 존재하는 inven이 있을 경우에
        // 아이템 수량을 누적시킨다.
        if (inven) {
            await prisma.$transaction(async (tx) => {
                await tx.characters.update({
                    where: { charId: +charId },
                    data: {
                        charMoney: character.charMoney - item.Price * count
                    }
                });

                await tx.invens.update({
                    data: {
                        ...inven,
                        quantity: inven.quantity + count
                    },
                    where: {
                        charId: character.charId,
                        invenId: inven.invenId
                    }
                });
            });

            return res.status(200).json({ message: "아이템 구매 완료!" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.characters.update({
                where: { charId: +charId },
                data: {
                    charMoney: character.charMoney - item.Price * count
                }
            });

            await tx.invens.create({
                data: {
                    charId: +charId,
                    itemCode: item.itemCode,
                    quantity: count
                }
            });
        });

        return res.status(200).json({ message: "새로운 아이템 구매 완료!" });
    } catch (error) {
        next(error);
    }
});

// 아이템 판매
router.delete(
    "/store/sell/:charId",
    authMiddlewares,
    async (req, res, next) => {
        try {
            const { charId } = req.params;
            const { itemCode, count } = req.body; // 아이템 코드와 수량은 바디로 받는다.
            const { accountId } = req.account;

            if(count <= 0) {
                return res.status(400).json({errorMessage: '지금 장난해?'});
             }
             
            const character = await prisma.characters.findFirst({
                where: {
                    charId: +charId,
                    accountId: +accountId
                }
            });

            if (!character) {
                return res
                    .status(400)
                    .json({ errorMessage: "해당 캐릭터가 존재하지 않습니다." });
            }

            //여기서는 수량을 가져와서
            const inven = await prisma.invens.findFirst({
                where: {
                    charId: character.charId,
                    itemCode: +itemCode
                }
            });

            if (!inven) {
                return res
                    .status(400)
                    .json({
                        errorMessage: "캐릭터의 인벤토리가 비어있습니다."
                    });
            }

            if (inven.quantity < +count) {
                return res.status(400).json({
                    errorMessage: `등록하고자 하는 아이템의 수량이 부족합니다. 현재 수량: ${inven.quantity}`
                });
            }

            // 인벤토리 내에 있는 아이템의 정보를 가져와서
            // 아이템에서는 가격을
            const item = await prisma.items.findFirst({
                where: { itemCode: inven.itemCode },
                select: {
                    Price: true
                }
            });

            // 아이템이 딱 맞아 떨어져서 인벤토리에 있는 아이템이 0이 되버리면??
            // 인벤토리를 지워야겟지?....
            if (inven.quantity === +count) {
                await prisma.$transaction(async (tx) => {
                    await tx.invens.delete({
                        where: { invenId: inven.invenId }
                    });
                    await tx.characters.update({
                        where: { charId: character.charId },
                        data: {
                            charMoney:
                                character.charMoney +
                                Math.floor(item.Price * count * 0.6)
                        }
                    });
                });

                return res
                    .status(200)
                    .json({ message: "해당 아이템이 전부 판매가 되었습니다." });
            }

            //해당 트랜잭션에서 아이템의 수량을 줄이고, 캐릭터의 돈을 추가한다.
            await prisma.$transaction(async (tx) => {
                await tx.invens.update({
                    where: { invenId: inven.invenId },
                    data: {
                        quantity: inven.quantity - count
                    }
                });

                await tx.characters.update({
                    where: { charId: character.charId },
                    data: {
                        charMoney:
                            character.charMoney +
                            Math.floor(item.Price * count * 0.6)
                    }
                });
            });

            return res
                .status(200)
                .json({ message: "해당 아이템이 판매가 되었습니다." });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
