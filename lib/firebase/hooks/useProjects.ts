"use client";
import { useCallback, useEffect, useState } from "react";
import type { ProjectDoc } from "../services/projects";
import { createProject, deleteProject, listenProjects, updateProject } from "../services/projects";

export function useProjects(limitCount: number = 50, employeeIdFilter?: string) {
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = listenProjects((docs) => {
      setProjects(docs);
      setLoading(false);
    }, limitCount, employeeIdFilter);
    return () => unsub();
  }, [limitCount, employeeIdFilter]);

  return { projects, loading, error } as const;
}

export function useCreateProject() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (data: Omit<ProjectDoc, "id" | "createdAt" | "updatedAt">) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      const res = await createProject(data);
      setIsSuccess(true);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to create project");
      setError(err); throw err;
    } finally { setIsLoading(false); }
  }, []);

  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading: isLoading, error, isSuccess, reset } as const;
}

export function useUpdateProject() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (projectId: string, updates: Partial<ProjectDoc>) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      const res = await updateProject(projectId, updates);
      setIsSuccess(true);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to update project");
      setError(err); throw err;
    } finally { setIsLoading(false); }
  }, []);

  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading, error, isSuccess, reset } as const;
}

export function useDeleteProject() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = useCallback(async (projectId: string) => {
    setIsLoading(true); setError(null); setIsSuccess(false);
    try {
      await deleteProject(projectId);
      setIsSuccess(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to delete project");
      setError(err); throw err;
    } finally { setIsLoading(false); }
  }, []);

  const reset = useCallback(() => { setError(null); setIsSuccess(false); }, []);
  return { mutate, isLoading, error, isSuccess, reset } as const;
}


