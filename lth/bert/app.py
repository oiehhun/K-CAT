from fastapi import FastAPI
from pydantic import BaseModel
import torch
from transformers import BertForSequenceClassification
from kobert_tokenizer import KoBERTTokenizer

# Initialize FastAPI app
app = FastAPI()

# Load the model and tokenizer
# model_checkpoint = "/home/k-cat/users/lth/model_save/checkpoint-2395" -> 2/12 고은비 수정
model_checkpoint = "/home/k-cat/K-CAT/lth/model_save/checkpoint-2395"
tokenizer = KoBERTTokenizer.from_pretrained('skt/kobert-base-v1')
model = BertForSequenceClassification.from_pretrained(model_checkpoint).to('cuda')
model.eval()

# Define the Pydantic model for incoming data
class TextRequest(BaseModel):
    texts: list[str]  # 리스트 형태로 입력 받음

# Pre-processing function
def preprocess(chat):
    text = "[CLS] "
    for message in chat:
        text += message + " [SEP] "
    return text.strip()

# Tokenization function
def tokenize_function(text):
    return tokenizer(
        text,
        add_special_tokens=False,
        max_length=512,
        truncation=True,
        padding="max_length",
        return_tensors="pt"
    )

# Prediction endpoint
@app.post("/predict/")
async def predict(request: TextRequest):
    chat = preprocess(request.texts)
    tokenized_input = tokenize_function(chat)

    # Move tensors to GPU
    inputs = tokenized_input['input_ids'].to('cuda')
    attention_mask = tokenized_input['attention_mask'].to('cuda')

    # Run the model
    with torch.no_grad():
        output = model(inputs, attention_mask=attention_mask)

    # Get prediction
    prediction = torch.argmax(output.logits, dim=-1).cpu().item()

    return {"prediction": prediction}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}
