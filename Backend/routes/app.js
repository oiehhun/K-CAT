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

let alert_queue_parent = [];
let alert_queue_children = [];

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
    console.log("🔍 전체 요청 데이터:", req.body.message);

    /*
    if (!phone || ! message) {
        return res.status(400).json({ error: "전화번호 / 알림 내용이 필요합니다." });
    }*/
    console.log("알람 발송 시작");
    alert_queue_parent.push(message);
    alert_queue_children.push(message);
        /*
    try{
        console.log("알람 발송 시작");
        alert_queue_parent.push(message);
        alert_queue_children.push(message);
        let alert_made = {
            phone : phone,
            message : alert_queue
        };
    }
    catch(err){
        console.error("❌ 서버 오류:", err);
        res.status(500).json({ error: "서버 오류 발생" });
    }
        */
});

router.post("/post_alert", async (req, res) => {
    console.log("request", req.body);
    let { phone, role } = req;
    
    let user = await user_model.findOne({phone : req.body.phone});

    try{
        if(user.role === 'parent'){
            if(alert_queue_parent.length == 0){
                console.log("알람이 없습니다!");
                res.status(200).json({message : "알림이 없습니다"});
            }
            else{
                res.json({
                    alert: true,
                    message: alert_queue_parent
                });
                alert_queue_parent.shift();
            }
        }
        else if(user.role === 'children'){
            if(alert_queue_children.length == 0){
                console.log("알람이 없습니다!");
                res.status(200).json({message : "알림이 없습니다"});
            }
            else{
                res.json({
                    alert: true,
                    message: alert_queue_children
                });
                alert_queue_children.shift();
            }
        }
    }
    catch(err){
        console.log("Alert Error:", err);
    }
});

router.post("/save_report", async (req, res) => {
    try{
        await dbInitialized;

        /*
        let report = {
                    phone : req.phone,
                    date : req.time,
                    report_list : {
                        parents_report: response.data.parents_report,
                        children_report: response.data.children_report
                    }
                }
        */
   
        let reports = req.body;
        console.log("Request in save_report :", reports);

        //mongodb에 report 저장
        let report_api = {
            phone : reports.phone,
            report : [{
                parent_report : {
                    title : path.join(reports.date, "발생 보고서"),
                    report : reports.report_list.parents_report,
                    time : reports.date
                },
                children_report :{
                    title : path.join(reports.date, "발생 보고서"),
                    report : reports.report_list.children_report,
                    time : reports.date
                }
            }]
        };
        console.log(`Report_api: ${report_api.report[0]}`);
        let { parent_report, children_report } = report_api.report[0];
        
        console.log("Request in report_api 해체", children_report.title, parent_report.report, parent_report.time);
        console.log("Request in report_api", children_report.report);
        
        // parent_report, children_report 사용
        let report_repo_exist = await report_model.findOne({phone : req.body.phone});
        if(!report_repo_exist){
            let new_report = new report_model({
                phone : req.body.phone,
                report : [{
                    parent_report : parent_report,
                    children_report :children_report
                }] 
            });
            console.log("new report :", new_report.reports);
            await new_report.save()
                .then(console.log("Report Save is Done"))
                .catch(err => console.log("Report Error:", err));
        }
        else{
            console.log(`remind two reports :
                ${parent_report.report}, 
                ${children_report.report}`)
            report_repo_exist.report.push(
                {
                    parent_report: parent_report,
                    children_report: children_report
                })
            await report_repo_exist.save()
                .then(() => {
                    console.log("Report update is Done");
                    res.status(200).json({messsage : "Report update is Done"});
                })
                .catch(err => console.log("Report Error:", err));
        }
    }
    catch (error) {
        console.error("Report 저장 오류:", error.message);
        res.status(500).json({ error: "Report 저장 오류"});
    }
    
});

router.get('/report_parent', async (req, res) => {

    /*
    let report = {
                    phone : req.phone,
                    date : req.time,
                    report_list : {
                        parents_report: response.data.parents_report,
                        children_report: response.data.children_report
                    }
                }
    */
   /*
   let report_available = await report_model.findOne(
            { phone: { $in: children_phones } },
            { phone: 1, "report.parent_report.title": 1 }
   */
    console.log("Request in Parent report:", req.query);
    let request_phone_number = req.query.phone;

    // 요청된 번호가 부모 전화번호인지 자녀 전화번호인지 확인
    let parent_user = await user_model.findOne({ phone: request_phone_number, role: "parent" });
    
    // 🧾 [Case 1] 부모 전화번호인 경우
    if (parent_user) {
        console.log("부모 전화번호로 보고서 조회를 시도합니다.");

        let children_phones = parent_user.children_phone;
        console.log("자녀 전화번호 목록:", children_phones);

        if (!children_phones || children_phones.length === 0) {
            console.log("등록된 자녀 전화번호가 없습니다!");
            return res.status(200).json({ message: "등록된 자녀 전화번호가 없습니다!" });
        }

        // 자녀 전화번호를 통해 보고서 가져오기
        let report_available = await report_model.findOne(
            { phone: { $in: children_phones } },
            { phone: 1, "report.parent_report.title": 1 }
        );

        if (!report_available) {
            console.log("존재하는 리포트가 없습니다!");
            return res.status(200).json({ message: "존재하는 리포트가 없습니다!" });
        }

        if (report_available) {
            console.log("Report for send:", report_available);

            let send_repo = {
                phone: report_available.phone, // phone 필드 올바르게 참조
                report: report_available.report.map(r => r.parent_report) // parent_report를 배열로 추출
            };
            
            console.log("Send Report:", send_repo);
            return res.status(200).json(send_repo);
        }
    } else {
        console.log("부모 사용자로 확인되지 않음. 자녀 전화번호로 보고서 조회를 시도합니다.");
    }
});

