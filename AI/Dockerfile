# python 3.10 기반
FROM python:3.10

# container의 /app 디렉토리에서 진행
WORKDIR /usr/src/

# requirements.txt를 복사해서 넣기
COPY ./requirements.txt /usr/src/requirements.txt
# app 디렉토리를 복사해서 넣기
COPY ./app /usr/src/app

# pip 업그레이드
RUN pip install --no-cache-dir --upgrade pip
# GitHub에서 kobert-tokenizer 직접 설치
RUN pip install --no-cache-dir git+https://github.com/SKTBrain/KoBERT.git#egg=kobert_tokenizer&subdirectory=kobert_hf 
# requirements.txt에 있는 라이브러리 
RUN pip install -r requirements.txt

# container의 80번 포트를 열어서 서버를 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80", "--reload"]
