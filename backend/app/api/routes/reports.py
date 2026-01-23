"""리포트 생성 API 라우트"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

router = APIRouter()


@router.get("/{simulation_id}/pdf")
async def generate_pdf_report(simulation_id: str):
    """PDF 리포트 생성"""
    # 추후 PDF 생성 로직 구현
    # 현재는 더미 응답 반환
    content = f"Simulation Report for {simulation_id}".encode()
    buffer = io.BytesIO(content)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=report_{simulation_id}.pdf"
        },
    )


@router.get("/{simulation_id}/excel")
async def generate_excel_report(simulation_id: str):
    """Excel 리포트 생성"""
    # 추후 Excel 생성 로직 구현
    content = b"Excel content placeholder"
    buffer = io.BytesIO(content)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=report_{simulation_id}.xlsx"
        },
    )
