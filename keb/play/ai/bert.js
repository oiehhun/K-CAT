const express = require("express");
const axios = require("axios");
const router = express.Router();

require('dotenv').config()

const app = express();
const PORT = process.env.PORT_BERT;

app.use(express.json());

// ✅ AI 서버 응답 확인 API
async function sendBert(req){
    console.log(`✅ BERT 모델 서버가 http://localhost에서 실행 중`);
    try {
        
        console.log("Data in bert", req);
        // text_process에서 전달받은 request 해체
        let { phone_number, nickname, message, time } = req
        console.log("📢 BERT 모델에 텍스트 분석 요청:", req);
        
        // 메세지큐 가공
        let data = { "text": message };
        
        const response = await axios.post(process.env.AI_SERVER_BERT, data);
        console.log("✅ BERT 모델 응답:", JSON.stringify(response.data));
        let respose_data = response.data;
        
        if (respose_data.prediction === 1){
            console.log("알람 발송 시작");
            // alert.js 에 알람 전송하는 로직 작성해야 함
            let alert_api = {
                phone :req.phone,
                message : "메세지 내역에서 위험상황 발생!"
            }
            // await 넣지 말고 끝내야 함
            let response_alert = axios.post("http://localhost:8000/app/check_alert",alert_api);
            console.log("response_alert", response_alert);
            let llm_api_component ={
                chat_text: {
                    "text" : respose_data.chat_text,
                },
                date : time,
                chat_platform : 'catch',
                predators_name: '상대방',  //이거 생각해야 함
                child_name : '자녀'
            }
            try{
                console.log("llm_api_component", llm_api_component);
                let response = await axios.post(process.env.AI_SERVER_LLM, llm_api_component);
                
                // llm에서 넘어올때
                // {
                //     report : string
                // }
                
                console.log("LLM response", response.data.report);
                // !! response : LLM이 요약한 보고서 !!
                // text_process로 향함
                // text_process가 아닌  "./app.review_report.js"으로 보낸다
                
                let report = {
                    phone : req.phone,
                    date : req.time,
                    report : response.data.report,
                }
                let response_report = await axios.post(process.env.REPORT_URL, report);
    
                console.log("전달 보고서:", response_report);
                
                return response.data.prediction;
            }
            catch(err){
                console.log("LLM 에러 메세지", err.message);
            }
            
        }
    } catch (error) {
        console.error("❌ BERT 모델 처리 오류:", error.message);
         // 🔍 에러 응답 상태 및 데이터 확인
        if (error.response) {
            console.error("❌ 서버 응답 상태 코드:", error.response.status);
            console.error("❌ 서버 응답 헤더:", error.response.headers);
            console.error("❌ 서버 응답 데이터:", util.inspect(error.response.data, { depth: 3, colors: true }));
            console.error("❌ 요청 데이터:", util.inspect(error.config.data, { depth: 3, colors: true }));
            console.error("❌ 요청 헤더:", util.inspect(error.config.headers, { depth: 3, colors: true }));
            console.error("❌ 요청 URL:", error.config.url);
        } else if (error.request) {
            console.error("❌ 요청이 서버에 도달했지만 응답이 없습니다.");
            console.error("❌ 요청 정보:", util.inspect(error.request, { depth: 2, colors: true }));
        } else {
            console.error("❌ 설정 오류 또는 네트워크 문제:", error.message);
        }
        
    }
};

module.exports = {sendBert};
