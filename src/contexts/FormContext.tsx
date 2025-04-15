import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface FormData {
  [key: string]: any;
}

interface Form {
  id: number;
  form_type: string;
  data: FormData;
  progress: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  is_verified: boolean;
  uploaded_at: string;
  form_id?: number;
}

interface FormContextType {
  forms: { [key: string]: Form };
  documents: Document[];
  loading: boolean;
  error: string | null;
  saveForm: (formType: string, data: FormData, progress: number) => Promise<void>;
  uploadDocument: (file: File, formType?: string) => Promise<void>;
  deleteDocument: (documentId: number) => Promise<void>;
  getForm: (formType: string) => Promise<Form>;
  getDocuments: (formType?: string) => Promise<Document[]>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [forms, setForms] = useState<{ [key: string]: Form }>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const saveForm = async (formType: string, data: FormData, progress: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:8000/api/forms/${formType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form_type: formType,
          data,
          progress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save form');
      }

      const form = await response.json();
      setForms(prev => ({
        ...prev,
        [formType]: form,
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, formType?: string) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      if (formType) {
        formData.append('form_type', formType);
      }

      const response = await fetch('http://localhost:8000/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload document');
      }

      const document = await response.json();
      setDocuments(prev => [...prev, document]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:8000/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete document');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getForm = async (formType: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:8000/api/forms/${formType}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get form');
      }

      const form = await response.json();
      setForms(prev => ({
        ...prev,
        [formType]: form,
      }));
      return form;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getDocuments = async (formType?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = formType
        ? `http://localhost:8000/api/documents?form_type=${formType}`
        : 'http://localhost:8000/api/documents';

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get documents');
      }

      const documents = await response.json();
      setDocuments(documents);
      return documents;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContext.Provider
      value={{
        forms,
        documents,
        loading,
        error,
        saveForm,
        uploadDocument,
        deleteDocument,
        getForm,
        getDocuments,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

export const useForm = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
}; 