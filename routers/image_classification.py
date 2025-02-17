from fastapi import APIRouter, UploadFile, File
import os
import numpy as np
import cv2
import tensorflow as tf
from tensorflow import keras
from io import BytesIO

router = APIRouter(prefix="/image", tags=["Image Classification"])

# 모델 로드
model_path = "/home/k-cat/ES/K-CAT/yes/mobilenetv2_model.h5"
if not os.path.exists(model_path):
    raise FileNotFoundError("❌ 모델 파일이 존재하지 않습니다.")

model = keras.models.load_model(model_path)

img_size = (224, 224)

def predict_image(image: np.ndarray) -> str:
    img = cv2.resize(image, img_size)
    img = img / 255.0  # 정규화
    img = np.expand_dims(img, axis=0)

    prediction = model.predict(img)
    return "NSFW" if prediction[0][0] > 0.5 else "SFW"

@router.post("/predict/")
async def predict_nsfw(file: UploadFile = File(...)):
    contents = await file.read()
    image = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    if image is None:
        return {"error": "Invalid image file"}

    result = predict_image(image)
    return {"prediction": result}
