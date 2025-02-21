// 1. firebase 연동
const admin = require("firebase-admin");
require('dotenv').config();

// key file 경로
const serviceAccount = require(process.env.KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 2. firebase 내부 data parsing
var id, data;
const db = admin.firestore();

// 실시간 업데이트 감지
const usersRef = db.collection("Chat");

// Todo

// 3. parsed data를 mongodb에 저장