router.get('/report_children', async (req, res) =>{
    // 🧾 [Case 2] 자녀 전화번호로 직접 보고서 조회
    console.log("Request in children report:", req.query);
    let request_phone_number = req.query.phone;
    let parent_from_child = await user_model.findOne({ children_phone: request_phone_number });

    if (!parent_from_child) {
        console.log("해당 자녀 전화번호와 연결된 부모 사용자가 없습니다!");
        return res.status(404).json({ message: "해당 자녀 전화번호와 연결된 부모 사용자가 없습니다!" });
    }

    console.log("자녀 전화번호를 통해 보고서 조회를 시도합니다.");

    // 자녀 전화번호로 보고서 가져오기
    let report_available = await report_model.findOne(
        { phone: request_phone_number },
        { phone: 1, "report.children_report.title": 1 }
    );

    if (!report_available) {
        console.log("존재하는 리포트가 없습니다!");
        return res.status(200).json({ message: "존재하는 리포트가 없습니다!" });
    }

    let send_repo = {
                phone: report_available.phone, // phone 필드 올바르게 참조
                report: report_available.report.map(r => r.children_report) // parent_report를 배열로 추출
            };

    console.log("Send Report:", send_repo);
    return res.status(200).json(send_repo);
});

router.get('/report_detail_parent', async (req, res) => {
    console.log("Request in report_parent:", req.query);
    let request_phone_number = req.query.phone;
    let title = req.query.title;

    let parent_user = await user_model.findOne({ phone: request_phone_number });
    
    if (parent_user) {
        console.log("부모 전화번호로 보고서 상세내역 조회를 시도합니다.");

        let children_phones = parent_user.children_phone;
        console.log("자녀 전화번호 목록:", children_phones);

        if (!children_phones || children_phones.length === 0) {
            console.log("등록된 자녀 전화번호가 없습니다!");
            return res.status(200).json({ message: "등록된 자녀 전화번호가 없습니다!" });
        }

        let report_list = await report_model.findOne(
            { phone: { $in: children_phones } },
            { phone: 1, "report.parent_report": 1 }
        );

        console.log("parent_report_list", report_list);

        if (!report_list || !report_list.report) {
            console.log("존재하는 리포트가 없습니다!");
            return res.status(200).json({ message: "존재하는 리포트가 없습니다!" });
        }

        let matchedReport = report_list.report.find(report => report.parent_report?.title === title);

        console.log("request, list", req.query.title, matchedReport);

        if (!matchedReport) {
            console.log("해당 제목의 리포트를 찾을 수 없습니다!");
            return res.status(200).json({ message: "해당 제목의 리포트를 찾을 수 없습니다!" });
        }

        res.status(200).json({
            report: matchedReport.parent_report.report,
            time: matchedReport.parent_report.time
        });

    } else {
        console.log("존재하는 리포트가 없습니다!");
        return res.status(200).json({ message: "존재하는 리포트가 없습니다!" }); 
    }
});

router.get('/report_detail_children', async(req, res)=>{
    console.log("Request in report_children:", req.query);
    let request_phone_number = req.query.phone;
    let title = req.query.title;
        
    let report_list = await report_model.findOne(
        { phone: request_phone_number },
        { phone: 1, "report.children_report": 1 }
    );

    let matchedReport = report_list.report.find(report => report.children_report?.title === title);

    console.log("request, list : Children", req.query.title, matchedReport);

    if (!matchedReport) {
        console.log("해당 제목의 리포트를 찾을 수 없습니다!");
        return res.status(200).json({ message: "해당 제목의 리포트를 찾을 수 없습니다!" });
    }

    res.status(200).json({
        report: matchedReport.children_report.report,
        time: matchedReport.children_report.time
    });
    
    /*
    let matchedReport = report_list.report.find(report => report.parent_report?.title === title);

    console.log("request, list", req.query.title, matchedReport.parent_report);

    if (!matchedReport) {
        console.log("해당 제목의 리포트를 찾을 수 없습니다!");
        return res.status(200).json({ message: "해당 제목의 리포트를 찾을 수 없습니다!" });
    }    
    res.status(200).json({report:matchedReport.parent_report});
    */
});

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
                report : [{
                    parent_report : {
                        title : { type: String, required: true },
                        report : { type: String, required: true },
                        time : { type: Date, default: Date.now }
                    },
                    children_report :{
                        title : { type: String, required: true },
                        report : { type: String, required: true },
                        time : { type: Date, default: Date.now }
                    }
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