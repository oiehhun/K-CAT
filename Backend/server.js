// TODO
// 1. 라우터 정의
// 2. firebase 채팅 내역 가져오기

// express 실행
const express = require("express");

// firebase 실행 시 필요한 패키지 & 설정들
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config()

var serviceAccount = require(process.env.FIREBASE_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

const db = admin.firestore();
const chatRef = db.collection("chats");
const rdRef = db.collection("frames");


// 사용할 라우터 내역
const dbconnection = require("./config/db");
const loginRoutes = require("./routes/login");
const chatRoutes = require('./routes/chat');
const appRoutes = require('./routes/app');

const app = express();
const PORT = process.env.PORT_SERVER;

app.use(express.json());
app.use(cors()); // CORS 허용
app.use(bodyParser.json()); // JSON 요청 본문 처리
app.use(bodyParser.urlencoded({ extended: true })); // URL-encoded 데이터 처리

app.use("/login", loginRoutes);
app.use("/chat", chatRoutes);
app.use('/app', appRoutes);

Server();

let userDB;
let user_model;
let userLoginDB;


// 일단 예시로
let chatuser_phone;
async function Server() {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
        });

        // ✅ 초기화
        let lastCheckedTime = new Date(); 
        let used_data = new Set(); // ✅ Set 자료구조 사용으로 중복 메시지 방지
        
        // ✅ chatRef의 변화 감지
        chatRef.orderBy("time", "asc").onSnapshot(async (snapshot) => {
            console.log("채팅 사진 실행 중");
            const changes = snapshot.docChanges();
            for (const change of changes) {
                if (change.type === "added") {
                    let userData = change.doc.data();
                    console.log("Userdata:", userData.nickname);
                    chatuser_phone = userData.phone;

                    // 유저 이름 부여 -> login DB에 존재하면 "자녀 사용자"
                    userData.name = await findUser(userData, chatuser_phone);

                    let user_info = {
                        phone : chatuser_phone,
                        name : userData.name,
                    }
        
                    // ✅ 중복 메시지 방지 로직을 적용하며 각각의 데이터를 분리하여 chatScrap()으로 전송
                    // 텍스트 메시지 처리
                    if (userData.contents && !used_data.has(userData.contents)) {
                        console.log("Text message detected: ", userData.contents);
                        await chatScrap({ ...userData, type: 'text' }, chatuser_phone);
                        used_data.add(userData.contents);
                        console.log(`📩 저장된 텍스트 메시지: ${userData.contents}`);
                    } else if (userData.contents) {
                        console.log(`🚫 중복된 텍스트 메시지로 인해 저장하지 않음: ${userData.contents}`);
                    }
        
                    // 이미지 메시지 처리
                    if (userData.imageUrl && !used_data.has(userData.imageUrl)) {
                        console.log("Image message detected: ", userData.imageUrl);
                        await chatScrap({ ...userData, type: 'image' }, chatuser_phone);
                        used_data.add(userData.imageUrl);
                        console.log(`📩 저장된 이미지 메시지: ${userData.imageUrl}`);
                    } else if (userData.imageUrl) {
                        console.log(`🚫 중복된 이미지 메시지로 인해 저장하지 않음: ${userData.imageUrl}`);
                    }
        
                    // 음성 메시지 처리
                    if (userData.audioUrl && !used_data.has(userData.audioUrl)) {
                        console.log("Audio message detected: ", userData.audioUrl);
                        await chatScrap({ ...userData, type: 'audio' }, chatuser_phone);
                        used_data.add(userData.audioUrl);
                        console.log(`📩 저장된 음성 메시지: ${userData.audioUrl}`);
                    } else if (userData.audioUrl) {
                        console.log(`🚫 중복된 음성 메시지로 인해 저장하지 않음: ${userData.audioUrl}`);
                    }
                }
            }
        });

        // ✅ rdRef의 변화 감지 -> 실시간이니 이미지만 있음
        rdRef.orderBy("time", "asc").onSnapshot(async (snapshot) => {
            console.log("사진 변화 감지 시작");
            const changes = snapshot.docChanges();
            for (const change of changes) {
                if (change.type === "added") {
                    let userData = change.doc.data();
                    let chatuser_phone = userData.phone; // ✅ rdRef에서도 초기화

                    // 실전에서는 예시용 지우고 아래 코드 사용 해야
                    chatuser_phone = userData.phone;

                    // 유저 이름 부여
                    userData.name = await findUser(userData, chatuser_phone);
                    
                    // 이미지 메시지 처리
                    if (userData.imageUrl && !used_data.has(userData.imageUrl)) {
                        console.log("Image message detected: ", userData.imageUrl);
                        await chatScrap({ ...userData, type: 'image' }, chatuser_phone);
                        used_data.add(userData.imageUrl);
                        console.log(`📩 저장된 이미지 메시지: ${userData.imageUrl}`);
                    } else if (userData.imageUrl) {
                        console.log(`🚫 중복된 이미지 메시지로 인해 저장하지 않음: ${userData.imageUrl}`);
                    }
                }  
            } // ✅ 스냅샷 처리 후 마지막 확인 시간 업데이트
            lastCheckedTime = new Date();
        });

    } catch (error) {
        console.error("❌ 서버 시작 실패:", error.message);
    }
}


module.exports = {Server};

async function findUser(userData, chatuser_phone){
    let name;
    // 만약 phone number 가 userDB에 있으면 -> 자녀 + (닉네임)
    // 없으면 상대방+(닉네임)
    let user_data = await user_model.findOne({phone : chatuser_phone});
    if(!user_data){
        name = "상대방(" + userData.nickname + ")";
    }
    else{
        name = "자녀(" + userData.nickname + ")";
    }
    console.log("검색 결과 :", user_data);
    return name;
}

