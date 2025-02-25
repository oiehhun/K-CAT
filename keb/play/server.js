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

var serviceAccount = require("/home/dummy/keb/Main/login-57511-firebase-adminsdk-fbsvc-be1ccd55a1.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

const db = admin.firestore();
const chatRef = db.collection("chats");
const userRef = db.collection("users");
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

async function Server() {
    try {
        app.listen(PORT, () => {
            console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
        });

        // ✅ 초기화
        let lastCheckedTime = new Date(); 
        let before_messages = new Set(); // ✅ Set 자료구조 사용으로 중복 메시지 방지
        let before_url = new Set();
        
        // ✅ chatRef의 변화 감지
        chatRef.orderBy("time", "asc").onSnapshot(async (snapshot) => {
            console.log("채팅 사진 실행 중");
            const changes = snapshot.docChanges();
            for (const change of changes) {
                if (change.type === "added") {
                    let userData = change.doc.data();
                    console.log(`✅ 새로운 채팅 발견 (${userData.contents})`);
                    let chatuser_phone = '01098765432';

                    // 📌 중복 메시지 방지 로직
                    if (!before_messages.has(userData.contents)) {
                        await chatScrap(userData, chatuser_phone);
                        before_messages.add(userData.contents); // ✅ Set에 메시지 추가
                        console.log(`📩 저장된 메시지: ${userData.contents}`);
                    } else {
                        console.log(`🚫 중복된 메시지로 인해 저장하지 않음: ${userData.contents}`);
                    }
                }
            }
        });
        
        // ✅ rdRef의 변화 감지
        rdRef.onSnapshot(async (snapshot) => {
            console.log("사진 변화 감지 시작");
            const changes = snapshot.docChanges();
            for (const change of changes) {
                if (change.type === "added") {
                    let userData = change.doc.data();
                    if (!userLoginDB) {
                        const dbConnection = await dbconnection();
                        userLoginDB = dbConnection.userLoginDB;
                    }
    
                    let chatuser_phone = '01098765432'; // ✅ rdRef에서도 초기화

                    // chat_userDB에서 nickname을 통해 사용자를 식별

                    // 1. 사용자 nickname get
                    // 만약 userDB에 없으면 일반 채팅 사용자
                    // userDB에 있으면 "katch 앱에 등록된 사용자"
                    // 2. 들어오는 입력을 

                    // 📌 중복 메시지 방지 로직
                    if (!before_url.has(userData.imageUrl)) {
                        await chatScrap(userData, chatuser_phone);
                        before_url.add(userData.imageUrl); // ✅ Set에 메시지 추가
                        //console.log(`📩 저장된 메시지: ${userData.imageUrl}`);
                    } else {
                        console.log(`🚫 중복된 메시지로 인해 저장하지 않음: ${userData.imageUrl}`);
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

let chatuserDB;
let chatuser_schema = mongoose.Schema({
    phone : {type : String, require : true},
    name : {type : String, require : true},
    time : { type: Date, default: Date.now }
}, {collection : "chatuser_info" });
const ChatUser = mongoose.model("ChatUser", chatuser_schema);

async function firebase_getuser(){
    console.log("채팅 사용자 실행 중");
    return new Promise((resolve, reject) => {
        userRef.onSnapshot(async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                let lastCheckedTime = new Date(); // 초기화 시점
                if(change.type === 'added'){
                    let userinfo = change.doc.data();
                    let userTimestamp = await userinfo.createdAt ? userinfo.createdAt.toDate()-1 : null;

                    // 현재 시간 이후의 채팅만 가져오기
                    if (userTimestamp && userTimestamp > lastCheckedTime) {
                        console.log(`✅ 새로운 사용자 발견 (${userinfo})`);
                        const result = await adduser(chatuserDB, userinfo);
                        resolve(result);
                    }
                }
            });
        });
    });
}


let userLoginDB;

async function adduser(chatuserDB, userinfo){
    if (!chatuserDB) { // MongoDB 연결이 없을 때만 연결
        const dbConnection = await dbconnection();
        chatuserDB = dbConnection.chat_userDB;

        let new_chatuser = new ChatUser({
            phone : userinfo.phone,
            name : userinfo.name,
        })

        let user = await ChatUser.findOne({phone : userinfo.phone})
        if(!user){
            await new_chatuser.save()
                .then(() => {
                    console.log("User created");
                    resolve({chatuser_phone : userinfo.phone, nickname : userinfo.name});
                })
                .catch(err => {
                    console.log("User save Error: ", err);
                    reject(err);
                });
        } else {
            console.log("User is already exist!");
            resolve({chatuser_phone : userinfo.phone, nickname : userinfo.name});
        }
    } else {
        resolve({chatuser_phone : userinfo.phone, nickname : userinfo.name});
    }
}


let before_messages = new Set();
async function firebase_getchatting() {
    console.log("채팅 실행 중");

    //let {chatuser_phone, nickname} = await firebase_getuser();

    let lastCheckedTime = new Date(0); // 초기화 시점

    chatRef.orderBy("time", "asc").onSnapshot(async(snapshot) => {
        const changes = snapshot.docChanges();
        for (const change of changes) {
            if (change.type === "added") {
                let userData = change.doc.data();
                console.log(`✅ 새로운 채팅 발견 (${userData.contents})`);
                let chatuser_phone = '01098765432';
                 // 📌 이전 메시지와 비교하여 중복 메시지 방지
                if (!before_messages.has(userData.contents)) {
                    await chatScrap(userData, chatuser_phone);
                    before_message = userData.contents; // ✅ 메시지를 업데이트
                    console.log(`📩 저장된 메시지: ${before_message}`);
                } else {
                    console.log(`🚫 중복된 메시지로 인해 저장하지 않음: ${userData.contents}`);
                }
                /*
                let chatTimestamp = userData.timestamp ? userData.timestamp.toDate() : null;

                console.log("chatTimestamp", chatTimestamp);

                // 현재 시간 이후의 채팅만 가져오기
                if (chatTimestamp && chatTimestamp > lastCheckedTime) {
                    console.log(`✅ 새로운 채팅 발견 (${userData}), 채팅 저장 준비: ${userData.nickname}`);
                    await chatScrap(userData, chatuser_phone);
                }
                    */
            }
        }

        // 스냅샷 처리 후 마지막 확인 시간 업데이트
        lastCheckedTime = new Date();
    });
}

let before_photo_link = null;
async function firebase_getframes() {
    // firebase의 user에서 찾은 전화번호/이름 받아옴
    
    console.log("채팅 사진 실행 중");

    let lastCheckedTime = new Date(); // 초기화 시점
    rdRef.onSnapshot(async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if(!userLoginDB){
                const dbConnection = await dbconnection();
                userLoginDB = dbConnection.userLoginDB;
            }
            
            // 전화번호를 통해 userLoginDB에서 사용자("자녀") 찾기
            const existingUser = await ChatUser.findOne({ phone: chatuser_phone });

            if (existingUser) {
                if (change.type === "added") {
                    let userData = change.doc.data();
                    // userData.timestamp가 참이면 (비어있지 않으면) -> 현재 시간으로 변환
                    const chatTimestamp = userData.timestamp ? userData.timestamp.toDate() : null;

                    // 현재 시간 이후의 채팅만 가져오기
                    if (chatTimestamp && chatTimestamp > lastCheckedTime) {
                        console.log(`✅ 새로운 채팅 발견 (${userData}), 채팅 저장 준비: ${chatuser_phone}`);
                        sendImage(userData, chatuser_phone);
                    }
                }
            }
        });
        // 스냅샷 처리 후 마지막 확인 시간 업데이트
        lastCheckedTime = new Date();
    });
}

async function chatScrap(user_chat, user_phoneNumber) {
    if(user_chat.imageUrl) await sendImage(user_chat, user_phoneNumber);
    else if (user_chat.audioUrl) await sendAudio(user_chat, user_phoneNumber);
    else await sendText(user_chat, user_phoneNumber);
}

async function sendText(user_chat, user_phoneNumber) {
    let data = user_chat;
    let phone_number = user_phoneNumber;

    let text_api = {
        phone : phone_number,
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
    let data = user_chat;
    let phone_number = user_phoneNumber;

    console.log(data.time._seconds);
    // 📅 Timestamp를 Date 객체로 변환
    let date = new Date(data.time._seconds * 1000 + data.time._nanoseconds / 1000000);

    // ⏰ ISO 8601 형식으로 변환
    let formattedDate = date.toISOString();
    // 📅 ISO 8601 형식에서 파일 이름을 안전하게 변환
    let safeFileName = formattedDate.replace(/[:.]/g, "-");

    
    let filePath = path.join(__dirname, 'image', `${safeFileName}.jpg`);
    //console.log(data.imageUrl, filePath)
    
    let image_url = await download(data.imageUrl, filePath)
    
    // ✅ JSON 데이터를 문자열로 변환하여 추가
    let imageData = {
        phone : phone_number,
        filename: safeFileName,
        path: image_url,
        time: data.time
    };
    //console.log("Image Data",imageData);
    try {
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

    console.log(data.timestamp._seconds);
    // 📅 Timestamp를 Date 객체로 변환
    let date = new Date(data.timestamp._seconds * 1000 + data.timestamp._nanoseconds / 1000000);

    // ⏰ ISO 8601 형식으로 변환
    let formattedDate = date.toISOString();
    // 📅 ISO 8601 형식에서 파일 이름을 안전하게 변환
    let safeFileName = formattedDate.replace(/[:.]/g, "-");
    
    let filePath = path.join(__dirname, 'audio', `${safeFileName}.mp3`);

    let audio_url = await download(data.audioUrl, filePath)
    
    // ✅ JSON 데이터를 문자열로 변환하여 추가
    let audioData = {
        phone : phone_number,
        filename: safeFileName,
        path: audio_url,
        time: data.time
    };

    try {
        let res = await axios.post(process.env.TTS_URL, audioData);
        return res.data;
    } catch (error) {
        console.error("Error uploading Audio:", error.response?.data || error.message);
    }
}

// 파일 다운로드 함수 수정
async function download(url, filePath) {
    try {

        //let encodedUrl = encodeURI(url);
        //let encodedUrl = decodeURI(url);;
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