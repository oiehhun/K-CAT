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
}

// ✅ DB 초기화 실행
const dbInitialized = initDB();

let messageQueue = [];
let queue_wait = [];
let phone_number;
let message_before = null;
async function processText(data) {
    try {
        await dbInitialized;
        console.log("Data in text:", data.phone);
        if (!chat_model) {
            throw new Error("MongoDB가 아직 연결되지 않았습니다.");
        }
        if (!data.phone || !data.text.message) {
            throw new Error("전화번호(phone)와 메시지(contents)는 필수입니다.");
        }
        
        let name = data.name;
        let nickname = data.text.Sender;
        let contents = data.text.message;
        let time = new Date(Date.now());

        // 만약 문자열 안에 "자녀"가 있다면
        if(name.includes("자녀")){
            phone_number = data.phone;
            contents = "[자녀]: " + contents;
        }
        else{
            // 폰번호는 안바뀜 -> 자녀 레포에 저장되어야 하기 때문에
            contents = "[상대방]: " + contents;
        }


        console.log("data 내용",phone_number,name, nickname, contents, time );
        time = time ? new Date(time) : new Date();

        // phone_number가 비어있으면 모두 잠시 대기
        // 비어있지 않을때 DB 저장
        if(!phone_number){
            // 잠시 대기 후 "phone_number"가 채워지면 queue에 푸쉬, DB 저장
            console.log("전화번호 NULL 상태, 잠시 쉬는 중");
            queue_wait.push(contents);
        }else{
            console.log("전화번호 인식 & 저장 및 전송 시작");
            // ✅ MongoDB에 채팅 저장
            let chatData = await chat_model.findOne({ phone : phone_number });
            if(!chatData){
                chatData = new chat_model({ 
                    phone: phone_number,
                    name : name,
                    text: [{ sender: nickname, message: contents, time: time }] 
                });
            }
            chatData.text.push({ sender: nickname, message: contents, time:time });
            await chatData.save();
            console.log(`✅ 채팅 저장 완료: ${contents}`);

            if(queue_wait.length != 0){
                console.log("wait queue is not empty");
                while(queue_wait.length){
                    messageQueue.push(queue_wait[0]);
                    queue_wait.shift();
                }                
            }

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
                    name : name,
                    nickname: nickname,
                    message: messageQueue,
                    time: time
                };

                console.log("🚀 BERT로 데이터 전송 준비:", text_api.message);

                // ✅ AI 서버로 데이터 전송 및 예측 결과 확인
                const response = await sendBert(text_api);
                let response_data = JSON.stringify(response.data)
                console.log(`📢 AI 서버 응답: ${response_data}`);

                return response_data;

            } else {
                console.log(`🚫 중복된 메시지로 인해 BERT 전송을 생략함: ${contents}`);
            }
        }
    }
        catch (error) {
        console.error("❌ 채팅 처리 오류:", error.message);
        console.log(data);
        //throw new Error("텍스트 처리 중 오류 발생");
    }
}

module.exports = { processText };
