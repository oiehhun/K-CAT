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
var id, data;
// firebase와 연결되는 시간이 있음 -> 비동기
usersRef.onSnapshot(async (snapshot) => {
  const changes = snapshot.docChanges();
  for (const change of changes) {
    id = change.doc.id;
    data = change.doc.data();
    if (change.type === "added") {
      console.log("📌 새로운 문서 추가됨:", id, data);
    }
    if (change.type === "modified") {
      console.log("✏️ 문서 수정됨:", id, data);
    }
    if (change.type === "removed") {
      console.log("🗑 문서 삭제됨:", id);
    }

    // 예제: 비동기 처리 (예: 데이터 저장, API 호출)
    await someAsyncFunction(id, data);
    var json_data;
    data = {
      "id" : data.nickname,
      "text" : data.contents,
      //"img" : data.image,
      //"audio" : data.audio
    }
    json_data = JSON.stringify(data);
    // mongo db 연결

    const mongo = require('mongoose');
    mongo.connect("mongodb://localhost:27017/test_db", {
    	useNewUrlParser : true,
        useCreateIndex : true,
    }).then(()=>{
    	console.log("MongoDB에 연결되었습니다 ㅇㅅㅇ");
    }).catch((err)=>{
    	console.error(err);
    });
  }
});
/*
var json_data;
data = {
  "nickname" : data.nickname,
  "text" : data.contents
}
json_data = JSON.stringify(data);

console.log(json_data);
*/
// 함수
// 비동기 함수 예제
async function someAsyncFunction(id, data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`✅ 비동기 작업 완료: ${data}`);
      resolve();
    }, 1000);
  });
}