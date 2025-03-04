from fastapi import APIRouter
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain.chains.summarize import load_summarize_chain
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnableLambda
from dotenv import load_dotenv
from typing import List
import warnings
warnings.filterwarnings("ignore")
import time
import os


router = APIRouter(prefix="/report", tags=["Report Generation"])

load_dotenv()
llm = ChatOpenAI(model_name="gpt-4o", temperature=0.1)

# 보고서 프롬프트 설정
parents_prompt = PromptTemplate(
    template=(
        """
        다음 채팅 내용과 템플릿을 바탕으로 보호자에게 전달할 간략한 보고서를 작성하세요.(참고: 마크다운 형식(볼드, 이탤릭 등을 작성하지 마세요.)
        채팅 내용: {input}
        
        "온라인 그루밍이 감지되었습니다"
        
        [온라인 그루밍 대화 의심 개요]
        - 발생 날짜 및 시간: {date}
        - SNS 플랫폼: {chat_platform}
        - 상대방 계정: {predators_name}
        - 자녀: {child_name}
        
        [대화 요약]
        
        [권고 사항]
        
        [대응 방안]
        
        [온라인 그루밍 피해 지원 기관 정보]
        - 디지털성범죄피해자지원센터(02-734-8994 365일 상담가능) : 피해접수, 상담, 유포 현황 모니터링, 수사·법률·의료 연계 지원 
        - 서울디지털성범죄 안심지원센터(02-815-0382/휴일, 야간 02-1366) : 상담지원, 수사지원, 법률지원, 심리상담지원, 의료 지원, 피해 촬영물 삭제 지원
        - 경찰청 사이버수사국(긴급신고 112, 365일 24시간 상담): 사이버범죄 신고시스템(신고·상담·제보)
        - 청소년사이버 상담센터(청소년전화 1388, 365일 24시간 상담): 온라인(채팅/게시판 등)·카카오톡 및 문자 상담
        """
    ),
    input_variables=["input", "date", "chat_platform", "predators_name", "child_name"]
)

children_prompt = PromptTemplate(
    template=(
        """
        다음 채팅 내용과 템플릿을 바탕으로 미성년자가 현재 채팅이 온라인 그루밍 상황임을 인지할 수 있는 간략한 문서를 작성하세요.(참고: 마크다운 형식(볼드, 이탤릭 등을 작성하지 마세요.)
        채팅 내용: {input}

        온라인 그루밍란,

        [온라인 그루밍 대화 의심 개요]
        - 발생 날짜 및 시간: {date}
        - SNS 플랫폼: {chat_platform}
        - 상대방 계정: {predators_name}

        [의심 대화]

        [권고 사항]

        [대응 방안]
        
        [온라인 그루밍 피해 지원 기관 정보]
        - 디지털성범죄피해자지원센터(02-734-8994 365일 상담가능) : 피해접수, 상담, 유포 현황 모니터링, 수사·법률·의료 연계 지원 
        - 서울디지털성범죄 안심지원센터(02-815-0382/휴일, 야간 02-1366) : 상담지원, 수사지원, 법률지원, 심리상담지원, 의료 지원, 피해 촬영물 삭제 지원
        - 경찰청 사이버수사국(긴급신고 112, 365일 24시간 상담): 사이버범죄 신고시스템(신고·상담·제보)
        - 청소년사이버 상담센터(청소년전화 1388, 365일 24시간 상담): 온라인(채팅/게시판 등)·카카오톡 및 문자 상담
        """
    ),
    input_variables=["input", "date", "chat_platform", "predators_name"],
)
    

class ChatText(BaseModel):
    text: List[str]

class ReportRequest(BaseModel):
    chat_text: ChatText
    date: str
    chat_platform: str
    predators_name: str
    child_name: str

@router.post("/generate/")
async def generate_report(request: ReportRequest):
    time.sleep(3)
    os.system('clear')
    print("========온라인 그루밍 의심 대화 리포트 생성 중...==========\n")
    conversation_text = "\n".join(request.chat_text.text)
    document = Document(page_content=conversation_text)
    
    # 보호자 보고서 체인 생성
    parents_chain = load_summarize_chain(
        llm,
        chain_type="stuff",
        prompt=parents_prompt,
        document_variable_name="input")
    # 보호자 보고서 수행
    parents_report = parents_chain.invoke({
        "input_documents": [document],
        "date": request.date,
        "chat_platform": request.chat_platform,
        "predators_name": request.predators_name,
        "child_name": request.child_name})


    # 자녀 보고서 체인 생성
    children_chain = load_summarize_chain(
        llm,
        chain_type="stuff",
        prompt=children_prompt,
        document_variable_name="input")
    # 자녀 보고서 수행
    children_report = children_chain.invoke({
        "input_documents": [document],
        "date": request.date,
        "chat_platform": request.chat_platform,
        "predators_name": request.predators_name})
    
    
    time.sleep(3)
    os.system('clear')
    print('✅ 보호자 보고서 생성 후 보호자 앱으로 전달 완료')
    print('✅ 자녀 보고서 생성 후 자녀 앱으로 전달 완료')
    print()
    return {"parents_report": parents_report["output_text"] + '\n\n', "children_report": children_report["output_text"] + '\n\n'}