const dbconnection = require('../config/db');
const mongoose = require("mongoose");
require('dotenv').config()

let userLoginDB;
let loginSchema;

// ✅ 비동기 DB 연결을 기다리고 모델 정의
async function initDB() {
    if (!userLoginDB) { // MongoDB 연결이 없을 때만 연결
        const dbConnections = await dbconnection();
        userLoginDB = dbConnections.userLoginDB;

        loginSchema = userLoginDB.model("Login", new mongoose.Schema({
            phone: { type: String, required: true, unique: true },
            role: { type: String, required: true },
            time: { type: Date, default: Date.now },
            children_phone: { type: [String] }
        }, { collection: "login" }));
    }
}

// ✅ DB 초기화 실행 (애플리케이션 실행 시 자동 실행)
const dbInitialized = initDB();

async function registerUser(data) {
    try {
        console.log("data : ", data);
        // ✅ MongoDB 연결 확인
        await dbInitialized;

        if (!loginSchema) {
            throw new Error("MongoDB가 아직 연결되지 않았습니다.");
        }

        let { phone, role, children_phone } = data;
        if (!phone || !role) {
            return "로그인 오류!";
            throw new Error("전화번호(phone)와 역할(role)은 필수입니다.");
        }

        // 🔹 사용자 정보 저장
        let existingUser = await loginSchema.findOne({ phone : phone });
        if (!existingUser) {
            let newUser = new loginSchema({ phone, role, children_phone });
            await newUser.save();
            console.log("✅ 사용자 MongoDB 저장 완료");
            return "사용자 정보 저장 완료!";
        } else {
            console.log("⚠️ 기존 사용자 존재");
            // 4. 만약 role == "Parent" 라면, {Children_phone : [String]} 추가
            if(existingUser.role === 'parent'){
                await loginSchema.findOneAndUpdate({phone : phone}, 
                    { $push: { children_phone: children_phone } });
                //parent 찾아서 애기 전화번호 입력 완료
                console.log("자녀 등록 완료");
                return "자녀 등록 완료";
            }
            else{
                console.log("사용자 정보 업데이트 불필요");
                return "사용자 정보 업데이트 불필요";
            }
            
        }

    } catch (error) {
        console.error("❌ MongoDB 저장 오류:", error.message);
        throw new Error("데이터 저장 실패");
    }
}

module.exports = { registerUser };
