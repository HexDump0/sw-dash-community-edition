import type { QueueData, ReviewDetail, GitHubRepo, NotesState, ChecklistState, MyStats, ReviewStatus } from '../types';

const TOKEN_KEY = 'stardance.authToken';

export class ApiError extends Error {
  status: number;
  payload?: { error?: string; message?: string; status?: number };

  constructor(message: string, status: number, payload?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload as ApiError['payload'];
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (init?.headers) {
    const initHeaders = init.headers as Record<string, string>;
    for (const [k, v] of Object.entries(initHeaders)) {
      headers[k] = v;
    }
  }

  const resp = await fetch(path, { ...init, headers });
  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) {
    if (resp.status === 401) {
      setAuthToken(null);
    }
    throw new ApiError(
      (data.message as string) || `HTTP ${resp.status}`,
      resp.status,
      data
    );
  }
  return data as T;
}

export interface ReviewerInfo {
  name: string;
  slackUserId: string;
}

export interface LoginResponse {
  token: string;
  reviewer: ReviewerInfo;
}

export async function loginWithCurl(curl: string): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ curl }),
  });
}

export async function logout(): Promise<void> {
  try {
    await fetchJson('/api/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
}

export async function getMe(): Promise<ReviewerInfo> {
  return fetchJson<ReviewerInfo>('/api/me');
}

export async function getQueue(): Promise<QueueData> {
  return fetchJson<QueueData>('/api/queue');
}

export async function getReviewer(): Promise<ReviewerInfo> {
  return fetchJson<ReviewerInfo>('/api/reviewer');
}

export async function getReview(certId: number): Promise<ReviewDetail & { notes: NotesState; checklist: ChecklistState }> {
  return fetchJson<ReviewDetail & { notes: NotesState; checklist: ChecklistState }>(`/api/review/${certId}`);
}

export async function getGitHub(repoUrl: string | null): Promise<GitHubRepo | null> {
  if (!repoUrl) return null;
  try {
    return await fetchJson<GitHubRepo>(`/api/github?repoUrl=${encodeURIComponent(repoUrl)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getReadme(url: string | null): Promise<{ content: string } | null> {
  if (!url) return null;
  return fetchJson<{ content: string }>(`/api/readme?url=${encodeURIComponent(url)}`);
}

export async function claimReview(certId: number): Promise<{ status: number; location?: string; flash?: string; nextCertId?: number }> {
  return fetchJson(`/api/review/${certId}/claim`, { method: 'POST' });
}

export async function unclaimReview(certId: number): Promise<{ status: number; location?: string; flash?: string }> {
  return fetchJson(`/api/review/${certId}/claim`, { method: 'DELETE' });
}

export async function uploadVerdictVideo(
  certId: number,
  video: File,
  onProgress?: (percent: number) => void
): Promise<{ signedId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('video', video, video.name);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { signedId: string };
          resolve(data);
        } catch {
          reject(new ApiError('Invalid upload response', xhr.status));
        }
      } else {
        let message = `Upload failed (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText) as { message?: string; detail?: string | { message?: string } };
          if (typeof data.detail === 'object' && data.detail?.message) {
            message = data.detail.message;
          } else if (data.message) {
            message = data.message;
          }
        } catch {
          // ignore
        }
        reject(new ApiError(message, xhr.status));
      }
    });

    xhr.addEventListener('error', () => reject(new ApiError('Upload failed', 0)));
    xhr.addEventListener('abort', () => reject(new ApiError('Upload cancelled', 0)));

    xhr.open('POST', `/api/review/${certId}/video-upload`);
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(form);
  });
}

export async function submitVerdict(
  certId: number,
  status: 'approved' | 'returned',
  feedback: string,
  verdictVideoSignedId: string | null
): Promise<{ status: number; location?: string; flash?: string; nextCertId?: number }> {
  const params = new URLSearchParams();
  params.append('status', status);
  params.append('feedback', feedback);
  if (verdictVideoSignedId) {
    params.append('verdict_video_signed_id', verdictVideoSignedId);
  }
  return fetchJson(`/api/review/${certId}?${params.toString()}`, { method: 'PATCH' });
}

export async function getMyStats(): Promise<MyStats & { reviewer?: ReviewerInfo; payoutModal?: { minimum: number; unclaimed: number } }> {
  return fetchJson<MyStats & { reviewer?: ReviewerInfo; payoutModal?: { minimum: number; unclaimed: number } }>('/api/mystats');
}

export async function requestPayout(amount: number): Promise<{ status: number; location?: string; flash?: string }> {
  return fetchJson('/api/mystats/payout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
}

export async function getNotes(certId: number): Promise<NotesState> {
  return fetchJson<NotesState>(`/api/notes/${certId}`);
}

export async function saveNotes(certId: number, notes: NotesState): Promise<void> {
  await fetchJson(`/api/notes/${certId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(notes),
  });
}

export async function getChecklist(certId: number): Promise<ChecklistState> {
  return fetchJson<ChecklistState>(`/api/checklist/${certId}`);
}

export async function saveChecklist(certId: number, checkedItems: number[]): Promise<void> {
  await fetchJson(`/api/checklist/${certId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ checkedItems }),
  });
}

export interface FeedbackTemplate {
  id: number;
  label: string;
  body: string;
  createdAt: string;
}

export async function getFeedbackTemplates(): Promise<FeedbackTemplate[]> {
  const data = await fetchJson<{ templates: FeedbackTemplate[] }>('/api/feedback-templates');
  return data.templates || [];
}

export async function saveFeedbackTemplate(label: string, body: string): Promise<FeedbackTemplate> {
  const data = await fetchJson<{ template: FeedbackTemplate }>('/api/feedback-templates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label, body }),
  });
  return data.template;
}

export async function getReviewStatus(certId: number): Promise<ReviewStatus> {
  return fetchJson<ReviewStatus>(`/api/reviews/${certId}/status`);
}

export async function requestReview(certId: number): Promise<ReviewStatus> {
  return fetchJson<ReviewStatus>(`/api/reviews/${certId}`, { method: 'POST' });
}
