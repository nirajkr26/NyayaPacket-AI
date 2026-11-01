import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    details: any;
  };
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor to attach JWT token and Request-ID
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("nyayapacket_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.headers && !config.headers["X-Request-ID"]) {
      config.headers["X-Request-ID"] = crypto.randomUUID();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated 401s and normalize errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      // Clear token if expired or invalid
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
        localStorage.removeItem("nyayapacket_token");
        localStorage.removeItem("nyayapacket_user");
        window.dispatchEvent(new Event("auth:logout"));
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected network error occurred";

    return Promise.reject(new Error(message));
  }
);

export const api = {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.get<ApiResponse<T>>(url, config);
    return response.data;
  },

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  },

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  },

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  },

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.delete<ApiResponse<T>>(url, config);
    return response.data;
  },
};
