from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import text_classification, image_classification, speech_to_text, report_generation

# FastAPI 인스턴스 생성
app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 추가
app.include_router(text_classification.router)
app.include_router(image_classification.router)
app.include_router(speech_to_text.router)
app.include_router(report_generation.router)

# 상태 체크 API
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# uvicorn main:app --reload
# uvicorn main:app --host 0.0.0.0 --port 53777 --reload