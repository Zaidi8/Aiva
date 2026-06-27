// Aiva — typed client-side fetch wrapper.
//
// Decodes the { data } | { error } envelope produced by lib/api/response.ts
// and throws ApiError on the error branch so callers can write:
//
//   try {
//     await apiPost('/api/patients', values);
//   } catch (e) {
//     if (e instanceof ApiError && e.fields) {
//       // field-level errors from a 422
//     }
//   }

"use client";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiBody<T> =
  | { data: T }
  | {
      error: {
        code: string;
        message: string;
        fields?: Record<string, string[]>;
      };
    };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as ApiBody<T>;
  if ("error" in body) {
    throw new ApiError(
      res.status,
      body.error.code,
      body.error.message,
      body.error.fields,
    );
  }
  return body.data;
}

export const apiGet = <T>(path: string) =>
  request<T>(path, { method: "GET" });
export const apiPost = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiPut = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path: string) =>
  request<void>(path, { method: "DELETE" });
