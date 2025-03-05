const express = require('express');
const axios = require("axios");
const fs = require("fs");
const FormData = require('form-data');
require('dotenv').config();

const app = express();
PORT = process.env.PORT_MN;

app.listen(PORT, () => {
    console.log(`✅ MobileNet 모델 서버가 http://localhost에서 실행 중`);

});

async function sendMN(request) {
   let {phone, images} = request;

    try {
        if (!images.path) {
            throw new Error("이미지 경로가 제공되지 않았습니다.");
        }

        if (!fs.existsSync(images.path)) {
            throw new Error(`파일이 존재하지 않습니다: ${images.path}`);
        }

        if (fs.lstatSync(images.path).isDirectory()) {
            throw new Error(`파일이 아닌 디렉토리를 전달할 수 없습니다: ${imagePath}`);
        }

        console.log("📂 전송할 이미지 경로:", images.path);

        const formData = new FormData();
        formData.append("file", fs.createReadStream(images.path), {
            filename: images.filename,
            contentType: "image/jpeg",
        });

        const aiServerUrl = process.env.AI_SERVER_MN;
        console.log("🌍 AI 서버에 이미지 전송 중... URL:", aiServerUrl);

        const response = await axios.post(aiServerUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                Accept: "application/json",
            },
        });
        // alert.js 에 알람 전송하는 로직 작성해야 함

        console.log("✅ AI 서버 응답:", `${images.filename}`, response.data.prediction);

        if (response.data.prediction === 'nsfw'){
            // alert.js 에 알람 전송하는 로직 작성해야 함
            let alert_api = {
                phone :phone,
                message : "이미지 내역에서 위험상황 발생!",
            }
            axios.post("http://localhost:8000/app/check_alert",alert_api);
            return  {message : alert_api.message};
        }
        else{
            return {message : "이상 없음", path : images.path};
        }
    } catch (error) {
        console.error("❌ AI 서버 전송 오류:", error.message);

        if (error.response) {
            console.error("❌ AI 서버 응답 코드:", error.response.status);
            console.error("❌ AI 서버 응답 데이터:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error("❌ 요청이 서버에 도달하지 못함 (네트워크 문제 가능):", error.request);
        }

        throw new Error("AI 서버 전송 실패");
    }
}

module.exports = {sendMN}