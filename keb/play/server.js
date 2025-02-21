// TODO
// 1. 라우터 정의
// 2. firebase 채팅 내역 가져오기

// express 실행
const express = require("express");

// firebase 실행 시 필요한 패키지 & 설정들
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const axios = require('axios');

var serviceAccount = require("/home/dummy/keb/Main/login-57511-firebase-adminsdk-fbsvc-be1ccd55a1.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

const db = admin.firestore();
const chatRef = db.collection("chats");
const userRef = db.collection("users");

// 사용할 라우터터 내역
const { dbconnection } = require("./config/db");
const loginRoutes = require("./routes/login");
const appRoutes = require('./routes/app');
const chatRoutes = require('./routes/chat');
const aiRoutes = require("./routes/ai");
const rdRoutes = require('./routes/rd');

const app = express();
const PORT = 8000;

app.use(express.json());
app.use("/login", loginRoutes);
app.use('/app', appRoutes);
app.use("/chat", chatRoutes);
app.use("/ai", aiRoutes);
app.use("/realtime_detection", rdRoutes);

async function Server() {
    try {
        console.log("🔄 MongoDB 연결 중...");
        await connectDB();
        console.log("✅ MongoDB 연결 성공!");

        app.listen(PORT, () => {
            console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
        });

        // firebase 실행
        firebase();
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
    userRef.onSnapshot(async (snapshot) => {
        snapshot.docChanges().forEach(async (change) =>{
            if(change.type === 'added'){
                let userinfo = change.doc.data();
                if (!chatuserDB) { // MongoDB 연결이 없을 때만 연결
                    const dbConnection = await dbconnection();
                    chatuserDB = dbConnections.chat_userDB;

                    let new_chatuser = new ChatUser({
                        phone : userinfo.phone,
                        name : userinfo.name,
                    })

                    let user = chatuserDB.findOne({phone : userinfo.phone})
                    if(!user){
                        await new_chatuser.save()
                                .then(console.log("User created"))
                                .catch(err => console.log("User save Error: ", err));
                    }
                    else{
                        console.log("User is already exist!");
                    }
                    return {phone : userinfo.phone, name : userinfo.name};
                }
            }
        })
    })
}

let userLoginDB;

async function firebase_getchatting() {

    // firebase의 user에서 찾은 전화번호/이름 받아옴
    let {chatuser_phone, nickname} = await firebase_getuser();

    let lastCheckedTime = new Date(); // 초기화 시점
    chatRef.onSnapshot(async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if(!userLoginDB){
                const dbConnection = await dbconnection();
                userLoginDB = dbConnection.userLoginDB;
            }
            
            // 전화번호를 통해 userLoginDB에서 사용자("자녀") 찾기
            const existingUser = await userLoginDB.findOne({ phone: chatuser_phone });

            if (existingUser) {
                if (change.type === "added") {
                    let userData = change.doc.data();
                    // userData.timestamp가 참이면 (비어있지 않으면) -> 현재 시간으로 변환
                    const chatTimestamp = userData.timestamp ? userData.timestamp.toDate() : null;

                    // 현재 시간 이후의 채팅만 가져오기
                    if (chatTimestamp && chatTimestamp > lastCheckedTime) {
                        console.log(`✅ 새로운 채팅 발견 (${userData}), 채팅 저장 준비: ${chatuser_phone}`);
                        chatScrap(userData, chatuser_phone);
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
    else await sendText(user_cha, user_phoneNumber);
}

async function sendText(user_chat, user_phoneNumber) {
    let data = user_chat;
    let phone_number = user_phoneNumber;

    let text_api = {
        phone : phone_number,
        text : {
            Sender : data.nickname,
            time : data.time,
            message : '메롱'
        }
    }
    let res = await axios.post("http://localhost:8001/chat/text_process", text_api);
    return res.body;
}

async function sendImage (user_chat, user_phoneNumber) {
    let data = user_chat;
    let phone_number = user_phoneNumber;

    let filePath = path.join(__dirname, 'image', `${data.time}.jpg`);
    download(data.imageUrl, filePath)
    
    // ✅ JSON 데이터를 문자열로 변환하여 추가
    let imageData = {
        phone : phone_number,
        filename: data.time,
        path: filePath,
        time: data.time
    };

    try {
        let res = await axios.post("http://localhost:8000/chat/image_process", imageData);
        console.log("Server Response:", res.data);
        return res.data;
    } catch (error) {
        console.error("Error uploading image:", error.response?.data || error.message);
    }
}

async function sendaudio(user_chat, user_phoneNumber) {
    let data = user_chat;
    let phone_number = user_phoneNumber;

    //let filePath = path.join(__dirname, 'audio', `${data.time}.jpg`);
    let filePath = path.join(__dirname, 'audio', `${data.time}.mp3`);

    download(data.audioUrl, filePath)
    
    // ✅ JSON 데이터를 문자열로 변환하여 추가
    let audioData = {
        phone : phone_number,
        filename: data.time,
        path: filePath,
        time: data.time
    };

    try {
        let res = await axios.post("http://localhost:8000/audio/audio_process", audioData);
        return res.data;
    } catch (error) {
        console.error("Error uploading image:", error.response?.data || error.message);
    }
}

// 파일 다운로드 함수 수정
async function download(url, filePath) {
    try {
        console.log(`Downloading file from: ${url} to ${filePath}`);

        // 디렉토리가 없으면 생성
        let dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        });

        let writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);
        writer.on('finish', () => {
            console.log(`✅ File successfully downloaded: ${filePath}`);
            console.log('Download Success');
        });
        writer.on('error', (error) => {
            console.error(`❌ Error writing file: ${error}`);
            console.log(`Download Error: ${error.message}`);
        });

    } catch (error) {
        console.error(`❌ Error downloading file: ${error.message}`);
        console.log(`Download Error: ${error.message}`);
    }
}