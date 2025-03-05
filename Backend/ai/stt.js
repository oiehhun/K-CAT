const express = require('express');
const axios = require("axios");

const fs = require("fs");
const FormData = require('form-data');
require('dotenv').config();

const app = express();
PORT = process.env.PORT_TTS;

app.post("/tts", async (req, res) => {
    sendToAIServer(req.body)
});

app.listen(PORT, () => {
    console.log(`✅ TTS 모델 서버가 http://localhost 에서 실행 중`);

});

async function sendSTT(request) {
   let {phone, name, audios} = request;
   
   console.log("Request in audio", request);

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
        
        const aiServerUrl = process.env.AI_SERVER_TTS;
        console.log("🌍 AI 서버에 오디오 전송 중... URL:", aiServerUrl);

        const response = await axios.post(aiServerUrl, formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                });
        // alert.js 에 알람 전송하는 로직 작성해야 함
        
        if (!response.data.transcription) {
            throw new Error("AI 서버 응답에 transcription이 없습니다.");
        }

        console.log("✅ TTS AI 서버 응답:", response.data.transcription);
        let audioTotext = {
            phone : phone,
            name : name,
            text :{
                Sender : request.nickname,
                time : audios.time,
                message : response.data.transcription
            }
        };
        console.log("오디오 파일 변환:", audioTotext);
        let res_sendaudiotoText = await axios.post(process.env.BERT_URL, audioTotext);
        
        return res_sendaudiotoText.data;

    } catch (error) {
        console.error("❌ TTS AI 서버 전송 오류:", error.message);

        if (error.response) {
            console.error("❌ AI 서버 응답 코드:", error.response.status);
            console.error("❌ AI 서버 응답 데이터:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error("❌ 요청이 서버에 도달하지 못함 (네트워크 문제 가능):", error.request);
        }

        throw new Error("AI 서버 전송 실패");
    }
}

module.exports = {sendTTS};