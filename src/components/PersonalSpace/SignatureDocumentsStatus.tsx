import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';

interface SignatureDocument {
  title: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  filename?: string;
  file_path?: string;
  uploaded_at?: string;
  is_selbsthilfe: boolean;
  signature_count: number;
}

interface SignatureDocumentsStatusProps {
  user: any; // We'll use any for now since we need to extend the User type
  onStatusChange?: (allDocumentsUploaded: boolean) => void;
}

const SignatureDocumentsStatus: React.FC<SignatureDocumentsStatusProps> = ({ user, onStatusChange }) => {
  const [signatureDocuments, setSignatureDocuments] = useState<Record<string, SignatureDocument>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignatureDocuments = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('user_data')
          .select('signature_documents')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('Error fetching signature documents:', fetchError);
          setError('Fehler beim Laden der Dokumente');
          return;
        }

        if (data?.signature_documents) {
          setSignatureDocuments(data.signature_documents);
        }
      } catch (err) {
        console.error('Error in fetchSignatureDocuments:', err);
        setError('Fehler beim Laden der Dokumente');
      } finally {
        setLoading(false);
      }
    };

    fetchSignatureDocuments();
  }, [user?.id]);

  // Notify parent component when status changes
  useEffect(() => {
    if (onStatusChange && !loading && !error && signatureDocuments) {
      const totalDocuments = Object.keys(signatureDocuments).length;
      const uploadedDocuments = Object.values(signatureDocuments).filter(doc => doc.uploaded).length;
      const allDocumentsUploaded = totalDocuments > 0 && uploadedDocuments === totalDocuments;
      onStatusChange(allDocumentsUploaded);
    }
  }, [signatureDocuments, loading, error, onStatusChange]);

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" style={{ color: '#064497' }} />
        <p className="mt-2 small text-muted">Lade Dokumentenstatus...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
      </div>
    );
  }

  if (!signatureDocuments || Object.keys(signatureDocuments).length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Keine Unterschriften-Dokumente gefunden.
      </div>
    );
  }

  const totalDocuments = Object.keys(signatureDocuments).length;
  const uploadedDocuments = Object.values(signatureDocuments).filter(doc => doc.uploaded).length;
  const pendingDocuments = totalDocuments - uploadedDocuments;

  return (
    <div className="h-100 d-flex flex-column">
      {/* Clean Summary */}
      <div className="mb-2">
        <h5 className="mb-4" style={{ color: '#212121', fontWeight: '500', fontSize: '1.25rem' }}>Dokumentenstatus</h5>
        <div className="d-flex gap-6 mb-3">
          <div>
            <div className="h4 mb-1" style={{ 
              color: '#ffffff', 
              fontWeight: '500',
              backgroundColor: '#1e3a8a',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'inline-block'
            }}>{totalDocuments}</div>
            <div style={{ fontSize: '0.875rem', color: '#757575' }}>Gesamt</div>
          </div>
          <div>
            <div className="h4 mb-1" style={{ 
              color: '#064497', 
              fontWeight: '500',
              backgroundColor: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'inline-block',
            }}>{uploadedDocuments}</div>
            <div style={{ fontSize: '0.875rem', color: '#757575' }}>Hochgeladen</div>
          </div>
          <div>
            <div className="h4 mb-1" style={{ 
              color: '#000000', 
              fontWeight: '500',
              backgroundColor: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'inline-block',
            }}>{pendingDocuments}</div>
            <div style={{ fontSize: '0.875rem', color: '#757575' }}>Ausstehend</div>
          </div>
        </div>
      </div>

      {/* Clean Documents List */}
      <div className="flex-grow-1" style={{ overflowY: 'auto', maxHeight: '400px' }}>
        {Object.entries(signatureDocuments).map(([docId, doc]) => (
          <div key={docId} className="d-flex align-items-center justify-content-between py-3 px-4 mb-2" 
               style={{ 
                 backgroundColor: doc.uploaded ? '#f5f5f5' : '#fff', 
                 borderRadius: '6px',
                 border: `1px solid ${doc.uploaded ? '#e0e0e0' : '#D7DAEA'}`,
                 borderLeft: `4px solid ${doc.uploaded ? '#2e7d32' : '#D7DAEA'}`
               }}>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center mb-1">
                <h6 className="mb-0 me-2" style={{ fontSize: '0.95rem', fontWeight: '500', color: '#212121' }}>{doc.title}</h6>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#757575' }}>
                {doc.signature_count} Unterschrift{doc.signature_count > 1 ? 'en' : ''} erforderlich
              </div>
            </div>
            <div className="text-end">
              {doc.uploaded ? (
                <div className="d-flex align-items-center" style={{ color: '#2e7d32' }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#2e7d32',
                    marginRight: '8px'
                  }}></div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Erledigt</span>
                </div>
              ) : (
                <div className="d-flex align-items-center" style={{ color: '#000000' }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#000000',
                    marginRight: '8px'
                  }}></div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Ausstehend</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignatureDocumentsStatus;
