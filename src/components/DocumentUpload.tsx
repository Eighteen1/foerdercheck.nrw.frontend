import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, OverlayTrigger, Tooltip, Modal } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface DocumentItem {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  uploadedFile?: {
    name: string;
    url: string;
  };
}

interface FormSection {
  title: string;
  progress: number;
}

const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const formSections: FormSection[] = [
    { title: "Berechnung der Wohn- und Nutzfläche nach WoFIV", progress: 0 },
    { title: "Berechnung des Brutto-Rauminhalts des Gebäudes nach DIN 277", progress: 0 }
  ];

  useEffect(() => {
    loadDocumentRequirements();
  }, [user?.id]);

  const loadDocumentRequirements = async () => {
    if (!user?.id) {
      console.error('No user ID found');
      setIsLoading(false);
      return;
    }

    try {
      // Get the user's document check data from user_data table
      const { data: userData, error: checkError } = await supabase
        .from('user_data')
        .select(`
          hasinheritanceright,
          haslocationcostloan,
          haswoodconstructionloan,
          hasbegstandardloan,
          ispregnant,
          hasauthorizedperson,
          is_married,
          is_disabled,
          document_status
        `)
        .eq('id', user.id)
        .single();

      if (checkError) throw checkError;

      // Get foerderVariante from object_data table
      const { data: objectData, error: objectError } = await supabase
        .from('object_data')
        .select('foerderVariante')
        .eq('user_id', user.id)
        .single();

      if (objectError && objectError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw objectError;
      }

      // Define base documents that are always required
      const baseDocuments: DocumentItem[] = [
        {
          id: 'bauzeichnung',
          title: 'Bauzeichnung',
          description: 'Bauzeichnung (im Maßstab 1:100 mit eingezeichneter Möbelstellung)',
          isRequired: true
        },
        {
          id: 'lageplan',
          title: 'Lageplan',
          description: 'Lageplan nach den Vorschriften BauO NRW (2018)',
          isRequired: true
        },
        {
          id: 'grundbuchblatt',
          title: 'Grundbuchblattkopie',
          description: 'Grundbuchblattkopie nach neustem Stand',
          isRequired: true
        }
      ];

      // Add conditional documents based on document check answers
      const conditionalDocuments: DocumentItem[] = [];

      if (userData?.is_married) {
        conditionalDocuments.push({
          id: 'marriage_cert',
          title: 'Heiratsurkunde',
          description: 'Aktuelle Heiratsurkunde oder Lebenspartnerschaftsurkunde',
          isRequired: true
        });
      }

      if (userData?.is_disabled) {
        conditionalDocuments.push({
          id: 'disability_cert',
          title: 'Schwerbehindertenausweis',
          description: 'Kopie des gültigen Schwerbehindertenausweises',
          isRequired: true
        });
      }

      if (userData?.haswoodconstructionloan) {
        conditionalDocuments.push({
          id: 'bauenmitholz_cert',
          title: 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
          description: 'Nachweis: Zusatzdarlehen für Bauen mit Holz',
          isRequired: true
        });
      }

      if (userData?.hasbegstandardloan) {
        conditionalDocuments.push({
          id: 'beg40standard_cert',
          title: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
          description: 'Nachweis: Zusatzdarlehen für BEG Effizienzstandard 40',
          isRequired: true
        });
      }

      if (objectData?.foerderVariante === 'neubau') {
        conditionalDocuments.push({
          id: 'neubau_kaufvertrag',
          title: 'Grundstückskaufvertrag/Entwurf des Kaufvertrags',
          description: 'Bei Neubau: Grundstückskaufvertrag/Entwurf des Kaufvertrags.',
          isRequired: true
        });
      }

      // Add uploaded file information from document_status
      const allDocuments = [...baseDocuments, ...conditionalDocuments].map(doc => {
        const uploadedDoc = userData?.document_status?.[doc.id];
        if (uploadedDoc?.uploaded) {
          return {
            ...doc,
            uploadedFile: {
              name: uploadedDoc.fileName,
              url: supabase.storage
                .from('documents')
                .getPublicUrl(`${user.id}/${doc.id}/${uploadedDoc.fileName}`).data.publicUrl
            }
          };
        }
        return doc;
      });

      // Set all documents
      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error loading document requirements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (documentId: string, file: File) => {
    if (!user?.id) return;

    try {
      // Create a unique file path for the user's document
      const filePath = `${user.id}/${documentId}/${file.name}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Get current document_status
      const { data: userData, error: fetchError } = await supabase
        .from('user_data')
        .select('document_status')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update document status in user_data
      const documentStatus = {
        ...(userData?.document_status || {}),
        [documentId]: {
          uploaded: true,
          fileName: file.name,
          filePath: filePath,
          uploadedAt: new Date().toISOString()
        }
      };

      const { error: updateError } = await supabase
        .from('user_data')
        .update({
          document_status: documentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update documents state
      setDocuments(prevDocs => prevDocs.map(doc => 
        doc.id === documentId
          ? {
              ...doc,
              uploadedFile: {
                name: file.name,
                url: publicUrl
              }
            }
          : doc
      ));
    } catch (error) {
      console.error('Error uploading document:', error);
      // Handle error (show user feedback)
    }
  };

  const handleRemoveFile = async (documentId: string) => {
    if (!user?.id) return;

    try {
      const doc = documents.find(d => d.id === documentId);
      if (!doc?.uploadedFile) return;

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([`${user.id}/${documentId}/${doc.uploadedFile.name}`]);

      if (deleteError) throw deleteError;

      // Get current document_status
      const { data: userData, error: fetchError } = await supabase
        .from('user_data')
        .select('document_status')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update document status in user_data
      const documentStatus = { ...userData?.document_status };
      delete documentStatus[documentId];

      const { error: updateError } = await supabase
        .from('user_data')
        .update({
          document_status: documentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update state
      setDocuments(prevDocs => prevDocs.map(doc => 
        doc.id === documentId
          ? { ...doc, uploadedFile: undefined }
          : doc
      ));
    } catch (error) {
      console.error('Error removing document:', error);
      // Handle error (show user feedback)
    }
  };

  const handleDocumentClick = (documentId: string) => {
    // Trigger file input click
    const fileInput = document.getElementById(`file-input-${documentId}`);
    if (fileInput) fileInput.click();
  };

  const renderTooltip = (text: string) => (
    <Tooltip id="document-tooltip">
      {text}
    </Tooltip>
  );

  const handleResetDocumentCheck = async () => {
    if (!user?.id) return;

    try {
      // Update completeddoccheck to false in user_data table
      const { error } = await supabase
        .from('user_data')
        .update({ completeddoccheck: false })
        .eq('id', user.id);

      if (error) throw error;

      // Close the modal and navigate to document check
      setShowResetConfirmation(false);
      navigate('/document-check', { state: { from: 'document-upload' } });
    } catch (error) {
      console.error('Error resetting document check:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative min-h-screen bg-white">
      <Modal show={showResetConfirmation} onHide={() => setShowResetConfirmation(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Dokumente neu ermitteln</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Möchten Sie die erforderlichenDokumente neu ermitteln? Ihre bisherig hochgeladenen Dokumente werden vorest beibehalten.
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between gap-3 px-3">
            <Button
              onClick={() => setShowResetConfirmation(false)}
              className="flex-grow-1 py-2"
              style={{ backgroundColor: '#064497', border: 'none' }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleResetDocumentCheck}
              className="flex-grow-1 py-2"
              style={{ backgroundColor: '#D7DAEA', border: 'none', color: 'black' }}
            >
              Bestätigen
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      <Container className="pt-16">
        <div className="text-center mb-5">
          <h2 className="text-[#064497] text-3xl mb-4">Dokument Übersicht</h2>
          <p className="text-lg">
            Klicken Sie auf die Pfeile, um die jeweiligen Dokumente hochzuladen,
            oder ziehen Sie sie in die entsprechenden Bereiche.
          </p>
        </div>

        <div>
          {/* Form sections at the top */}
          <Row className="mb-5">
            <Col>
              <h3 className="mb-4 text-[#000000] font-semibold italic">
                Verpflichtende Dokumente zum ausfüllen
              </h3>
              <p className="mb-4">
                Bitte füllen Sie die folgenden zwei Formulare aus, damit wir diese digital prüfen können.
              </p>
              {formSections.map((section, index) => (
                <div key={index} className="d-flex align-items-center mb-4">
                  <Button
                    className="py-3 me-3"
                    style={{ 
                      backgroundColor: '#064497', 
                      border: 'none',
                      width: 'calc(100% - 45px - 1rem)' // 100% - progress width - margin
                    }}
                  >
                    {section.title}
                  </Button>
                  <div className="border rounded-circle p-2 d-flex align-items-center justify-content-center" 
                       style={{ width: '45px', height: '45px' }}>
                    {section.progress}%
                  </div>
                </div>
              ))}
            </Col>
          </Row>
        </div>

        {/* Document upload section */}
        <div className="mb-5">
          <h3 className="mb-4 text-[#000000] font-semibold italic">
            Verpflichtende Dokumente zum Hochladen
          </h3>
          
          {documents.map((doc) => (
            <OverlayTrigger
              key={doc.id}
              placement="bottom"
              overlay={renderTooltip(doc.description)}
            >
              <div 
                className={`mb-4 p-3 border rounded cursor-pointer transition-all
                  ${doc.uploadedFile ? 'bg-green-50 border-green-500' : 'hover:bg-gray-50'}`}
                onClick={() => !doc.uploadedFile && handleDocumentClick(doc.id)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span>{doc.uploadedFile?.name || doc.title}</span>
                  {doc.uploadedFile ? (
                    <Button
                      variant="link"
                      className="text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(doc.id);
                      }}
                    >
                      <i className="bi bi-x-lg" style={{ fontSize: '24px' }}></i>
                    </Button>
                  ) : (
                    <i className="bi bi-upload" style={{ fontSize: '24px', color: '#064497' }}></i>
                  )}
                </div>
                <input
                  id={`file-input-${doc.id}`}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(doc.id, file);
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            </OverlayTrigger>
          ))}
        </div>

        <div className="text-center mb-5 d-flex justify-content-center gap-3">
          <Button
            onClick={() => navigate('/personal-space', { state: { from: 'document-upload' } })}
            className="px-5 py-2 w-100"
            style={{ backgroundColor: '#064497', border: 'none' }}
          >
            ZURÜCK
          </Button>
          <Button
            onClick={() => setShowResetConfirmation(true)}
            className="px-5 py-2 w-100"
            style={{ backgroundColor: '#D7DAEA', border: 'none', color: 'black' }}
          >
            DOKUMENTE NEU ERMITTELN
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default DocumentUpload; 