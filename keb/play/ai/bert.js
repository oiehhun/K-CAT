const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 9001;

app.use(express.json());

// ✅ AI 서버 응답 확인 API
app.post("/Bert", async (req, res) => {
    try {
        // text_process에서 전달받은 request 해체
        let { phone_number, nickname, message, time } = req.body
        console.log("📢 BERT 모델에 텍스트 분석 요청:", req.body);
        
        // 메세지큐 가공
        let data = { "text": message };
        
        const response = await axios.post("http://121.161.212.97:53777/text/predict/", data);
        console.log("✅ BERT 모델 응답:", response.data);

        let respose_data = res.status(200).json(response.data);
        
        if (respose_data.prediction == '1'){
            // alert.js 에 알람 전송하는 로직 작성해야 함
            let llm_api_component ={
                chat_text: respose_data.chat_text,
                date : time,
                chat_platform : 'katch',
                predators_name: '상대방',  //이거 생각해야 함
                child_name : '자녀'
            }
            let response = await axios.post("http://121.161.212.97:53777/report/generate/", llm_api_component);
            
            // !! response : LLM이 요약한 보고서 !!
            // text_process로 향함
            // text_process가 아닌  "./app.review_report.js"으로 보낸다
            
            let report = {
                phone : phone_number,
                date : time,
                report : response.data,
            }
            let response_report = await axios.post("http://localhost:9003/review_report", response.data);

            console.log("전달 보고서:", res.status(200).json(response.data));
        }
    } catch (error) {
        console.error("❌ BERT 모델 처리 오류:", error.message);
        res.status(500).json({ error: "BERT 모델 분석 중 오류 발생" });
    }
});

// ✅ AI 서버 실행
app.listen(PORT, () => {
    console.log(`✅ BERT 모델 서버가 http://localhost:${PORT}/AI/Bert.js 에서 실행 중`);
});
