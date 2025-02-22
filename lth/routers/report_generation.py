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


router = APIRouter(prefix="/report", tags=["Report Generation"])

load_dotenv()
llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.1)

summary_prompt = PromptTemplate(
    template="온라인 그루밍 감지 보고서 작성을 위해 다음 대화를 간결하고 명확하게 요약하세요:\n{input}",
    input_variables=["input"],
)

report_prompt = PromptTemplate(
    template=(
        """
        다음 대화 요약과 템플릿을 바탕으로 보호자에게 전달할 간략한 보고서를 작성하세요.(**은 출력하지 마세요.)
        요약: {summary}

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
    input_variables=["summary", "date", "chat_platform", "predators_name", "child_name"],
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
    conversation_text = "\n".join(request.chat_text.text)
    document = Document(page_content=conversation_text)
    
    summary_chain = load_summarize_chain(llm, chain_type="stuff", prompt=summary_prompt, document_variable_name="input")
    summary = summary_chain.run([document])

    generate = RunnableLambda(lambda summary: llm.invoke(report_prompt.format(
        summary=summary,
        date=request.date,
        chat_platform=request.chat_platform,
        predators_name=request.predators_name,
        child_name=request.child_name,
    )))
    
    final_report = generate.invoke(summary)
    
    print("===============온라인 그루밍 의심 대화 리포트===============")
    print("📝 보고서 내용:\n",final_report.content)
    return {"report": final_report.content}