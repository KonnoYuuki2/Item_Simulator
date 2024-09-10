import express from "express";
import { prisma } from "../../utils/prisma/index.js";
import dotenv from "dotenv";
import authMiddlewares from "./middlewares/auth.middlewares.js";
import jwt from 'jsonwebtoken';

dotenv.config();
const router = express.Router();
//아이템 생성 API
router.post("/items", async (req, res, next) => {
    const { itemCode, itemName, image, itemHealth, itemPower, Price } = req.body;

    const item = await prisma.items.create({
        data: {
            itemCode: itemCode,
            image: image,
            itemName: itemName,
            itemHealth: itemHealth,
            itemPower: itemPower,
            Price: Price,
        }
    });

    return res
        .status(200)
        .json({ message: `${itemName} 생성이 완료되었습니다.` });
});

//아이템 수정 API
router.post("/items/:itemCode", async (req, res, next) => {
    const { itemCode } = req.params;
    const updateData = req.body;

    if(updateData.Price) {
        return res.status(400).json({errorMessage: '가격은 수정할 수 없습니다.'});
    }
    const item = await prisma.items.findFirst({
        where: { itemCode: +itemCode },
    });

    if (!item) {
        return res
            .status(400)
            .json({ errorMessage: "해당하는 아이템이 존재하지 않습니다." });
    }

    await prisma.items.update({
        where: { itemCode: item.itemCode },
        data: {
            ...updateData,
        },
    });

    return res.status(200).json({ message: "아이템 수정에 성공했습니다." });
});

//아이템 목록 조회
router.get("/items", async (req, res, next) => {
    const itemList = await prisma.items.findMany({
        select: {
            itemId: true,
            itemCode: true,
            itemName: true,
            Price: true,
        },
    });

    return res.status(200).json({ itemList: itemList });
});

//아이템 상세 조회
router.get("/items/:itemCode", async (req, res, next) => {
    const { itemCode } = req.params;

    const item = await prisma.items.findFirst({
        where: { itemCode: +itemCode },
        select: {
            image: true,
            itemName: true,
            itemHealth: true,
            itemPower: true,
            Price: true,
        },
    });

    if (!item) {
        return res
            .status(400)
            .json({ errorMessage: "해당하는 아이템을 찾을 수 없습니다." });
    }

    return res.status(200).json({ data: item });
});



export default router;
