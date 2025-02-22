from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os

router = APIRouter(prefix="/speech", tags=["Speech to Text"])

load_dotenv()
client = OpenAI()

@router.post("/transcribe/")
async def transcribe_audio(file: UploadFile = File(...)):
    file_path = f"/tmp/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(model="whisper-1", file=audio_file)

    os.remove(file_path)
    return {"transcription": transcription.text}
