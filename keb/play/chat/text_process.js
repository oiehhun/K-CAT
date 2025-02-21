const { dbconnection } = require("../config/db");
const mongoose = require("mongoose");
const axios = require("axios");

let chatDB;
let chat_model;

// ✅ 비동기 DB 연결을 기다리고 모델 정의
async function initDB() {
    const dbConnections = await dbconnection();
    chatDB = dbConnections.chatDB;

    chat_model = chatDB.model('chat', new mongoose.Schema({
        phone: String,
        text: [{ sender: String, message: String, time: Date }]
    }, { collection: 'chat' }));
    const Chat = mongoose.model("chat", chat_model);
}

// ✅ DB 초기화 실행
initDB().catch(console.error);

let messageQueue = [];

async function processText(data) {
    try {
        console.log("Data", data);
        if (!chat_model) {
            throw new Error("MongoDB가 아직 연결되지 않았습니다.");
        }

        let { phone_number, nickname, contents, time } = data;
        time = time ? new Date(time) : new Date();

        if (!phone_number || !contents) {
            throw new Error("전화번호(phone)와 메시지(contents)는 필수입니다.");
        }

        // ✅ MongoDB에 채팅 저장
        let chatData = await chat_model.findOne({ phone : phone_number });
        chatData.text.push({ sender: nickname, message: contents, time });
        await chatData.save();
        console.log(`✅ 채팅 저장 완료: ${contents}`);

        // ✅ 메시지 큐 업데이트
        if (messageQueue.length >= 15) messageQueue.shift();
        messageQueue.push(contents);

        let text_api = {
            phone : phone_number,
            nickname : nickname,
            message : messageQueue,
            time : time
        }

        // ✅ AI 서버로 데이터 전송 및 예측 결과 확인
        const prediction = await axios.post('http://localhost:8000/chat/process_text',text_api);
        console.log(`📢 AI 서버 응답: ${JSON.stringify(prediction.data)}`);

        return prediction.data;
    } catch (error) {
        console.error("❌ 채팅 처리 오류:", error.message);
        throw new Error("텍스트 처리 중 오류 발생");
    }
}

module.exports = { processText };
