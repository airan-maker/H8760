"""
Claude API 시스템 프롬프트 정의 - Bankability 중심
"""
from typing import Dict, Any


SYSTEM_PROMPT = """당신은 수소 전해조 프로젝트의 **Project Finance Bankability** 전문 분석가입니다.
프로젝트 파이낸스 관점에서 대출기관(Lender)과 투자자가 요구하는 수준의 심층 분석을 제공합니다.

## 핵심 역할
프로젝트의 **Bankability(금융조달 가능성)**를 평가하고, 이를 개선하기 위한 구체적인 방안을 제시합니다.

## Bankability 평가 프레임워크

### 1. DSCR (Debt Service Coverage Ratio) 분석
- **대출기관 최소 요구**: DSCR ≥ 1.30 (일반), ≥ 1.40 (신기술/고위험)
- **Lock-up Covenant**: DSCR < 1.15 시 배당 제한
- **Default Covenant**: DSCR < 1.05 시 채무불이행
- **P90 기준 DSCR**: 대출기관은 P90(보수적 시나리오) 기준 DSCR을 중시
- **평가 기준**:
  - DSCR(P50) ≥ 1.50, DSCR(P90) ≥ 1.30: 우수 (Investment Grade)
  - DSCR(P50) ≥ 1.35, DSCR(P90) ≥ 1.20: 양호 (Acceptable)
  - DSCR(P50) ≥ 1.20, DSCR(P90) ≥ 1.10: 주의 (Marginal)
  - DSCR(P50) < 1.20 또는 DSCR(P90) < 1.10: 위험 (Sub-investment Grade)

### 2. 현금흐름 안정성 (Cash Flow Stability)
- **Contracted Revenue %**: 장기 오프테이크 계약 비중 (목표 > 70%)
- **Price Escalation**: 물가연동 조항 유무
- **Volume Risk**: Take-or-Pay 조항, 최소 구매량 보장
- **Counterparty Credit**: 오프테이커 신용등급 (BBB- 이상 권장)

### 3. 기술 리스크 (Technology Risk)
- **Technology Readiness Level (TRL)**: TRL 9 (상용화 검증 완료) 필요
- **Track Record**: 최소 2년 이상 상업 운전 실적
- **Performance Guarantee**: EPC/O&M 업체 성능 보증
- **Stack Warranty**: 스택 수명 및 성능 저하 보증

### 4. 구조적 리스크 완화 (Structural Mitigants)
- **DSRA (Debt Service Reserve Account)**: 6개월분 원리금 적립
- **MRA (Maintenance Reserve Account)**: 주요 정비 비용 적립
- **Sponsor Support**: 완공보증, 자본금 추가 출자 의무

### 5. 주요 재무 Covenant
- **Leverage Ratio**: 부채/자기자본 ≤ 70:30 (프로젝트 파이낸스 표준)
- **LLCR (Loan Life Coverage Ratio)**: 대출 기간 중 현금흐름/부채 ≥ 1.40
- **PLCR (Project Life Coverage Ratio)**: 프로젝트 기간 중 현금흐름/부채 ≥ 1.50

### 6. Stress Test 시나리오
- **Base Case**: P50 시나리오
- **Downside Case**: 전력가격 +20%, 수소가격 -15%, 가동률 -10%
- **Severe Case**: 전력가격 +30%, 수소가격 -25%, 가동률 -15%
- **Bank Case**: P90 시나리오 (대출기관 기준)

## 도메인 지식

### 수소 프로젝트 파이낸스 특성
- **Tenor**: 일반적으로 12-18년 (전해조 수명의 60-70%)
- **Grace Period**: 건설기간 + 6-12개월
- **Interest Rate**: 기준금리 + 250-400bp (프로젝트 리스크에 따라)
- **Gearing**: 신규 기술은 60:40, 검증 기술은 70:30까지

### 한국 수소 시장 특수성
- **청정수소 인증제**: 2024년 시행, 청정수소 입찰시장 의무구매
- **수소발전 입찰시장**: 2025년부터 시행, 안정적 수요처
- **정부 보조금**: CAPEX 보조금, 운영 보조금 가능성
- **RE100/ESG**: 기업 RE100 이행으로 그린수소 수요 증가

### 세액공제 및 인센티브 체계
- **투자세액공제 (ITC)**: 조세특례제한법 기준 수소생산시설 투자 시 최대 10% 공제
- **생산세액공제 (PTC)**: 청정수소 생산량 기준 세액공제 (한국형 IRA 검토 중)
- **CAPEX 보조금**: 정부/지자체 설비투자 보조금 (사업별 상이)
- **운영 보조금**: 청정수소 발전 입찰제 등을 통한 수요 보장
- **탄소배출권**: K-ETS를 통한 탄소저감 인정, 배출권 판매 수익
- **청정수소 인증 프리미엄**: 인증 등급에 따른 판매가 프리미엄

### 인센티브의 Bankability 영향
- **ITC/보조금**: 실질 CAPEX 감소 → 부채 규모 감소 → DSCR 개선
- **PTC/운영보조금**: 운영 현금흐름 증가 → DSCR 직접 개선 (적용 기간 내)
- **탄소배출권**: 추가 수익원 → 현금흐름 안정성 개선
- **대출기관 관점**: 인센티브 확정성, 정책 지속성이 핵심 검토 사항

### LCOH 벤치마크
- **현재 그린수소**: 5,500-7,500원/kg (한국)
- **그레이수소**: 2,500-3,500원/kg (비교 대상)
- **2030년 목표**: 4,000원/kg (정부 목표)
- **Bankable LCOH**: 장기계약 시 6,000원/kg 이하 권장

## 분석 원칙

1. **Lender's Perspective**: 항상 대출기관의 보수적 관점에서 분석
2. **Downside Focus**: P90, P99 시나리오의 DSCR이 핵심
3. **Actionable Recommendations**: "~하면 좋다"가 아닌 "~해야 한다" 수준의 구체적 권고
4. **Quantified Impact**: 모든 권고사항에 예상 개선 효과 수치 제시
5. **Risk Mitigation Priority**: 가장 큰 리스크부터 순서대로 대응방안 제시

## 응답 형식
- 금액: 억원 (100,000,000원 = 1억원)
- DSCR: 소수점 둘째 자리 (예: 1.35)
- 비율: 소수점 첫째 자리 (예: 12.5%)
- 전문 용어: 영문 약어 사용 (DSCR, LLCR, DSRA 등)
"""


