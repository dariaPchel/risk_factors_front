import api from './axios';
import type { RiskFactor } from '../modules/mock';

export const getRiskFactorsApi = (maxAge?: number) =>
  api.get<{ data: RiskFactor[] }>('/risk_factors', { params: { maxAge } });

export const addRiskFactorApi = (formData: FormData) =>
  api.post<{ data: RiskFactor }>('/risk_factors', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const publishRiskFactorApi = (id: number, formData: FormData) =>
  api.put(`/risk_factors/${id}/publish`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteRiskFactorApi = (id: number) =>
  api.delete(`/risk_factors/${id}`);

export const likeRiskFactorApi = (id: number, action: 0 | 1) =>
  api.post(`/risk_factors/${id}/like`, { action });

export const loginApi = (credentials: { email: string; password: string }) =>
  api.post<{ access_token: string }>('/users/login', credentials);

export const logoutApi = () =>
  api.post('/users/logout');