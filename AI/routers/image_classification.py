import torch
import os
import time
import uvicorn
from fastapi import APIRouter, File, UploadFile
from PIL import Image
from io import BytesIO
from transformers import ViTImageProcessor, AutoModelForImageClassification

router = APIRouter(prefix="/image", tags=["Image Classification"])

# 모델 및 프로세서 로드
model_path = "./AI/models/vit-finetuned"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = AutoModelForImageClassification.from_pretrained(model_path).to(device)
processor = ViTImageProcessor.from_pretrained(model_path)

# 이미지 변환 함수
def transform_image(image: Image.Image):
    image = image.convert("RGB")
    inputs = processor(images=image, return_tensors="pt").to(device)
    return inputs

# 이미지 예측 함수
def predict(image: Image.Image):
    model.eval()  # 모델을 평가 모드로 설정
    inputs = transform_image(image)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_label = logits.argmax(-1).item()  

    return model.config.id2label[predicted_label]

# API 엔드포인트 설정
@router.post("/predict/")
async def classify_image(file: UploadFile = File(...)):
    os.system('clear')
    image = Image.open(BytesIO(await file.read()))
    image = image.rotate(90, expand=True)
    result = predict(image)
    print("===============실시간 이미지 선정성 분류 중...===============\n")
    if result == 'sfw':
        print("✅ 정상 사진 ✅\n")
    else:
        print("❌ 선정적 사진 ❌\n")
    
    return {"prediction": result}
