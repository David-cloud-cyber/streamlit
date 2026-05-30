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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init.headers
        : {
            "Content-Type": "application/json",
            ...init?.headers
          }
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
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks?page=1&page_size=1`);
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
  createScript(input: {
    video_subject: string;
    video_language: string;
    paragraph_number: number;
  }) {
    return request<ScriptResponse>("/api/v1/scripts", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  createTerms(input: {
    video_subject: string;
    video_script: string;
    amount: number;
  }) {
    return request<TermsResponse>("/api/v1/terms", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  createVideo(input: VideoRequest) {
    return request<CreateTaskResponse>("/api/v1/videos", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getTasks(page = 1, pageSize = 10) {
    return request<TaskList>(`/api/v1/tasks?page=${page}&page_size=${pageSize}`);
  },
  getTask(taskId: string) {
    return request<TaskRecord>(`/api/v1/tasks/${taskId}`);
  },
  deleteTask(taskId: string) {
    return request<null>(`/api/v1/tasks/${taskId}`, { method: "DELETE" });
  },
  getMaterials() {
    return request<AssetList>("/api/v1/video_materials");
  },
  uploadMaterial(file: File) {
    const data = new FormData();
    data.append("file", file);
    return request<{ file: string }>("/api/v1/video_materials", {
      method: "POST",
      body: data
    });
  },
  getMusics() {
    return request<AssetList>("/api/v1/musics");
  },
  uploadMusic(file: File) {
    const data = new FormData();
    data.append("file", file);
    return request<{ file: string }>("/api/v1/musics", {
      method: "POST",
      body: data
    });
  }
};

export function absoluteMediaUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
