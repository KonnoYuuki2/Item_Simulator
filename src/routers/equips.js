import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import authMiddlewares from "../middlewares/auth.middlewares.js";

const router = express.Router();
//아이템 장착
//현재 로그인한 계정에 캐릭터를 가져와서
//해당 캐릭터의 인벤토리에 아이템이 있는지 확인하고
//해당 아이템 코드로 equips 테이블을 생성하고 , 캐릭터의 스텟을 증가시킨다.
//invens에서 장착한 아이템의 수량을 줄이거나 아이템의 수량이 없을 경우 삭제한다.
router.post("/equips/:charId", authMiddlewares, async (req, res, next) => {
    try {
        const { accountId } = req.account;
        const { charId } = req.params;
        const { itemCode } = req.body;

        const character = await prisma.characters.findFirst({
            where: {
                charId: +charId,
                accountId: +accountId
            }
        });

        if (!character) {
            return res
                .status(400)
                .json({ errorMessage: "캐릭터가 존재하지 않습니다." });
        }

        const inven = await prisma.invens.findFirst({
            where: {
                charId: +charId,
                itemCode: +itemCode
            }
        });

        if (!inven) {
            return res
                .status(400)
                .json({ errorMessage: "아이템이 인벤토리에 없습니다." });
        }

        //여기서 아이템을 불러온 이유중에 하나는
        //아이템의 정보를 받아와서 캐릭터의 정보를 업데이트 시켜야 하기 때문이다.
        const item = await prisma.items.findFirst({
            where: {
                itemCode: +itemCode
            }
        });

        if (!item) {
            return res
                .status(400)
                .json({ errorMessage: "아이템이 존재하지 않습니다." });
        }

        if (character.charLv < item.itemLv) {
            return res.status(400).json({
                errorMessage: "캐릭터의 레벨이 착용하려는 아이템보다 낮습니다."
            });
        }

        const equip = await prisma.equips.findFirst({
            where: {
                itemType: item.itemType
            }
        });

        // 아이템 타입에 해당하는 장비가 이미 장착 되어 있는가?
        if (equip) {
            return res
                .status(400)
                .json({ errorMessage: "이미 장착되어 있는 장비입니다." });
        }

        //여기서 굳이 0 조건을 넣지 않은 이유는,
        //1. 아이템을 등록하는 경우에 최소한 1의 값을 가진다.
        //2. 아이템을 판매하거나 장착하는 경우에 값이 0이 되면 invens DB에서 삭제시키기 때문
        if (inven.quantity === 1) {
            await prisma.$transaction(async (tx) => {
                await tx.invens.delete({
                    where: { invenId: inven.invenId }
                });

                await tx.equips.create({
                    data: {
                        charId: character.charId,
                        itemCode: item.itemCode,
                        itemType: item.itemType
                    }
                });

                await tx.characters.update({
                    where: { charId: character.charId },
                    data: {
                        charHealth: character.charHealth + item.itemHealth,
                        charPower: character.charPower + item.itemPower
                    }
                });
            });

            return res
                .status(200)
                .json({ message: `${item.itemName}가 장착되었습니다.` });
        }

        await prisma.$transaction(async (tx) => {
            await tx.invens.update({
                where: { invenId: inven.invenId },
                data: {
                    quantity: inven.quantity - 1
                }
            });

            await tx.equips.create({
                data: {
                    charId: character.charId,
                    itemCode: item.itemCode,
                    itemType: item.itemType
                }
            });

            await tx.characters.update({
                where: { charId: character.charId },
                data: {
                    charHealth: character.charHealth + item.itemHealth,
                    charPower: character.charPower + item.itemPower
                }
            });
        });

        return res
            .status(200)
            .json({ message: `${item.itemName}이 장착되었습니다.` });
    } catch (error) {
        next(error);
    }
});

