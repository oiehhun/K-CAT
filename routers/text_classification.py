from fastapi import APIRouter
from pydantic import BaseModel
import torch
from transformers import BertForSequenceClassification
from kobert_tokenizer import KoBERTTokenizer

router = APIRouter(prefix="/text", tags=["Text Classification"])

# 모델 로드
model_checkpoint = "/home/k-cat/TH/K-CAT/lth/model_save/checkpoint-1548"
tokenizer = KoBERTTokenizer.from_pretrained("skt/kobert-base-v1")
model = BertForSequenceClassification.from_pretrained(model_checkpoint).to("cuda")
model.eval()

class TextRequest(BaseModel):
    texts: list[str]  # 리스트 형태로 입력 받음

def preprocess(chat):
    return "[CLS] " + " [SEP] ".join(chat) + " [SEP]"

def tokenize_function(text):
    return tokenizer(
        text, add_special_tokens=False, max_length=512, truncation=True, padding="max_length", return_tensors="pt"
    )

@router.post("/predict/")
async def predict(request: TextRequest):
    chat = preprocess(request.texts)
    tokenized_input = tokenize_function(chat)

    inputs = tokenized_input["input_ids"].to("cuda")
    attention_mask = tokenized_input["attention_mask"].to("cuda")

    with torch.no_grad():
        output = model(inputs, attention_mask=attention_mask)

    prediction = torch.argmax(output.logits, dim=-1).cpu().item()
    return {"prediction": prediction}
