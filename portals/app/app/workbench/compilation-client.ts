"use client";
import {usePageRefresh} from "@bidproposal/shared/presentation";
import { productFetch } from "./product-fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CompilationBrief,
  CompilationList,
  WritingRequirements,
} from "@bidproposal/shared/compilations";
export async function compilationRequest<T>(
  id: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await productFetch(
    "/api/workbench/host/projects/" + encodeURIComponent(id) + "/" + path,
    {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: { "content-type": "application/json" },
    },
  );
  const value = await response.json();
  if (!response.ok)
    throw Error(
      value.message ||
        "\u7248\u672c\u64cd\u4f5c\u672a\u5b8c\u6210\uff0c\u8bf7\u91cd\u8bd5",
    );
  return value as T;
}
export function useCompilations(id?: string) {
  const [data, setData] = useState<CompilationList>(),
    [brief, setBrief] = useState<CompilationBrief>(),
    [loading, setLoading] = useState(false),
    [failed, setFailed] = useState(false);
  const generation = useRef(0),
    activeId = useRef(id);
  activeId.current = id;
  const loadedId=useRef<string|undefined>(undefined);
  const reload = useCallback(async () => {
    const sequence = ++generation.current;
    if(loadedId.current!==id){setData(undefined);setBrief(undefined);}
    setFailed(false);
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(loadedId.current!==id);
    try {
      const [list, requirements] = await Promise.all([
        compilationRequest<CompilationList>(id, "compilations"),
        compilationRequest<CompilationBrief>(id, "compilation-brief"),
      ]);
      if (sequence !== generation.current) return;
      loadedId.current=id;setData(list);
      setBrief(requirements);
    } catch {
      if (sequence === generation.current) setFailed(true);
    } finally {
      if (sequence === generation.current) setLoading(false);
    }
  }, [id]);
  usePageRefresh(reload);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const save = async (value: WritingRequirements, revision: number) => {
    if (!id) throw Error("Project unavailable");
    const result = await compilationRequest<CompilationBrief>(
      id,
      "compilation-brief",
      { method: "PUT", body: JSON.stringify({ value, revision }) },
    );
    if (activeId.current === id) setBrief(result);
  };
  return { data, brief, loading, failed, reload, save };
}
