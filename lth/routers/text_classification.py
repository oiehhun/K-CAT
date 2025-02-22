from fastapi import APIRouter
from pydantic import BaseModel
import torch
from transformers import BertForSequenceClassification
from kobert_tokenizer import KoBERTTokenizer
from collections import deque

router = APIRouter(prefix="/text", tags=["Text Classification"])

# 모델 로드
model_checkpoint = "/home/k-cat/TH/K-CAT/lth/models/kobert_finetuning"
tokenizer = KoBERTTokenizer.from_pretrained("skt/kobert-base-v1")
model = BertForSequenceClassification.from_pretrained(model_checkpoint).to("cuda")
model.eval()

def preprocess(chat):
    return "[CLS] " + " [SEP] ".join(chat) + " [SEP]"

def tokenize_function(text):
    return tokenizer(
        text, add_special_tokens=False, max_length=512, truncation=True, padding="max_length", return_tensors="pt"
    )

# 탐지 기준 및 윈도우 설정
skepticism = 3
window_num = 5
window_size = 10
detection_list = deque(maxlen=window_num)
chat_list = deque(maxlen=window_num)

class ChatText(BaseModel):
    text: list[str]

@router.post("/predict/")
async def predict(chat_text: ChatText):
    chat_text = [c.replace('\u200b', '') for c in chat_text.text]
    chat = preprocess(chat_text)
    tokenized_input = tokenize_function(chat)

    inputs = tokenized_input["input_ids"].to("cuda")
    attention_mask = tokenized_input["attention_mask"].to("cuda")

    with torch.no_grad():
        output = model(inputs, attention_mask=attention_mask)
    
    prediction = torch.argmax(output.logits, dim=-1).cpu().item()
    detection_list.append(prediction)
    print("===============실시간 온라인 그루밍 탐지===============")
    print('✅ 채팅 내용:', chat)
    print('✅ 최근 윈도우 예측:', detection_list)
    print('✅ 현재 채팅 예측:', prediction)
    print()

    # 윈도우 크기를 초과할 경우 채팅 저장(최근 윈도우 개수-1 만큼)
    if len(chat_text) == window_size:
        chat_list.append(chat_text[0])

    # 탐지 기준(skepticism) 초과 시
    if sum(detection_list) >= skepticism:
        # detection_list.clear()    # 탐지 시 deque 초기화
        report_prompt = list(chat_list) + chat_text[1:]
        print('🚨 푸시 알림 발송!')
        print('✅ 탐지된 윈도우 채팅:', report_prompt)
        print()
        return {"prediction": 1, "chat_text": report_prompt}
    
    return {"prediction": 0, "chat_text": None}