INTERPRET_PROMPT = """아래 시뮬레이션 결과를 **Bankability 관점**에서 분석해주세요.

## 분석 요청
다음 JSON 형식으로 정확히 응답해주세요:

```json
{
  "executive_summary": "Bankability 관점의 핵심 결론 (2-3문장)",
  "bankability_score": {
    "grade": "A/B/C/D 중 하나",
    "score": 0-100 점수,
    "summary": "등급 판단 근거 1문장"
  },
  "dscr_analysis": {
    "assessment": "DSCR 분석 결과 (P50, P90 기준 모두 언급)",
    "covenant_headroom": "Covenant 여유도 분석",
    "stress_resilience": "스트레스 시나리오 대응력"
  },
  "key_risks": [
    {
      "risk": "리스크명",
      "severity": "높음/중간/낮음",
      "impact": "DSCR 또는 NPV에 대한 영향",
      "mitigation": "구체적 완화 방안"
    }
  ],
  "bankability_improvements": [
    {
      "action": "개선 조치",
      "expected_impact": "예상 효과 (DSCR 개선폭, 금리 인하 등)",
      "priority": "필수/권장/선택",
      "implementation": "실행 방법"
    }
  ],
  "financing_recommendations": {
    "optimal_leverage": "권장 부채비율",
    "recommended_tenor": "권장 대출기간",
    "required_reserves": "필요 적립금 규모",
    "covenant_structure": "권장 Covenant 구조"
  },
  "lender_concerns": [
    "대출기관이 우려할 사항 1",
    "대출기관이 우려할 사항 2"
  ],
  "investment_readiness": "투자유치 준비도 평가와 다음 단계 권고"
}
```

## Bankability 등급 기준
- **A (Investment Grade)**: DSCR(P90) ≥ 1.30, 장기계약 ≥ 70%, 검증 기술
- **B (Acceptable)**: DSCR(P90) ≥ 1.20, 일부 구조적 보완 필요
- **C (Marginal)**: DSCR(P90) ≥ 1.10, 상당한 신용보강 또는 스폰서 지원 필요
- **D (Sub-investment)**: DSCR(P90) < 1.10, 현 구조로는 금융조달 어려움
"""


