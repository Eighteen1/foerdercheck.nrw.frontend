import React from 'react';
import { OutstandingDocumentRequest, formatDate } from '../../utils/outstandingRequests';

interface OutstandingDocumentsInfoProps {
  outstandingRequests: OutstandingDocumentRequest[];
  isLoading: boolean;
  error: string | null;
}

const OutstandingDocumentsInfo: React.FC<OutstandingDocumentsInfoProps> = ({ 
  outstandingRequests, 
  isLoading, 
  error 
}) => {
  if (isLoading) {
    return (
      <div className="outstanding-documents-info mb-4">
        <div className="text-center py-3">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span className="visually-hidden">Laden...</span>
          </div>
          <span>Lade Dokumentenanfragen...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="outstanding-documents-info mb-4">
        <div className="alert alert-warning" style={{ borderRadius: '12px' }}>
          <div className="d-flex align-items-start">
            <i className="bi bi-exclamation-triangle-fill text-warning me-3" style={{ fontSize: '1.2rem', marginTop: '2px' }}></i>
            <div>
              <strong>Hinweis:</strong> {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (outstandingRequests.length === 0) {
    return null;
  }

  return (
    <div className="outstanding-documents-info mb-4">
      <div className="" style={{ background: '#f8f9fa' }}>
        <div className="d-flex align-items-start mb-3">
          <span className="material-icons" style={{ color: '#064497', marginRight: 8, fontSize: 20 }}>info</span>
          <div style={{ fontSize: 14, color: '#064497' }}>
            <strong>Ausstehende Dokumentenanfragen:</strong> 
          </div>
        </div>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {outstandingRequests.map((request, index) => (
            <div 
              key={request.token} 
              style={{ 
                marginBottom: 8, 
                padding: 16, 
                background: request.is_expired ? '#fef2f2' : '#ffffff', 
                borderRadius: 12, 
                border: `1px solid ${request.is_expired ? '#fecaca' : '#e9ecef'}` 
              }}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 style={{ 
                  color: request.is_expired ? '#dc2626' : '#064497', 
                  marginBottom: 4, 
                  fontWeight: 600,
                  fontSize: 16 
                }}>
                  {request.document_title}
                </h6>
                {request.is_expired && (
                  <span style={{ 
                    background: '#dc2626', 
                    color: 'white', 
                    borderRadius: 4, 
                    padding: '2px 8px', 
                    fontSize: 12, 
                    fontWeight: 600 
                  }}>
                    Abgelaufen
                  </span>
                )}
              </div>
              
              <div className="row mb-2" style={{ fontSize: 14 }}>
                <div className="col-md-6">
                  <strong>Angefragt von:</strong> {request.requesting_agent_name}
                </div>
                <div className="col-md-6">
                  <strong>Gültig bis:</strong> {formatDate(request.expires_at)}
                </div>
              </div>
              
              {request.custom_message && (
                <div style={{ marginTop: 8, padding: 8, background: '#f8f9fa', borderRadius: 6, fontSize: 14 }}>
                  <strong>Nachricht:</strong> {request.custom_message}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          background: '#e7f3ff', 
          borderRadius: 8, 
          border: '1px solid #bfdbfe',
          fontSize: 13,
          color: '#1976d2'
        }}>
          <strong>Hinweis:</strong> Sie haben eine Email mit einem Link erhalten, um die angeforderten Dokumente hochzuladen.
        </div>
      </div>
    </div>
  );
};

export default OutstandingDocumentsInfo;
