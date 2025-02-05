/*
설치한 npm package 
1. npm install -g express-generator
2. npm install firebase firebase-admin
3. express --session --view=ejs --css css {$filename}
4. cd {$filename} && npm install && npm start
5. npm i firestore-storage-core firestore-storage
ex. key file의 위치를 환경 변수로 설정 -> 위치를 노출하지 않고도 사용 가능
$env:GOOGLE_APPLICATION_CREDENTIALS="{$pwd}"

github
1. 작업시 pull로 repo와 동기화 할 것
*/
// 1. firebase 연동
// Import the functions you need from the SDKs you need
const admin = require("firebase-admin");
require('dotenv').config();

// Firebase 서비스 계정 키 JSON 파일 경로
const serviceAccount = require(process.env.KEY);

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firestore 인스턴스 가져오기
const db = admin.firestore();

// 실시간 업데이트 감지
const usersRef = db.collection("Chat");

usersRef.onSnapshot((snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      console.log("📌 새로운 문서 추가됨:", change.doc.id, change.doc.data());
    }
    if (change.type === "modified") {
      console.log("✏️ 문서 수정됨:", change.doc.id, change.doc.data());
    }
    if (change.type === "removed") {
      console.log("🗑 문서 삭제됨:", change.doc.id);
    }
  });
});

console.log("✅ Firestore 실시간 감지 시작...");
