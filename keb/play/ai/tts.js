const express = requrire('express');
const axios = require("axios");

const fs = require("fs");
const FormData = require('form-data');

const app = express();
PORT = 9002;

app.post("/tts", async (req, res) => {
    sendToAIServer(req.body)
});

app.listen(PORT, () => {
    console.log(`✅ BERT 모델 서버가 http://localhost:${PORT}/AI/Bert.js 에서 실행 중`);

});

async function sendToAIServer(request) {
    /*let audio_api = {
        phone : data.phone, 
        audios: {
        filename: data.filename, 
        path: data.path, 
        time:data.time
    }};
    */
   let {phone_number, audios} = request;

    try {
        if (!audios.path) {
            throw new Error("이미지 경로가 제공되지 않았습니다.");
        }

        if (!fs.existsSync(audios.path)) {
            throw new Error(`파일이 존재하지 않습니다: ${audios.path}`);
        }

        if (fs.lstatSync(audios.path).isDirectory()) {
            throw new Error(`파일이 아닌 디렉토리를 전달할 수 없습니다: ${audioPath}`);
        }

        console.log("📂 전송할 이미지 경로:", audios.path);

        // FormData 생성
        const formData = new FormData();
        formData.append("file", fs.createReadStream(audios.path));
        
        const aiServerUrl = "http://121.161.212.97:53777/speech/transcribe/";
        console.log("🌍 AI 서버에 이미지 전송 중... URL:", aiServerUrl);

        const response = await axios.post(aiServerUrl, formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                });
        // alert.js 에 알람 전송하는 로직 작성해야 함
        
        console.log("✅ AI 서버 응답:", response.data);
        return response.data;

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
