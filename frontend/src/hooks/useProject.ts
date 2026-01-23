import { useState, useCallback } from 'react';
import { projectsApi } from '../services/api';
import type { Project } from '../types';

interface UseProjectReturn {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (data: { name: string; description?: string; location?: string }) => Promise<Project>;
  updateProject: (id: string, data: { name?: string; description?: string; location?: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export function useProject(): UseProjectReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '프로젝트 목록 로드 중 오류가 발생했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await projectsApi.get(id);
      setCurrentProject(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '프로젝트 로드 중 오류가 발생했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(
    async (data: { name: string; description?: string; location?: string }) => {
      setLoading(true);
      setError(null);

      try {
        const project = await projectsApi.create(data);
        setProjects((prev) => [...prev, project]);
        return project;
      } catch (err) {
        const message = err instanceof Error ? err.message : '프로젝트 생성 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, data: { name?: string; description?: string; location?: string }) => {
      setLoading(true);
      setError(null);

      try {
        const updated = await projectsApi.update(id, data);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        if (currentProject?.id === id) {
          setCurrentProject(updated);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '프로젝트 수정 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentProject]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        await projectsApi.delete(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (currentProject?.id === id) {
          setCurrentProject(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '프로젝트 삭제 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentProject]
  );

  return {
    projects,
    currentProject,
    loading,
    error,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
  };
}
