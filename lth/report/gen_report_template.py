from langchain_openai import ChatOpenAI
from langchain.chains.summarize import load_summarize_chain
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnableLambda
from dotenv import load_dotenv
load_dotenv()

with open("chat.txt", "r") as f:
    conversation_text = f.read()

document = Document(page_content=conversation_text)

# GPT 모델 설정
llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.1)

# 요약 프롬프트 설정
summary_prompt = PromptTemplate(
    template="온라인 그루밍 감지 보고서 작성을 위해 다음 대화를 간결하고 명확하게 요약하세요:\n{input}",
    input_variables=["input"]
)

# 보고서 프롬프트 설정
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
    input_variables=["summary", "date", "chat_platform", "predators_name", "child_name"]
)

# 요약 체인 생성
summary_chain = load_summarize_chain(
    llm,
    chain_type="stuff",
    prompt=summary_prompt,
    document_variable_name="input"
)

# 대화 요약 수행
summary = summary_chain.run([document])
print("\n================== 대화 요약 ==================")
print(summary)
print()

# 보호자 보고서 생성
data = "2025.02.14"
chat_platform = "카카오톡"
predators_name = "권규민"
child_name = "양은서"

generate_report = RunnableLambda(lambda summary: llm.invoke(report_prompt.format(
    summary=summary,
    date=data,
    chat_platform=chat_platform,
    predators_name=predators_name,
    child_name=child_name
)))

final_report = generate_report.invoke(summary)

print("================== 보호자 보고서 ==================")
print(final_report.content)
