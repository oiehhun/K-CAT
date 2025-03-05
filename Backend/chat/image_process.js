const dbconnection = require('../config/db');
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { time } = require("console");
const axios = require('axios');

let chatDB;
let image_model;


const { sendMN } = require("../ai/mn");

// ✅ 비동기 DB 연결 및 모델 정의
async function initDB() {
    try {
        if (!chatDB) {
            const dbConnections = await dbconnection();
            chatDB = dbConnections.chatDB;
        }

        // 모델이 이미 존재하면 재등록 방지
        if (!mongoose.models.image_model) {
            image_model = chatDB.model("Image", new mongoose.Schema({
                phone: { type: String, required: true },
                images: [{ filename: String, path: String, time: { type: Date, default: Date.now } }]
            }, { collection: "chat" }));
        } else {
            image_model = mongoose.models.Image; // ✅ 기존 모델 재사용
        }
        
        console.log("✅ MongoDB 모델 등록 완료");
    } catch (error) {
        console.error("❌ initDB() 오류:", error.message);
        throw new Error("DB 초기화 중 오류 발생");
    }
}

// ✅ `initDB()`가 완료될 때까지 대기 후 실행 보장
const dbInitialized = initDB();

async function processImage(data) {

    console.log("Data in image: ", data);
    // 전달되는 data는 "filepath"임
    //console.log("Data in processimage", data.path);

    try {
        await dbInitialized; // ✅ DB 초기화가 완료될 때까지 대기

        if (!image_model) {
            throw new Error("MongoDB 모델이 초기화되지 않았습니다.");
        }

        if (!data.phone || !data.path) {
            throw new Error("전화번호(phone)와 이미지 경로는 필수입니다.");
        }

        // 🔹 저장할 디렉Dir, { recursive: true });
        }
    catch (error) {
        console.error(`❌ 오류 발생: ${error.message}`);
    }
    let image_api = {
        phone : data.phone, 
        images: {
        filename: data.filename, 
        path: data.path, 
        time:data.time
    }};

    // 여기서부터 mogodb에 저장
    try{
        // 🔹 MongoDB 저장
        let imageData = await image_model.findOne({ phone :  data.phone});
        if (!imageData) {
            imageData = new image_model(image_api);
            await imageData.save()
            .then(console.log("Save is Done"))
            .catch(err => console.log("Save Error :", err));
        }
        else{
            await imageData.images.push(image_api.images);
            }
        console.log("✅ 이미지 MongoDB 저장 완료");
        
        let response = await sendMN(image_api);

        //console.log("Response Data in MN", response.message ,response.path);
        return response.path; // ✅ 파일 경로 반환
    } catch (error) {
        console.error("❌ 이미지 처리 오류:", error.message);
        throw new Error("이미지 처리 중 오류 발생");
    }
}

module.exports = { processImage };