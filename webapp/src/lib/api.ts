export type ApiResponse<T> = {
  status: number;
  message?: string;
  data: T;
};

export type MaterialInfo = {
  provider: string;
  url: string;
  duration?: number;
};

export type VideoRequest = {
  video_subject: string;
  video_script: string;
  video_terms?: string;
  video_aspect: "9:16" | "16:9" | "1:1";
  video_concat_mode: "random" | "sequential";
  video_transition_mode?: string | null;
  video_clip_duration: number;
  video_count: number;
  video_source: "pexels" | "pixabay" | "local";
  video_materials?: MaterialInfo[] | null;
  video_language: string;
  voice_name: string;
  voice_volume: number;
  voice_rate: number;
  bgm_type: "none" | "random" | "custom";
  bgm_file: string;
  bgm_volume: number;
  subtitle_enabled: boolean;
  subtitle_position: "top" | "center" | "bottom" | "custom";
  custom_position: number;
  font_name: string;
  text_fore_color: string;
  text_background_color: boolean | string;
  font_size: number;
  stroke_color: string;
  stroke_width: number;
  paragraph_number: number;
};

export type ScriptResponse = {
  video_script: string;
};

export type TermsResponse = {
  video_terms: string[];
};

export type CreateTaskResponse = {
  task_id: string;
  request_id?: string;
  params?: Record<string, unknown>;
};

export type TaskState = -1 | 1 | 4 | number;

export type TaskRecord = {
  task_id: string;
  state: TaskState;
  progress: number;
  videos?: string[];
  combined_videos?: string[];
  script?: string;
  terms?: string[];
  error?: string;
  [key: string]: unknown;
};

export type TaskList = {
  tasks: TaskRecord[];
  total: number;
  page: number;
  page_size: number;
};

export type AssetFile = {
  name: string;
  size: number;
  file: string;
};

export type AssetList = {
  files: AssetFile[];
};

export type MeResponse = {
  authenticated: boolean;
  auth_enabled: boolean;
  id?: string;
  email?: string;
};

export type AiProviderKind = "openai" | "anthropic";

export type AiProvider = {
  id: string;
  user_id?: string;
  provider: AiProviderKind;
  label: string;
  model_name: string;
  base_url: string;
  enabled: boolean;
  is_default: boolean;
  key_source: "byok" | "platform";
  last_used_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AiProviderList = {
  providers: AiProvider[];
  auth_enabled: boolean;
};

export type AiQuota = {
  key_source: string;
  limit: number;
  used: number;
  remaining: number;
  auth_enabled: boolean;
};

export type AiProviderInput = {
  provider: AiProviderKind;
  api_key: string;
  label?: string;
  model_name?: string;
  base_url?: string;
  is_default?: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

function authHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers = new Headers(init?.headers);
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.message || `Erreur API ${response.status}`);
  }
  if (payload.status >= 400) {
    throw new Error(payload.message || "La requete API a echoue");
  }
  return payload.data;
}

export const api = {
  baseUrl: API_BASE_URL,
  async ping(token?: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks?page=1&page_size=1`, {
        headers: authHeaders(token)
      });
      if (!response.ok) return false;
      const payload = (await response.json().catch(() => null)) as ApiResponse<TaskList> | null;
      return Boolean(payload && payload.status < 400);
    } catch {
      return false;
    }
  },
  async pingDocs(): Promise<boolean> {
    try {
      await fetch(`${API_BASE_URL}/docs`, { method: "HEAD" });
      return true;
    } catch {
      return false;
    }
  },
  getMe(token?: string) {
    return request<MeResponse>("/api/v1/me", undefined, token);
  },
  getAiProviders(token?: string) {
    return request<AiProviderList>("/api/v1/ai/providers", undefined, token);
  },
  createAiProvider(input: AiProviderInput, token?: string) {
    return request<AiProvider>("/api/v1/ai/providers", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  updateAiProvider(providerId: string, input: Partial<AiProviderInput> & {
    enabled?: boolean;
    is_default?: boolean;
  }, token?: string) {
    return request<AiProvider>(`/api/v1/ai/providers/${providerId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
  },
  deleteAiProvider(providerId: string, token?: string) {
    return request<{ deleted: boolean }>(`/api/v1/ai/providers/${providerId}`, {
      method: "DELETE"
    }, token);
  },
  getAiQuota(token?: string) {
    return request<AiQuota>("/api/v1/ai/quota", undefined, token);
  },
  createScript(input: {
    video_subject: string;
    video_language: string;
    paragraph_number: number;
  }, token?: string) {
    return request<ScriptResponse>("/api/v1/scripts", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  createTerms(input: {
    video_subject: string;
    video_script: string;
    amount: number;
  }, token?: string) {
    return request<TermsResponse>("/api/v1/terms", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  createVideo(input: VideoRequest, token?: string) {
    return request<CreateTaskResponse>("/api/v1/videos", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },
  getTasks(page = 1, pageSize = 10, token?: string) {
    return request<TaskList>(`/api/v1/tasks?page=${page}&page_size=${pageSize}`, undefined, token);
  },
  getTask(taskId: string, token?: string) {
    return request<TaskRecord>(`/api/v1/tasks/${taskId}`, undefined, token);
  },
  deleteTask(taskId: string, token?: string) {
    return request<null>(`/api/v1/tasks/${taskId}`, { method: "DELETE" }, token);
  },
  getMaterials(token?: string) {
    return request<AssetList>("/api/v1/video_materials", undefined, token);
  },
  uploadMaterial(file: File, token?: string) {
    const data = new FormData();
    data.append("file", file);
    return request<{ file: string }>("/api/v1/video_materials", {
      method: "POST",
      body: data
    }, token);
  },
  getMusics(token?: string) {
    return request<AssetList>("/api/v1/musics", undefined, token);
  },
  uploadMusic(file: File, token?: string) {
    const data = new FormData();
    data.append("file", file);
    return request<{ file: string }>("/api/v1/musics", {
      method: "POST",
      body: data
    }, token);
  },
  async fetchMediaBlob(url: string, token?: string) {
    const response = await fetch(absoluteMediaUrl(url), {
      headers: authHeaders(token)
    });
    if (!response.ok) {
      throw new Error(`Media unavailable (${response.status})`);
    }
    return response.blob();
  }
};

export function absoluteMediaUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
