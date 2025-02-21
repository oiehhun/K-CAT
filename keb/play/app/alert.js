const mongoose = require("mongoose");
const express = require("express");
const axios = require("axios");
const fs = require('fs');
const path = require("path");

const app = express();
const PORT = 9004;

// 📌 JSON 데이터 처리를 위한 미들웨어 추가
app.use(express.json());

// ✅ 위험 대화 감지 여부 확인 API (Polling)
app.post("/api/check_alert", async (req, res) => {

    // 들어온 알람을 "모두 큐에 저장"
    // let alert_api = {
    //     phone : "전화번호",
    //     message : "bert/mn/tts 중 어디서 왔는지",
    // }

    // alert_api를 "queue"에 저장
    // polling이 올때마다 전송
    // 전송한 alert는 shift
    console.log("📌 요청 도착:", req.body);

    const { from, message  } = req.body; 

    if (!phone) {
        return res.status(400).json({ error: "전화번호가 필요합니다." });
    }

    try {
        // 📌 사용자의 위험 알림 데이터 확인
        const alertData = await Alert.findOne({ phone });

        if (!alertData) {
            console.log("📌 해당 사용자의 위험 알림 없음");
            return res.json({ alert: false });
        }

        if (alertData.danger) {
            console.log(`📢 위험 감지 (Phone: ${phone})`);

            // 📌 추가로 MongoDB의 Report 컬렉션에서 보고서 가져오기
            const reportData = await Report.findOne({ phone });

            return res.json({
                alert: true,
                message: alertData.message,
                report: reportData ? reportData.report : "위험 보고서 없음"
            });
        } else {
            console.log(`✅ 안전한 사용자 (Phone: ${phone})`);
            return res.json({ alert: false });
        }
    } catch (err) {
        console.error("❌ 서버 오류:", err);
        res.status(500).json({ error: "서버 오류 발생" });
    }
});

// ✅ 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});
