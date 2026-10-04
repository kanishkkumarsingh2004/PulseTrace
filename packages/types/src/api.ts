export interface ApiResponseSuccess<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export interface ApiResponseError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;
