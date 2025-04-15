import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';

const ApplicationTypesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
      <Container className="max-w-4xl">
        <Card className="shadow">
          <Card.Body className="p-5">
            <h1 className="h2 fw-bold mb-4">Auswahl der Wohnraumförderung</h1>
            
            <p className="mb-4">
              Bei uns stehen Ihnen zwei unterschiedliche Wohnraumförderungen zur Auswahl. 
              Bitte wählen Sie die Förderung, die zu Ihrer Situation passt.
            </p>

            <Row className="g-4">
              {/* Self-Used Property Card */}
              <Col md={6}>
                <Card className="h-100 text-center">
                  <Card.Body className="p-4">
                    <h2 className="h4 fw-semibold mb-3">Selbst genutztes Wohneigentum</h2>
                    <p className="mb-4">
                      Der Antrag zur Förderung von selbstgenutztem Wohneigentum richtet sich an Haushalte 
                      mit niedrigem bis mittlerem Einkommen, die Unterstützung bei der Finanzierung eines Eigenheims benötigen.
                    </p>
                    <Button 
                      variant="primary"
                      size="lg"
                      onClick={() => navigate('/initial-check')}
                      className="bg-blue-700 border-0 px-4 py-2"
                    >
                      ANTRAG STARTEN
                    </Button>
                  </Card.Body>
                </Card>
              </Col>

              {/* Rental and Group Housing Card */}
              <Col md={6}>
                <Card className="h-100 text-center bg-light">
                  <Card.Body className="p-4">
                    <h2 className="h4 fw-semibold mb-3">Mietwohnungen und Gruppenwohnungen</h2>
                    <p className="mb-4">
                      Der Antrag für Mietwohnungen und Gruppenwohnungen wird ab Juli 2025 verfügbar sein. 
                      Wir arbeiten intensiv daran, diese Förderung bereitzustellen.
                    </p>
                    <Button 
                      variant="secondary"
                      size="lg"
                      disabled
                      className="px-4 py-2"
                    >
                      ANTRAG STARTEN
                    </Button>
                    <p className="small text-muted mt-2 mb-0">
                      Dieser Antrag steht Ihnen ab Juli 2025 zur Verfügung.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default ApplicationTypesPage;