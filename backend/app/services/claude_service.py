"""
Claude API 통합 서비스
"""
import json
import logging
from typing import Dict, Any, List, Optional

from anthropic import Anthropic

from app.core.config import settings
from app.prompts.system_prompt import SYSTEM_PROMPT, INTERPRET_PROMPT, COMPARE_PROMPT, get_context_prompt
from app.prompts.tools import TOOLS, execute_tool

logger = logging.getLogger(__name__)


class ClaudeService:
    """Claude API 서비스"""

    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            logger.warning("ANTHROPIC_API_KEY가 설정되지 않았습니다. AI 분석 기능이 제한됩니다.")
            self.client = None
        else:
            self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL

    def _check_client(self):
        """클라이언트 상태 확인"""
        if not self.client:
            raise ValueError("Claude API가 구성되지 않았습니다. ANTHROPIC_API_KEY를 설정해주세요.")

    async def interpret_results(
        self,
        context: Dict[str, Any],
        language: str = "ko"
    ) -> Dict[str, Any]:
        """시뮬레이션 결과 해석"""
        self._check_client()

        # 컨텍스트를 프롬프트로 변환
        context_prompt = get_context_prompt(context)

        # 언어별 지시
        lang_instruction = "한국어로 응답해주세요." if language == "ko" else "Please respond in English."

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"}  # Prompt Caching
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": f"{context_prompt}\n\n{INTERPRET_PROMPT}\n\n{lang_instruction}"
                    }
                ]
            )

            # 응답 파싱
            response_text = response.content[0].text

            # JSON 추출
            try:
                # JSON 블록 추출
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                else:
                    # JSON 객체 직접 찾기
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    json_str = response_text[json_start:json_end]

                result = json.loads(json_str)
                return result
            except json.JSONDecodeError:
                logger.error(f"JSON 파싱 실패: {response_text}")
                # 기본 응답 반환
                return {
                    "executive_summary": response_text[:500],
                    "key_findings": ["분석 결과를 확인해주세요"],
                    "recommendations": ["상세 분석이 필요합니다"],
                    "risk_assessment": "리스크 평가 진행 중",
                    "investment_grade": "B"
                }

        except Exception as e:
            logger.error(f"Claude API 호출 실패: {e}")
            raise

    async def chat(
        self,
        context: Dict[str, Any],
        messages: List[Dict[str, str]],
        language: str = "ko"
    ) -> Dict[str, Any]:
        """Q&A 채팅 (Tool Use 포함)"""
        self._check_client()

        # 컨텍스트 프롬프트
        context_prompt = get_context_prompt(context)

        # 시스템 메시지에 컨텍스트 포함
        system_with_context = f"{SYSTEM_PROMPT}\n\n## 현재 시뮬레이션 컨텍스트\n{context_prompt}"

        # 언어 지시
        lang_instruction = "\n\n한국어로 응답해주세요." if language == "ko" else "\n\nPlease respond in English."

        # 메시지 변환
        api_messages = []
        for msg in messages:
            api_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # 마지막 메시지에 언어 지시 추가
        if api_messages and api_messages[-1]["role"] == "user":
            api_messages[-1]["content"] += lang_instruction

        tool_results = []

        try:
            # 첫 번째 호출
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=[
                    {
                        "type": "text",
                        "text": system_with_context,
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                tools=TOOLS,
                messages=api_messages
            )

            # Tool Use 처리 루프
            while response.stop_reason == "tool_use":
                # Tool 호출 처리
                tool_use_block = None
                for block in response.content:
                    if block.type == "tool_use":
                        tool_use_block = block
                        break

                if tool_use_block:
                    # Tool 실행
                    tool_result = execute_tool(
                        tool_use_block.name,
                        tool_use_block.input
                    )
                    tool_results.append({
                        "tool": tool_use_block.name,
                        "input": tool_use_block.input,
                        "result": tool_result
                    })

                    # 대화에 Tool 결과 추가
                    api_messages.append({
                        "role": "assistant",
                        "content": response.content
                    })
                    api_messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use_block.id,
                                "content": json.dumps(tool_result, ensure_ascii=False)
                            }
                        ]
                    })

                    # 다시 호출
                    response = self.client.messages.create(
                        model=self.model,
                        max_tokens=2000,
                        system=[
                            {
                                "type": "text",
                                "text": system_with_context,
                                "cache_control": {"type": "ephemeral"}
                            }
                        ],
                        tools=TOOLS,
                        messages=api_messages
                    )

            # 최종 텍스트 응답 추출
            final_message = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_message += block.text

            return {
                "message": final_message,
                "tool_results": tool_results if tool_results else None
            }

        except Exception as e:
            logger.error(f"Claude API 채팅 호출 실패: {e}")
            raise

    async def compare_scenarios(
        self,
        scenarios: List[Dict[str, Any]],
        language: str = "ko"
    ) -> Dict[str, Any]:
        """시나리오 비교 분석"""
        self._check_client()

        # 시나리오 정보를 프롬프트로 구성
        scenarios_text = "## 비교 대상 시나리오\n\n"
        for i, scenario in enumerate(scenarios, 1):
            scenarios_text += f"### 시나리오 {i}: {scenario.get('name', f'Scenario {i}')}\n"
            if "input_summary" in scenario:
                inp = scenario["input_summary"]
                scenarios_text += f"- 용량: {inp.get('capacity_mw', 'N/A')} MW\n"
                scenarios_text += f"- 전력원: {inp.get('electricity_source', 'N/A')}\n"
                scenarios_text += f"- CAPEX: {inp.get('capex_billion', 'N/A')}억원\n"
            if "kpi_summary" in scenario:
                kpi = scenario["kpi_summary"]
                npv = kpi.get("npv", {})
                irr = kpi.get("irr", {})
                scenarios_text += f"- NPV (P50): {npv.get('p50_billion', 'N/A')}억원\n"
                scenarios_text += f"- IRR (P50): {irr.get('p50', 'N/A')}%\n"
                scenarios_text += f"- LCOH: {kpi.get('lcoh', 'N/A')}원/kg\n"
                scenarios_text += f"- DSCR: {kpi.get('dscr', {}).get('min', 'N/A')}\n"
            scenarios_text += "\n"

        lang_instruction = "한국어로 응답해주세요." if language == "ko" else "Please respond in English."

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": f"{scenarios_text}\n{COMPARE_PROMPT}\n\n{lang_instruction}"
                    }
                ]
            )

            response_text = response.content[0].text

            # JSON 추출
            try:
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                else:
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    json_str = response_text[json_start:json_end]

                result = json.loads(json_str)
                return result
            except json.JSONDecodeError:
                logger.error(f"비교 분석 JSON 파싱 실패: {response_text}")
                return {
                    "comparison_summary": response_text[:500],
                    "best_scenario": "분석 필요",
                    "trade_offs": ["상세 분석을 확인해주세요"],
                    "recommendation": "추가 검토가 필요합니다"
                }

        except Exception as e:
            logger.error(f"Claude API 비교 분석 호출 실패: {e}")
            raise

    async def explain_section(
        self,
        section: str,
        context: Dict[str, Any],
        language: str = "ko"
    ) -> Dict[str, Any]:
        """
        섹션별 간단한 설명 생성

        금융 전문가 관점에서 이해하기 쉽게 설명
        """
        self._check_client()

        # 섹션별 프롬프트 및 데이터 추출
        section_prompts = {
            "kpi": {
                "title": "핵심 지표 (KPI) 해석",
                "data_key": "kpi_summary",
                "focus": "NPV, IRR, DSCR, LCOH 등 핵심 재무지표가 프로젝트 파이낸스 관점에서 의미하는 바"
            },
            "npv_distribution": {
                "title": "NPV 분포 분석",
                "data_key": "kpi_summary",
                "focus": "몬테카를로 시뮬레이션 결과의 NPV 분포가 보여주는 리스크 프로파일"
            },
            "sensitivity": {
                "title": "민감도 분석 해석",
                "data_key": "sensitivity_summary",
                "focus": "토네이도 차트가 보여주는 핵심 리스크 요인과 NPV 변동 영향"
            },
            "waterfall": {
                "title": "리스크 폭포수 분석",
                "data_key": "risk_waterfall_summary",
                "focus": "각 리스크 요인이 NPV에 미치는 누적 영향"
            },
            "cashflow": {
                "title": "현금흐름 분석",
                "data_key": "cashflow_summary",
                "focus": "연간 현금흐름 패턴과 원리금 상환 능력, DSCR 추이"
            },
            "heatmap": {
                "title": "운영 패턴 분석",
                "data_key": "input_summary",
                "focus": "8760시간 운영 패턴이 보여주는 가동률과 생산 변동성"
            },
            "whatif": {
                "title": "What-if 분석 해석",
                "data_key": "sensitivity_summary",
                "focus": "민감도 분석, 2변수 분석, 시나리오 비교 결과가 의미하는 바와 의사결정에 주는 시사점"
            }
        }

        section_config = section_prompts.get(section, {
            "title": "분석 결과",
            "data_key": "kpi_summary",
            "focus": "시뮬레이션 결과 해석"
        })

        # 해당 섹션 데이터 추출
        section_data = context.get(section_config["data_key"], {})

        # KPI 요약 항상 포함 (참조용)
        kpi_summary = context.get("kpi_summary", {})
        input_summary = context.get("input_summary", {})
        financing_summary = context.get("financing_summary", {})

        explain_prompt = f"""당신은 프로젝트 파이낸스 전문 애널리스트입니다.

아래 시뮬레이션 데이터를 바탕으로 "{section_config['title']}"에 대해 설명해주세요.

## 분석 초점
{section_config['focus']}

## 프로젝트 개요
- 전해조 용량: {input_summary.get('capacity_mw', 'N/A')} MW
- 전력원: {input_summary.get('electricity_source', 'N/A')}
- 부채비율: {financing_summary.get('debt_ratio', input_summary.get('debt_ratio', 'N/A'))}%

## 핵심 KPI
{json.dumps(kpi_summary, ensure_ascii=False, indent=2)}

## 섹션 상세 데이터
{json.dumps(section_data, ensure_ascii=False, indent=2)}

## 응답 형식 (JSON)
반드시 아래 형식으로만 응답하세요:
```json
{{
  "section": "{section}",
  "title": "설명 제목 (간결하게)",
  "summary": "핵심 요약 1-2문장. 금융 비전문가도 이해할 수 있게.",
  "explanation": "상세 설명 (마크다운 형식). 금융 전문가처럼 분석하되 이해하기 쉽게 작성. 핵심 수치를 인용하여 구체적으로 설명. 3-4문단.",
  "key_insights": [
    "인사이트 1: 가장 중요한 발견",
    "인사이트 2: 리스크 관점의 시사점",
    "인사이트 3: Bankability 관점의 의미"
  ]
}}
```

중요:
- 전문 용어를 사용하되 괄호 안에 쉬운 설명 추가
- 숫자와 수치를 적극 인용하여 구체적으로 설명
- 금융기관(대출기관) 관점에서 어떻게 평가할지 포함
- 마크다운 형식으로 가독성 높게 작성
"""

        lang_instruction = "한국어로 응답해주세요." if language == "ko" else "Please respond in English."

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                system=[
                    {
                        "type": "text",
                        "text": "당신은 프로젝트 파이낸스 전문가입니다. 복잡한 재무 데이터를 이해하기 쉽게 설명하되, 전문성을 유지합니다.",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": f"{explain_prompt}\n\n{lang_instruction}"
                    }
                ]
            )

            response_text = response.content[0].text

            # JSON 추출
            try:
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                else:
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    json_str = response_text[json_start:json_end]

                result = json.loads(json_str)
                return result
            except json.JSONDecodeError:
                logger.error(f"섹션 설명 JSON 파싱 실패: {response_text}")
                return {
                    "section": section,
                    "title": section_config["title"],
                    "summary": "분석 결과를 확인해주세요.",
                    "explanation": response_text[:800],
                    "key_insights": ["상세 분석이 필요합니다."]
                }

        except Exception as e:
            logger.error(f"Claude API 섹션 설명 호출 실패: {e}")
            raise


# 싱글톤 인스턴스
claude_service = ClaudeService()
