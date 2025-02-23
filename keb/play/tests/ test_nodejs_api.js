const request = require('supertest');
const app = require('../server'); // Express 서버 인스턴스
const mockChatData = require('./mock_data/chat_data.json');
const mockImageData = require('./mock_data/image_data.json');
const mockAudioData = require('./mock_data/audio_data.json');

// 🔍 채팅 데이터 테스트
describe('Node.js 서버 테스트', () => {
    it('POST /chat/text_process - 채팅 데이터 전송 테스트', async () => {
        const res = await request(app)
            .post('/chat/text_process')
            .send(mockChatData);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message');
        console.log(res.body.message);
    });

    it('POST /chat/image_process - 이미지 데이터 전송 테스트', async () => {
        const res = await request(app)
            .post('/chat/image_process')
            .send(mockImageData);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('image_result');
        console.log(res.body.image_result);
    });

    it('POST /chat/audio_process - 음성 데이터 전송 테스트', async () => {
        const res = await request(app)
            .post('/chat/audio_process')
            .send(mockAudioData);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('audio_result');
        console.log(res.body.audio_result);
    });
});