COMPARE_PROMPT = """아래 시나리오들을 **Bankability 개선 관점**에서 비교 분석해주세요.

```json
{
  "comparison_summary": "Bankability 관점 전체 비교 요약",
  "bankability_ranking": [
    {
      "rank": 1,
      "scenario": "시나리오명",
      "dscr_p90": "P90 DSCR",
      "bankability_grade": "A/B/C/D",
      "key_strength": "핵심 강점",
      "key_weakness": "핵심 약점"
    }
  ],
  "sensitivity_comparison": "시나리오별 리스크 민감도 비교",
  "optimal_structure": "최적의 구조 조합 제안",
  "recommendation": "금융조달 성공 가능성이 가장 높은 시나리오와 근거"
}
```
"""


def get_context_prompt(context: Dict[str, Any]) -> str:
    """시뮬레이션 컨텍스트를 Bankability 분석용 프롬프트로 변환"""
    input_summary = context.get("input_summary", {})
    kpi_summary = context.get("kpi_summary", {})
    sensitivity = context.get("sensitivity_summary", [])
    risk_waterfall = context.get("risk_waterfall_summary", [])
    cashflow = context.get("cashflow_summary", {})
    financing = context.get("financing_summary", {})
    incentives = context.get("incentives_summary", {})

    prompt_parts = ["## 프로젝트 개요\n"]

    # 프로젝트 규모 및 구조
    prompt_parts.append("### 프로젝트 규모")
    prompt_parts.append(f"- 전해조 용량: {input_summary.get('capacity_mw', 'N/A')} MW")
    prompt_parts.append(f"- 전해조 효율: {input_summary.get('efficiency', 'N/A')}%")
    prompt_parts.append(f"- CAPEX: {input_summary.get('capex_billion', 'N/A')}억원")
    prompt_parts.append(f"- 전력 조달: {input_summary.get('electricity_source', 'N/A')}")
    prompt_parts.append(f"- 프로젝트 기간: {input_summary.get('project_lifetime', 'N/A')}년")
    prompt_parts.append("")

    # 재무 구조
    prompt_parts.append("### 재무 구조")
    prompt_parts.append(f"- 부채비율: {financing.get('debt_ratio', input_summary.get('debt_ratio', 70))}%")
    prompt_parts.append(f"- 대출금리: {financing.get('interest_rate', input_summary.get('interest_rate', 5))}%")
    prompt_parts.append(f"- 대출기간: {financing.get('loan_tenor', input_summary.get('loan_tenor', 15))}년")
    prompt_parts.append(f"- 할인율(WACC): {input_summary.get('discount_rate', 'N/A')}%")
    prompt_parts.append("")

    # 수익 구조
    prompt_parts.append("### 수익 구조")
    prompt_parts.append(f"- 수소 판매가: {input_summary.get('h2_price', 'N/A')}원/kg")
    prompt_parts.append(f"- 연간 수소생산량 (P50): {kpi_summary.get('annual_h2_production', 'N/A')}톤")
    prompt_parts.append(f"- LCOH: {kpi_summary.get('lcoh', 'N/A')}원/kg")
    prompt_parts.append("")

    # 핵심 KPI - Bankability 관점
    prompt_parts.append("### 핵심 지표 (Bankability 관점)")
    npv = kpi_summary.get("npv", {})
    irr = kpi_summary.get("irr", {})
    dscr = kpi_summary.get("dscr", {})

    prompt_parts.append(f"#### DSCR (부채상환비율) - 가장 중요")
    prompt_parts.append(f"- DSCR 최소: {dscr.get('min', 'N/A')}")
    prompt_parts.append(f"- DSCR 평균: {dscr.get('avg', 'N/A')}")
    prompt_parts.append(f"- 대출기관 최소 요구(1.30) 대비: {'충족' if dscr.get('min', 0) >= 1.30 else '미달'}")
    prompt_parts.append("")

    prompt_parts.append(f"#### NPV (순현재가치)")
    prompt_parts.append(f"- P50: {npv.get('p50_billion', 'N/A')}억원")
    prompt_parts.append(f"- P90: {npv.get('p90_billion', 'N/A')}억원 (Downside)")
    prompt_parts.append(f"- P99: {npv.get('p99_billion', 'N/A')}억원 (Severe)")
    prompt_parts.append(f"- P50 대비 P90 하락률: {_calc_decline(npv.get('p50_billion'), npv.get('p90_billion'))}%")
    prompt_parts.append("")

    prompt_parts.append(f"#### IRR (내부수익률)")
    prompt_parts.append(f"- P50: {irr.get('p50', 'N/A')}%")
    prompt_parts.append(f"- P90: {irr.get('p90', 'N/A')}%")
    prompt_parts.append(f"- WACC({input_summary.get('discount_rate', 8)}%) 대비 Spread: {_calc_spread(irr.get('p50'), input_summary.get('discount_rate', 8))}%p")
    prompt_parts.append("")

    prompt_parts.append(f"#### 기타 지표")
    prompt_parts.append(f"- 회수기간: {kpi_summary.get('payback_years', 'N/A')}년")
    prompt_parts.append(f"- VaR 95%: {kpi_summary.get('var95_billion', 'N/A')}억원")
    prompt_parts.append("")

    # 민감도 분석 - Bankability 관점 재해석
    if sensitivity:
        prompt_parts.append("### 민감도 분석 (리스크 노출도)")
        # 영향도 순으로 정렬
        sorted_sens = sorted(sensitivity, key=lambda x: abs(x.get('high_change_pct', 0) - x.get('low_change_pct', 0)), reverse=True)
        for item in sorted_sens:
            var_name = item.get('variable', 'N/A')
            range_pct = abs(item.get('high_change_pct', 0) - item.get('low_change_pct', 0))
            prompt_parts.append(f"- **{var_name}**: NPV 변동폭 {range_pct}%p")
            if range_pct > 40:
                prompt_parts.append(f"  → 높은 리스크, 헤지/계약 보호 필수")
            elif range_pct > 20:
                prompt_parts.append(f"  → 중간 리스크, 모니터링 필요")
        prompt_parts.append("")

    # 리스크 폭포수
    if risk_waterfall:
        prompt_parts.append("### 리스크 영향도 (P50 → Downside)")
        for item in risk_waterfall:
            impact = item.get('impact_billion', 0)
            if impact < 0:
                prompt_parts.append(f"- {item.get('factor', 'N/A')}: {impact}억원")
        prompt_parts.append("")

    # 현금흐름 요약
    if cashflow:
        prompt_parts.append("### 현금흐름 프로파일")
        prompt_parts.append(f"- 총 투자금: {cashflow.get('total_investment_billion', 'N/A')}억원")
        prompt_parts.append(f"- 연평균 매출: {cashflow.get('avg_annual_revenue_billion', 'N/A')}억원")
        prompt_parts.append(f"- 연평균 OPEX: {cashflow.get('avg_annual_opex_billion', 'N/A')}억원")
        prompt_parts.append(f"- 부채상환 완료: {cashflow.get('debt_payoff_year', 'N/A')}년차")

        # 현금흐름 안정성 지표
        if cashflow.get('avg_annual_revenue_billion') and cashflow.get('avg_annual_opex_billion'):
            operating_margin = (1 - cashflow.get('avg_annual_opex_billion', 0) / max(cashflow.get('avg_annual_revenue_billion', 1), 1)) * 100
            prompt_parts.append(f"- 영업이익률: {operating_margin:.1f}%")
        prompt_parts.append("")

    # 인센티브 요약
    if incentives:
        prompt_parts.append("### 정부 지원 및 인센티브")

        # CAPEX 관련 인센티브
        capex_incentives = []
        if incentives.get('itc_enabled'):
            capex_incentives.append(f"투자세액공제(ITC) {incentives.get('itc_rate', 0)}% ({incentives.get('itc_amount_billion', 0)}억원)")
        if incentives.get('capex_subsidy_billion', 0) > 0:
            capex_incentives.append(f"설비투자 보조금 {incentives.get('capex_subsidy_billion', 0)}억원")

        if capex_incentives:
            prompt_parts.append(f"#### CAPEX 지원")
            for item in capex_incentives:
                prompt_parts.append(f"- {item}")
            prompt_parts.append(f"- **실질 CAPEX**: {incentives.get('effective_capex_billion', 'N/A')}억원 (원래 {input_summary.get('capex_billion', 'N/A')}억원)")
            prompt_parts.append("")

        # 운영 관련 인센티브
        operating_incentives = []
        if incentives.get('ptc_enabled'):
            operating_incentives.append(f"생산세액공제(PTC) {incentives.get('ptc_amount_per_kg', 0)}원/kg ({incentives.get('ptc_duration_years', 0)}년간)")
        if incentives.get('operating_subsidy_per_kg', 0) > 0:
            operating_incentives.append(f"운영 보조금 {incentives.get('operating_subsidy_per_kg', 0)}원/kg ({incentives.get('operating_subsidy_duration_years', 0)}년간)")
        if incentives.get('carbon_credit_enabled'):
            operating_incentives.append(f"탄소배출권 수익 {incentives.get('carbon_credit_price', 0)}원/kg")
        if incentives.get('clean_h2_certification_enabled'):
            operating_incentives.append(f"청정수소 인증 프리미엄 {incentives.get('clean_h2_premium', 0)}원/kg")

        if operating_incentives:
            prompt_parts.append(f"#### 운영 지원")
            for item in operating_incentives:
                prompt_parts.append(f"- {item}")
            prompt_parts.append("")

        # 인센티브가 있는 경우 Bankability 관점 코멘트
        if capex_incentives or operating_incentives:
            prompt_parts.append("#### Bankability 관점")
            if incentives.get('total_capex_reduction_billion', 0) > 0:
                reduction_pct = round(incentives.get('total_capex_reduction_billion', 0) / max(input_summary.get('capex_billion', 1), 1) * 100, 1)
                prompt_parts.append(f"- CAPEX {reduction_pct}% 감소 → 부채 규모 감소, DSCR 개선 효과")
            if operating_incentives:
                prompt_parts.append(f"- 운영 인센티브 → 적용 기간 내 현금흐름 안정화")
                prompt_parts.append(f"- 주의: 기간 제한 인센티브는 종료 후 현금흐름 변화 고려 필요")
            prompt_parts.append("")

    return "\n".join(prompt_parts)


def _calc_decline(p50, p90):
    """P50 대비 P90 하락률 계산"""
    if p50 and p90 and p50 != 0:
        return round((p50 - p90) / abs(p50) * 100, 1)
    return "N/A"


def _calc_spread(irr, wacc):
    """IRR과 WACC 스프레드 계산"""
    if irr and wacc:
        return round(irr - wacc, 1)
    return "N/A"
