import React from 'react';

interface FinalStatusMessageProps {
  status: 'approved' | 'rejected';
  timeline: Record<string, string>;
}

const FinalStatusMessage: React.FC<FinalStatusMessageProps> = ({ status, timeline }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (status === 'approved') {
    return (
      <div className="final-status-message mb-4">
        <div className="alert alert-success" style={{ borderRadius: '12px', border: '1px solid #86efac' }}>
          <div className="d-flex align-items-start mb-3">
            <span className="material-icons" style={{ color: '#16a34a', marginRight: 12, fontSize: 24 }}>check_circle</span>
            <div>
              <h5 style={{ color: '#16a34a', marginBottom: 8 }}>Antrag Bewilligt!</h5>
              <p style={{ margin: '0 0 12px 0', color: '#166534' }}>
                Herzlichen Glückwunsch! Ihr Antrag wurde erfolgreich geprüft und bewilligt. Sie wurden per Email über die Bewilligung informiert.
              </p>
              {timeline.approved && (
                <div style={{ fontSize: 14, color: '#166534' }}>
                  <strong>Bewilligt am:</strong> {formatDate(timeline.approved)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="final-status-message mb-4">
        <div className="alert alert-danger" style={{ borderRadius: '12px', border: '1px solid #fca5a5' }}>
          <div className="d-flex align-items-start mb-3">
            <span className="material-icons" style={{ color: '#dc2626', marginRight: 12, fontSize: 24 }}>cancel</span>
            <div>
              <h5 style={{ color: '#dc2626', marginBottom: 8 }}>Antrag Abgelehnt</h5>
              <p style={{ margin: '0 0 12px 0', color: '#991b1b' }}>
                Leider wurde Ihr Antrag abgelehnt. Bei Fragen wenden Sie sich bitte direkt an die Bewilligungsbehörde. Sie wurden per Email über die Ablehnung informiert.
              </p>
              {timeline.rejected && (
                <div style={{ fontSize: 14, color: '#991b1b' }}>
                  <strong>Abgelehnt am:</strong> {formatDate(timeline.rejected)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default FinalStatusMessage;
