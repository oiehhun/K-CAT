const dbconnection = require('../config/db');
const mongoose = require("mongoose");
const express = require("express");
const axios = require("axios");
const fs = require('fs');
const path = require("path");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT_GET;

app.use(express.json());

let ReportDB;
let report_model;

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
}
const dbInitialized = initDB();

app.post("/review_report", async (req, res) => {
    try{
        await dbInitialized;

        let report = req.body;
        //mongodb에 report 저장
        let report_api = {
        phone : report.phone,
        reports : {
            title : path.join(report.time, "발생 보고서"),
            report : report.report,
            time : report.time
        }
        };
        let report_exist = report_model.findOne({phone : report.phone});
        if(!report_exist){
            new_report = new report_model(report_api);
            await new_report.save()
                .then(console.log("Report Save is Done"))
                .catch(err => console.log("Report Error:", err));
        }
        else{
            await report_model.repots.push(report_api.reports)
            .then(console.log("Report is added"))
            .catch(err => console.log("Report UPdate Error", err));
        }
    }
    catch (error) {
        console.error("Report 저장 오류:", error.message);
        res.status(500).json({ error: "Report 저장 오류"});
    }
    
});

app.get('/report', async (req, res) => {

    console.log("Request:", req.query);
    let phone_number = await req.query.phone;

    let report_available = report_model.findOne({phone : phone_number});
    
    // 받아야 하는 api
    if(!report_available){
        console.log("존재하는 리포트가 없습니다!");
    }
    else{
        let send_repo = {
            phone : report_available.phone,
            reports : report_available.report
        };
    
        console.log(send_repo);
        res.status(200).json(send_repo);    
    }
    console.log(report_repo.reports);

    
    
});

app.listen(PORT, () => {
    console.log(`Report 서버가 http://localhost:${PORT} 에서 실행 중`);
});