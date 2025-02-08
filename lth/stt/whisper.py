from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

client = OpenAI()

audio_file= open("/home/xogns5037/stt/yes.mp3", "rb")
transcription = client.audio.transcriptions.create(
    model="whisper-1", 
    file=audio_file
)

print(transcription.text)