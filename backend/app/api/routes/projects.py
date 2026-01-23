"""프로젝트 관리 API 라우트"""
from typing import List
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException

from app.schemas.project import Project, ProjectCreate, ProjectUpdate

router = APIRouter()

# 임시 인메모리 저장소 (추후 DB로 대체)
projects_db: dict[str, Project] = {}


@router.post("", response_model=Project)
async def create_project(project: ProjectCreate) -> Project:
    """새 프로젝트 생성"""
    project_id = str(uuid.uuid4())
    now = datetime.utcnow()

    new_project = Project(
        id=project_id,
        name=project.name,
        description=project.description,
        location=project.location,
        created_at=now,
        updated_at=now,
    )

    projects_db[project_id] = new_project
    return new_project


@router.get("", response_model=List[Project])
async def list_projects() -> List[Project]:
    """프로젝트 목록 조회"""
    return list(projects_db.values())


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    """프로젝트 상세 조회"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    return projects_db[project_id]


@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project: ProjectUpdate) -> Project:
    """프로젝트 수정"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = projects_db[project_id]
    update_data = project.model_dump(exclude_unset=True)

    updated_project = Project(
        id=existing.id,
        name=update_data.get("name", existing.name),
        description=update_data.get("description", existing.description),
        location=update_data.get("location", existing.location),
        created_at=existing.created_at,
        updated_at=datetime.utcnow(),
    )

    projects_db[project_id] = updated_project
    return updated_project


@router.delete("/{project_id}")
async def delete_project(project_id: str) -> dict:
    """프로젝트 삭제"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")

    del projects_db[project_id]
    return {"message": "Project deleted successfully"}
