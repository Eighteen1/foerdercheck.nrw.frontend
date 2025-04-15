const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    VERIFY: (token: string) => `${API_BASE_URL}/api/auth/verify/${token}`,
    VALIDATE: `${API_BASE_URL}/api/auth/validate`,
    LOGIN_WITH_TOKEN: (token: string) => `${API_BASE_URL}/api/auth/login/${token}`,
  },
  FORMS: {
    SAVE: (formType: string) => `${API_BASE_URL}/api/forms/${formType}`,
    GET: (formType: string) => `${API_BASE_URL}/api/forms/${formType}`,
  },
  DOCUMENTS: {
    UPLOAD: `${API_BASE_URL}/api/documents`,
    GET: (formType?: string) => 
      formType 
        ? `${API_BASE_URL}/api/documents?form_type=${formType}`
        : `${API_BASE_URL}/api/documents`,
    DELETE: (documentId: number) => `${API_BASE_URL}/api/documents/${documentId}`,
  },
  DOCUMENT_CHECK: {
    LOAD: `${API_BASE_URL}/api/document-check/load`,
    SAVE: `${API_BASE_URL}/api/document-check/save`,
  },
  ELIGIBILITY: {
    CHECK: `${API_BASE_URL}/api/check-eligibility`,
  },
}; 