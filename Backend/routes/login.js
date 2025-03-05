// routes/user.js
const express = require("express");
const router = express.Router();
const { registerUser } = require("../login/user_login"); // user_process.js에서 registerUser 임포트

// POST /user/register API 엔드포인트 정의
router.post("/", async (req, res) => {
    try {
        console.log(req.body);

        let result = await registerUser(req.body);
        console.log(result);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;
