import { config } from '../../config';
import { getAuthToken } from '../auth/storage';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Standard fetch wrapper connecting frontend services to the backend API.
 */
async function request(path, { method = 'GET', params, body } = {}) {
  const baseUrl = (config.apiBaseUrl || '/api').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = baseUrl + cleanPath;

  const url = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
    ? new URL(fullPath)
    : new URL(fullPath, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { Accept: 'application/json' };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    let errorMsg = res.statusText;
    if (data && typeof data === 'object') {
      if (data.detail) {
        errorMsg = data.detail;
      } else if (data.message) {
        errorMsg = data.message;
      } else if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
        errorMsg = data.non_field_errors[0];
      } else {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          errorMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
        }
      }
    }
    throw new ApiError(errorMsg, res.status, data);
  }

  return data;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