// 아이템 탈착
// 1.해당하는 계정의 아이디가 있는지 확인한다.
// 2. 아이디의 장비에 해당하는 아이템이 있는지 확인하고 인벤토리에도 있는지 없는지 확인한다.
// 3. 만약 인벤토리 내에 있다면
// 3-1. 해당하는 장비 칼럼을 지우고 캐릭터의 스텟을 장비의 스텟만큼 줄인다.
// 3-2. 해당하는 장비의 invens의 quantity 값을 증가시킨다.
// 아니라면
// 3-1 이후에 새롭게 invens의 칼럼을 만든다.
router.post("/equipsOut/:charId", authMiddlewares, async (req, res, next) => {
    try {
        const { accountId } = req.account;
        const { charId } = req.params;
        const { itemCode } = req.body;

        const character = await prisma.characters.findFirst({
            where: {
                charId: +charId,
                accountId: accountId
            }
        });

        if (!character) {
            return res
                .status(400)
                .json({ errorMessage: "캐릭터가 존재하지 않습니다." });
        }

        const inven = await prisma.invens.findFirst({
            where: {
                charId: character.charId,
                itemCode: +itemCode
            }
        });
        const item = await prisma.items.findFirst({
            where: {
                itemCode: +itemCode
            }
        });

        if (!item) {
            return res
                .status(400)
                .json({ errorMessage: "해당하는 아이템이 존재하지 않습니다." });
        }

        const equip = await prisma.equips.findFirst({
            where: {
                charId: character.charId,
                itemCode: item.itemCode
            }
        });

        if (!equip) {
            return res
                .status(400)
                .json({ errorMessage: "해당하는 장비가 존재하지 않습니다." });
        }

        // 3. 만약 인벤토리 내에 있다면
        // 3-1. 해당하는 장비 칼럼을 지우고 캐릭터의 스텟을 장비의 스텟만큼 줄인다.
        // 3-2. 해당하는 장비의 invens의 quantity 값을 증가시킨다.
        // 아니라면
        // 3-1 이후에 새롭게 invens의 칼럼을 만든다.
        if (inven) {
            await prisma.$transaction(async (tx) => {
                await tx.equips.delete({
                    where: {
                        equipId: equip.equipId
                    }
                });

                await tx.characters.update({
                    where: {
                        charId: character.charId
                    },
                    data: {
                        charHealth: character.charHealth - item.itemHealth,
                        charPower: character.charPower - item.itemPower
                    }
                });

                await tx.invens.update({
                    where: {
                        invenId: inven.invenId
                    },
                    data: {
                        quantity: inven.quantity + 1
                    }
                });
            });

            return res
                .status(200)
                .json({ message: `${item.itemName} 탈착에 성공했습니다.` });
        }

        await prisma.$transaction(async (tx) => {
            await tx.equips.delete({
                where: {
                    equipId: equip.equipId
                }
            });

            await tx.characters.update({
                where: {
                    charId: character.charId
                },
                data: {
                    charHealth: character.charHealth - item.itemHealth,
                    charPower: character.charPower - item.itemPower
                }
            });

            await tx.invens.create({
                data: {
                    charId: character.charId,
                    itemCode: item.itemCode
                }
            });
        });

        return res
            .status(200)
            .json({ message: `${item.itemName} 탈착에 성공했습니다.` });
    } catch (error) {
        next(error);
    }
});

//아이템 장착 리스트 조회
router.get("/equipList/:charId", async (req, res, next) => {
    const { charId } = req.params;

    const character = await prisma.characters.findFirst({
        where: { charId: +charId }
    });

    if (!character) {
        return res
            .status(400)
            .json({ errorMessage: "해당하는 캐릭터가 존재하지 않습니다." });
    }

    const equip = await prisma.equips.findMany({
        where: { charId: +charId }
    });

    let returnEquips = [];
    if (!equip) {
        return res.status(200).json({ data: returnEquips });
    }

    for (let value of equip) {
        let item = await prisma.items.findFirst({
            where: { itemCode: value.itemCode },
            select: {
                itemCode: true,
                itemLv: true,
                itemName: true,
                itemType: true
            }
        });
        console.log(item);
        returnEquips.push({ item });
    }

    console.log(returnEquips);
    return res.status(200).json({ data: returnEquips });
});

export default router;
