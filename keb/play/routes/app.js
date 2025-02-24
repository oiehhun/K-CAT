// routes/chat.js
const dbconnection = require('../config/db');
const mongoose = require('mongoose');
const express = require("express");
const path = require('path');
const { app } = require('firebase-admin');
const { REFUSED } = require('dns');
const router = express.Router();

// chat/text_process.js에서 processText 함수 임포트
// 📌 JSON 데이터 처리를 위한 미들웨어 추가
router.use(express.json());

// * 해결 에러
/*
/home/dummy/keb/play/routes/app.js:118
    if(!report_available){
    ^

ReferenceError: report_available is not defined
    at /home/dummy/keb/play/routes/app.js:118:5
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

Node.js v22.14.0
*/

let ReportDB;
let report_model;
let userLoginDB;
let user_model;

const dbInitialized = initDB();

let alert_queue = [];

// ✅ 위험 대화 감지 여부 확인 API (Polling)
// 사용 안함
router.post("/check_alert", async (req, res) => {

    // 들어온 알람을 "모두 큐에 저장"
    // let alert_api = {
    //     phone : "전화번호",
    //     message : "bert/mn/tts 중 어디서 왔는지",
    // }

    // alert_api를 "queue"에 저장
    // polling이 올때마다 전송
    // 전송한 alert는 shift
    //console.log("🔍 전체 요청 데이터:", JSON.stringify(req.body, null, 2));

    let { phone, message  } = req.body; 
    console.log("🔍 전체 요청 데이터:", req.body);

    if (!phone || ! message) {
        return res.status(400).json({ error: "전화번호 / 알림 내용이 필요합니다." });
    }

    try{
        console.log("알람 발송 시작");
        alert_queue.push(message);
        let alert_made = {
            phone : phone,
            message : alert_queue
        };

    }
    catch(err){
        console.error("❌ 서버 오류:", err);
        res.status(500).json({ error: "서버 오류 발생" });
    }
});

router.post("/post_alert", async (req, res) => {
    console.log("request", req.body);
    let { phone, role } = req;
    try{
        if(alert_queue.length == 0){
            console.log("알람이 없습니다!");
            res.status(200).json({message : "알림이 없습니다"});
        }
        else{
            res.json({
                alert: true,
                message: alert_queue
            });
            alert_queue.shift();
        }
    }
    catch(err){
        console.log("Alert Error:", err);
    }
});

router.post("/save_report", async (req, res) => {
    try{
        await dbInitialized;

        let reports = req.body;
        //console.log("Request in save_report :", report);

        //mongodb에 report 저장
        let report_api = {
            phone : reports.phone,
            report : [{
                title : path.join(reports.date, "발생 보고서"),
                report : reports.report,
                time : reports.date
            }]
        };
        
        let { title, report, time } = report_api.report[0];

        console.log("Request in report_api 해체", title, report, time);
        console.log("Request in report_api", report_api.report);
        
        let report_repo_exist = await report_model.findOne({phone : reports.phone});
        if(!report_repo_exist){
            let new_report = new report_model({
                phone : reports.phone,
                reports : [{
                    title : title,
                    report : report,
                    time : time
                }] 
            });
            console.log("new report :", new_report.reports);
            await new_report.save()
                .then(console.log("Report Save is Done"))
                .catch(err => console.log("Report Error:", err));
        }
        else{
            report_repo_exist.reports.push({title : title, report : report, time : time})
            await report_repo_exist.save()
                .then(console.log("Report update is Done"))
                .catch(err => console.log("Report Error:", err));
        }
    }
    catch (error) {
        console.error("Report 저장 오류:", error.message);
        res.status(500).json({ error: "Report 저장 오류"});
    }
    
});

router.get('/report', async (req, res) => {

    console.log("Request in report:", req.query);
    let parent_phone_number = await req.query.phone;
    
    // 부모의 전화번호를 통해 children_phone get
    let parent_user = await user_model.findOne({ phone: parent_phone_number});
    if (!parent_user) {
        console.log("존재하는 부모 사용자가 없습니다!");
        return res.status(404).json({ message: "존재하는 부모 사용자가 없습니다!" });
    }

    let children_phones = parent_user.children_phone;
        console.log("자녀 전화번호 목록:", children_phones);

    if (!children_phones || children_phones.length === 0) {
        console.log("등록된 자녀 전화번호가 없습니다!");
        return res.status(200).json({ message: "등록된 자녀 전화번호가 없습니다!" });
    }

    // get한 자식 번호를 통해 report repo 가져오기
    let report_available = await report_model.findOne({phone :  { $in: children_phones }});

    // 받아야 하는 api
    if(!report_available){
        console.log("존재하는 리포트가 없습니다!");
        res.status(200).json({ message : "존재하는 리포트가 없습니다!"});
    }
    else{
        console.log("Report for send:", report_available.reports);

        let send_repo = {
            phone : report_available.phone,
            report : report_available.reports
        };
    
        console.log("Send Report:", send_repo);
        res.status(200).json(send_repo);    
    }
    
    
});

router.get('/report_detail', async(req, res)=>{
    let phone_number = req.query.phone;
    let title = req.query.title;
    
    let report_list = await report_model.findOne({phone : phone_number});
    let matchedReport = report_list.reports.find(report => report.title === title);

    console.log("request, list", req.query, matchedReport );
    res.status(200).json(matchedReport.report);  
})

async function initDB() {
    try {
        if (!ReportDB) {
            const dbConnections = await dbconnection();
            ReportDB = dbConnections.ReportDB;
        }

        // 모델이 이미 존재하면 재등록 방지
        if (!mongoose.models.report_model) {
            report_model = ReportDB.model("Report", new mongoose.Schema({
                phone: { type: String, required: true },
                reports : [{
                    title : {type : String, require: true},
                    report : {type : String, require: true},
                    time : {type:Date, default : Date.now}
                }]
            }, { collection: "report_repo" }));
        } else {
            report_model = mongoose.models.Report; // ✅ 기존 모델 재사용
        }
        console.log("✅ MongoDB 모델 등록 완료");

    } catch (error) {
        console.error("❌ initDB() 오류:", error.message);
        throw new Error("DB 초기화 중 오류 발생");
    }
    try{
        if (!userLoginDB) {
            const dbConnections = await dbconnection();
            userLoginDB = dbConnections.userLoginDB;
        }
        // ✅ User Model 정의
        if (!mongoose.models.user_model) {
            user_model = userLoginDB.model("User", new mongoose.Schema({
                phone: { type: String, required: true, unique: true },
                role: { type: String, required: true },
                children_phone: { type: [String] }
            }, { collection: "login" }));
        } else {
            user_model = mongoose.models.user_model;
        }
    }
    catch(error) {
        console.error("❌ initDB() 오류:", error.message);
        throw new Error("DB 초기화 중 오류 발생");
    }
    
}

// ✅ 올바르게 Router 내보내기
module.exports = router;