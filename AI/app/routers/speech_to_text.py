from fastapi import APIRouter, UploadFile, File, HTTPException
from pydub import AudioSegment
from openai import OpenAI
from dotenv import load_dotenv
import os
import tempfile
import time

router = APIRouter(prefix="/speech", tags=["Speech to Text"])

load_dotenv()
client = OpenAI()

SUPPORTED_FORMATS = {"flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"}

def convert_to_wav(input_file: str, output_file: str):
    """지원되지 않는 오디오 파일을 WAV 형식으로 변환"""
    audio = AudioSegment.from_file(input_file)
    audio.export(output_file, format="wav")

@router.post("/transcribe/")
async def transcribe_audio(file: UploadFile = File(...)):
    os.system('clear')
    file_ext = file.filename.split(".")[-1].lower()

    # 지원되지 않는 형식이면 오류 반환
    if file_ext not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {file_ext}")

    # 업로드된 파일을 임시 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as temp_audio:
        temp_audio.write(await file.read())
        temp_audio_path = temp_audio.name

    # 변환이 필요한 경우 WAV로 변환
    if file_ext != "wav":
        temp_wav_path = temp_audio_path.rsplit(".", 1)[0] + ".wav"
        convert_to_wav(temp_audio_path, temp_wav_path)
        os.remove(temp_audio_path)  # 원본 파일 삭제
    else:
        temp_wav_path = temp_audio_path

    try:
        with open(temp_wav_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(model="whisper-1", file=audio_file)
        
        print("===============음성 파일을 텍스트로 변환 중...===============\n")
        print('✅ 텍스트로 변환된 음성 파일:', transcription.text)
        time.sleep(4)
        return {"transcription": transcription.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        os.remove(temp_wav_path)  # 변환된 파일 삭제
