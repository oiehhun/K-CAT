const mongoose = require("mongoose");

async function dbconnection() {
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
            console.log("✅ 이미 MongoDB에 연결됨");
            return {
                chat_userDB: mongoose.connection.useDb("chat_user_info"),
                chatDB: mongoose.connection.useDb("chat_repo"),
                userLoginDB: mongoose.connection.useDb("user_login"),
                ReportDB: mongoose.connection.useDb("report_repo"),
            };
        }

    try {
            await mongoose.connect("mongodb://localhost:27017", {
                // 5초 안에 연결되지 않으면 타임아웃
                serverSelectionTimeoutMS: 5000
            });
    
            console.log("✅ MongoDB 연결 성공");

            // 연결 후 각 DB 사용법
            return {
                chat_userDB: mongoose.connection.useDb("chat_user_info"),
                chatDB: mongoose.connection.useDb("chat_repo"),
                userLoginDB: mongoose.connection.useDb("user_login"),
                ReportDB: mongoose.connection.useDb("report_repo"),
            };
        } catch (err) {
            console.error("❌ MongoDB 연결 실패:", err);
            throw err;
        }
}

module.exports = dbconnection;