from fastapi import APIRouter, UploadFile, File
import os
import torch
import torchvision.transforms as transforms
from PIL import Image
import torchvision.models as models
import torch.nn as nn

router = APIRouter(prefix="/image", tags=["Image Classification"])

# 모델 로드
model_path = "/home/k-cat/TH/K-CAT/lth/models/mobilenetv2_finetuning.pth"
if not os.path.exists(model_path):
    raise FileNotFoundError("❌ 모델 파일이 존재하지 않습니다.")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
model.classifier[1] = nn.Linear(model.last_channel, 2)
model.load_state_dict(torch.load(model_path, map_location=device))
model.to(device)
model.eval()

# 이미지 전처리
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def predict_image(image: Image.Image) -> str:
    image = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        output = model(image)
        _, predicted = torch.max(output, 1)
    return predicted.item()

@router.post("/predict/")
async def predict_nsfw(file: UploadFile = File(...)):
    # 🔹 파일을 BytesIO로 변환하여 처리
    content = await file.read()
    image = Image.open(file.file).convert("RGB")
    result = predict_image(image)
    return {"prediction": result}
