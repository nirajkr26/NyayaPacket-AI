import { AuthUser, UserRole } from '../types';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'citizen' | 'lawyer';
  barCouncilId?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<{ user: AuthUser; message: string }> {
    return fetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginPayload): Promise<{ user: AuthUser; message: string }> {
    return fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<{ message: string }> {
    return fetchJson('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<{ user: AuthUser }> {
    return fetchJson('/api/auth/me', {
      method: 'GET',
    });
  },

  async pingCitizen(): Promise<{ message: string; role: UserRole }> {
    return fetchJson('/api/citizen/ping', {
      method: 'GET',
    });
  },

  async pingLawyer(): Promise<{ message: string; role: UserRole }> {
    return fetchJson('/api/lawyer/ping', {
      method: 'GET',
    });
  },
};
