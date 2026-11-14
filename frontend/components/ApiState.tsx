"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export function useApiData<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = `${version}:${path}`;
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((data) => {
        if (active) setResult({ key, data, error: "" });
      })
      .catch((e) => {
        if (active) setResult({ key, data: null, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [path, key]);
  const current = result?.key === key ? result : null;
  return {
    data: current?.data || null,
    error: current?.error || "",
    loading: !current,
    reload: () => setVersion((v) => v + 1),
  };
}
export default function ApiState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry?: () => void;
}) {
  if (loading)
    return (
      <p role="status" className="p-6 text-muted">
        Memuat data…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="p-6 text-brand">
        {error}{" "}
        {retry && (
          <button className="underline" onClick={retry}>
            Coba lagi
          </button>
        )}
      </div>
    );
  return null;
}
