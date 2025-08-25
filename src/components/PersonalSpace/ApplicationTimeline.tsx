import React from 'react';

interface ApplicationTimelineProps {
  currentStatus: string;
  timeline: Record<string, string>;
}

const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({ currentStatus, timeline }) => {
  // Define the 3 timeline steps
  const timelineSteps = [
    { key: 'submitted', label: 'Eingereicht' },
    { key: 'middle', label: 'In Bearbeitung' }, // This will be dynamic
    { key: 'final', label: 'Geprüft' }
  ];

  // Get the appropriate label for the middle step based on current status
  const getMiddleStepLabel = () => {
    switch (currentStatus) {
      case 'documents_requested':
        return 'Dokumente Angefordert';
      case 'documents_received':
        return 'Dokumente Eingereicht';
      case 'in_progress':
        return 'In Bearbeitung';
      case 'approved':
      case 'rejected':
        return 'In Bearbeitung'; // For final statuses, show the last in-progress state
      default:
        return 'In Bearbeitung';
    }
  };

  // Get the current step index based on status
  const getCurrentStepIndex = () => {
    switch (currentStatus) {
      case 'submitted':
        return 0;
      case 'in_progress':
      case 'documents_requested':
      case 'documents_received':
        return 1;
      case 'approved':
      case 'rejected':
        return 2;
      default:
        return 0;
    }
  };

  const currentStepIndex = getCurrentStepIndex();
  const middleStepLabel = getMiddleStepLabel();

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get the appropriate date for each step
  const getStepDate = (stepKey: string) => {
    switch (stepKey) {
      case 'submitted':
        return timeline.submitted;
      case 'middle':
        // For middle step, show the most recent relevant date
        if (timeline.documents_received) return timeline.documents_received;
        if (timeline.documents_requested) return timeline.documents_requested;
        if (timeline.in_progress) return timeline.in_progress;
        return '';
      case 'final':
        if (timeline.approved) return timeline.approved;
        if (timeline.rejected) return timeline.rejected;
        return '';
      default:
        return '';
    }
  };

  // Check if a step is completed (including the step itself)
  const isStepCompleted = (stepIndex: number) => {
    return stepIndex <= currentStepIndex;
  };

  // Check if the line to the next step should be green
  const isLineCompleted = (stepIndex: number) => {
    // Line is green only if the NEXT step is also completed
    return stepIndex < currentStepIndex;
  };

  return (
    <div className="application-timeline mb-2">
      <h6 className="mb-3 text-muted">Status Ihres Antrags:</h6>
      
      <div className="timeline-container">
        {timelineSteps.map((step, index) => {
          const isCompleted = isStepCompleted(index);
          const hasDate = getStepDate(step.key);
          const isCurrentStep = index === currentStepIndex;
          const stepLabel = step.key === 'middle' ? middleStepLabel : step.label;
          const isLineCompleted = index < currentStepIndex; // Line is green if next step is completed
          
          return (
            <div key={step.key} className="timeline-step">
              <div className="timeline-connector">
                <div className={`timeline-circle ${isCompleted ? 'completed' : ''} ${isCurrentStep ? 'current' : ''}`}>
                  {isCompleted && (
                    <span className="timeline-check">✓</span>
                  )}
                </div>
                {index < 2 && (
                  <div className={`timeline-line ${isLineCompleted ? 'completed' : ''}`}></div>
                )}
              </div>
              
              <div className="timeline-content">
                <div className={`timeline-label ${isCurrentStep ? 'current' : ''}`}>
                  {stepLabel}
                  {hasDate && (
                    <div className="timeline-date">
                      {formatDate(hasDate)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicationTimeline;
