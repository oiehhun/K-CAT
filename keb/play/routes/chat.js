// routes/chat.js
const express = require("express");
const router = express.Router();

// chat/text_process.js에서 processText 함수 임포트
const { processText } = require("../chat/text_process");
const { processImage } = require("../chat/image_process");
const { processAudio } = require("../chat/audio_process");

// POST /chat/text API 엔드포인트 정의
router.post("/text_process", async (req, res) => {
    try {
        const result = await processText(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/image_process", async (req, res) => {
    try {
        const result = await processImage(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/audio_process", async (req, res) => {
    try {
        const result = await processAudio(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
