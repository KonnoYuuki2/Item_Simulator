export default function (err, res, req, next) {
    console.error(err);

    res.status(500).json({ message: "서버 내부에서 에러가 발생했씁니다." });
}
