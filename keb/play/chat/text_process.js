const dbconnection = require('../config/db');
const mongoose = require("mongoose");
const axios = require("axios");

const DBConnection = process.env.DBConnection;
let chatDB;
let chat_model;

const { sendBert } = require("../ai/bert");

// ✅ 비동기 DB 연결을 기다리고 모델 정의
async function initDB() {
    const dbConnections = await dbconnection();
    chatDB = dbConnections.chatDB;

    chat_model = chatDB.model('chat', new mongoose.Schema({
        phone: String,
        text: [{ sender: String, message: String, time: Date }]
    }, { collection: 'chat' }));
    //const Chat = mongoose.model("chat", chat_model);
}

// ✅ DB 초기화 실행
const dbInitialized = initDB();

let messageQueue = [];

let message_before = null;
async function processText(data) {
    try {
        await dbInitialized;
        console.log("Data in text:", data);
        if (!chat_model) {
            throw new Error("MongoDB가 아직 연결되지 않았습니다.");
        }

        //let { phone_number, nickname, contents, time } = data;
        let phone_number = data.phone;
        let nickname = data.text.Sender;
        let contents = data.text.message;
        let time = new Date(Date.now());

        console.log("data 내용",phone_number,nickname, contents, time );
        time = time ? new Date(time) : new Date();

        if (!phone_number || !contents) {
            throw new Error("전화번호(phone)와 메시지(contents)는 필수입니다.");
        }

        // ✅ MongoDB에 채팅 저장
        let chatData = await chat_model.findOne({ phone : phone_number });
        if(!chatData){
            chatData = new chat_model({ 
                phone: phone_number, 
                text: [{ sender: nickname, message: contents, time: time }] 
            });
        }
        chatData.text.push({ sender: nickname, message: contents, time:time });
        await chatData.save();
        console.log(`✅ 채팅 저장 완료: ${contents}`);

        console.log("같은 큐 안에 있는지?",!messageQueue.includes(contents));

        // ✅ 메시지 큐 업데이트 및 BERT 전송
        if (!messageQueue.includes(contents)) {
            console.log("✅ 새로운 메시지 감지, 메시지 큐에 추가");

            // 메시지 큐에 새로운 메시지 추가
            if (messageQueue.length >= 10) messageQueue.shift();
            messageQueue.push(contents);

            console.log("📩 저장된 메시지:", contents);

            // 새로운 메시지가 추가되었을 때만 sendBert 실행
            let text_api = {
                phone: phone_number,
                nickname: nickname,
                message: messageQueue,
                time: time
            };

            console.log("🚀 BERT로 데이터 전송 준비:", text_api);

            // ✅ AI 서버로 데이터 전송 및 예측 결과 확인
            const response = await sendBert(text_api);
            //let response_data = JSON.stringify(response.data)
            console.log(`📢 AI 서버 응답: ${response}`);

            return response;

        } else {
            console.log(`🚫 중복된 메시지로 인해 BERT 전송을 생략함: ${contents}`);
        }
        
    }
        catch (error) {
        console.error("❌ 채팅 처리 오류:", error.message);
        console.log(data);
        //throw new Error("텍스트 처리 중 오류 발생");
    }
}

function contains(element, list) {
    return list.includes(element);
}

module.exports = { processText };