async function chatScrap(user_chat, user_phoneNumber) {
    console.log("in chatscrap: ", user_chat, user_phoneNumber);
    
    if(user_chat.type === 'image') {
        await sendImage(user_chat, user_phoneNumber);
    } else if (user_chat.type === 'audio') {
        await sendAudio(user_chat, user_phoneNumber);
    } else if (user_chat.type === 'text') {
        await sendText(user_chat, user_phoneNumber);
    } else {
        console.log("🚫 지원되지 않는 메시지 유형:", user_chat.type);
    }
}


async function sendText(user_chat, user_phoneNumber) {
    let data = user_chat;
    let phone_number = user_phoneNumber;

    let text_api = {
        phone : phone_number,
        name : data.name,
        text : {
            Sender : data.nickname,
            time : data.time,
            message : data.contents
        }
    }
    let res = await axios.post(process.env.BERT_URL, text_api);
    return res.body;
}

async function sendImage (user_chat, user_phoneNumber) {
    console.log("User data before send image:", user_chat);
    let data = user_chat;
    let phone_number = user_phoneNumber;

    // 📅 Timestamp를 Date 객체로 변환
    let date = new Date(data.time._seconds * 1000 + data.time._nanoseconds / 1000000);

    // ⏰ ISO 8601 형식으로 변환
    let formattedDate = date.toISOString();
    
    console.log("Date:", date);
    // 📅 ISO 8601 형식에서 파일 이름을 안전하게 변환
    let safeFileName = formattedDate.replace(/[:.]/g, "-");

    
    let filePath = path.join(__dirname, 'image', `${safeFileName}.jpg`);
    //console.log(data.imageUrl, filePath)
    
    let image_url = await download(data.imageUrl, filePath)
    
    // ✅ JSON 데이터를 문자열로 변환하여 추가
    let imageData = {
        phone : phone_number,
        name : data.name,
        filename: safeFileName,
        path: image_url,
        time: date
    };

    let imageData_totext = {
        phone : phone_number,
        name : data.name,
        text :{
            Sender : data.nickname,
            time : data.time,
            message : "[사진 전송]"
        }
    };
    //console.log("Image Data",imageData);
    try {
        let res_sendImagetoText = await axios.post(process.env.BERT_URL, imageData_totext);
        let res = await axios.post(process.env.MN_URL, imageData);
        console.log("Server Response:", res.message);

        return res.path;
    } catch (error) {
        console.error("Error uploading image:", error.response?.data || error.message);
    }
}

async function sendAudio(user_chat, user_phoneNumber) {
    let data = user_chat;
    let phone_number = user_phoneNumber;

    //let filePath = path.join(__dirname, 'audio', `${data.time}.jpg`);

    console.log(data.time._seconds);
    // 📅 Timestamp를 Date 객체로 변환
    let date = new Date(data.time._seconds * 1000 + data.time._nanoseconds / 1000000);

    // ⏰ ISO 8601 형식으로 변환
    let formattedDate = date.toISOString();
    // 📅 ISO 8601 형식에서 파일 이름을 안전하게 변환
    let safeFileName = formattedDate.replace(/[:.]/g, "-");
    
    let filePath = path.join(__dirname, 'audio', `${safeFileName}.mp3`);

    let audio_url = await download(data.audioUrl, filePath)
    
    // ✅ JSON 데이터를 문자열로 변환하여 추가
    let audioData = {
        phone : phone_number,
        name : data.name,
        nickname : data.nickname,
        filename: safeFileName,
        path: audio_url,
        time: date
    };

    try {
        let res = await axios.post(process.env.TTS_URL, audioData);
        // res.data = stt 결과 (text)
        
        return res.data;
    } catch (error) {
        console.error("Error uploading Audio:", error.response?.data || error.message);
    }
}

// 파일 다운로드 함수 수정
async function download(url, filePath) {
    try {
        let new_url = null;
        try {
            new_url = new URL(url);
            console.log("✅ 유효한 URL입니다.");
        } catch (e) {
            console.error("❌ 잘못된 URL 형식:", new_url);
            return;
        }

        //console.log(`Downloading file from: ${new_url} to ${filePath}`);

        // 디렉토리가 없으면 생성
        let dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        return new Promise(async (resolve, reject) => {
            try {
                let response = await axios({
                    method: 'get',
                    url: new_url.toString(),
                    responseType: 'stream'
                });

                let writer = fs.createWriteStream(filePath);

                response.data.pipe(writer);

                writer.on('finish', () => {
                    console.log("✅ 파일 다운로드 완료:", filePath);
                    resolve(filePath); // ✅ filePath를 반환하도록 수정
                });

                writer.on('error', (err) => {
                    console.error("❌ 파일 저장 중 오류:", err.message);
                    reject(err);
                });
            } catch (error) {
                console.error(`❌ Error downloading file: ${error.message}`);
                reject(error);
            }
        });
    } catch (error) {
        console.error(`❌ Error downloading file: ${error.message}`);
        console.log(`Download Error: ${error.message}`);
    }
}

let chatuser_schema;
let ChatUser;

// ✅ 비동기 DB 연결을 기다리고 모델 정의
async function initDB() {
    const dbConnections = await dbconnection();
    userDB = dbConnections.userLoginDB;
    ChatuserDB = dbConnections.chat_userDB;

    ChatUser = ChatuserDB.model('chat_user', new mongoose.Schema({
        phone : {type : String, require : true},
        name : {type : String, require : true},
        time : { type: Date, default: Date.now }
    }, {collection : "chatuser_info" }));

    user_model = userDB.model('user', new mongoose.Schema({
        phone: String,
        text: [{ sender: String, message: String, time: Date }]
    }, { collection: 'login' }));
    //const Chat = mongoose.model("chat", chat_model);
}