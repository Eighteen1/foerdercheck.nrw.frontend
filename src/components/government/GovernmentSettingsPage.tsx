import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner, Table } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import postcodeMap from '../../utils/postcode_map.json';

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  'worker': 'Arbeiterinnen und Arbeiter',
  'employee': 'Angestellte',
  'civil-servant': 'Beamtinnen und Beamte',
  'apprentice': 'Auszubildende',
  'retired': 'Rentnerinnen/Pensionärinnen und Rentner/Pensionäre',
  'unemployed': 'Arbeitslos',
  'sole-trader': 'Einzelkaufleute',
  'business-owner': 'Gewerbetreibende',
  'freelancer': 'Freiberuflich Tätige',
  'farmer': 'Landwirte',
  'private-income': 'Privatperson deren Einkommen überwiegend aus Vermögen stammt',
  'student': 'Studierende',
  'pupil': 'Schülerinnen und Schüler',
  'homemaker': 'Hausfrauen und Hausmänner',
  'no-occupation': 'ohne Berufsangabe',
};

const HOUSEHOLD_LABELS: Record<string, string> = {
  '1_0': '1 Erwachsene/r, keine Kinder',
  '2_0': '2 Erwachsene, keine Kinder',
  '3+_0': '3+ Erwachsene, keine Kinder',
  '1_1': '1 Erwachsene/r, 1 Kind',
  '1_2': '1 Erwachsene/r, 2 Kinder',
  '1_3+': '1 Erwachsene/r, 3+ Kinder',
  '2_1': '2 Erwachsene, 1 Kind',
  '2_2': '2 Erwachsene, 2 Kinder',
  '2_3+': '2 Erwachsene, 3+ Kinder',
  '3+_1': '3+ Erwachsene, 1 Kind',
  '3+_2': '3+ Erwachsene, 2 Kinder',
  '3+_3+': '3+ Erwachsene, 3+ Kinder',
};

// Add CSS styling for checkboxes
const styles = `
  .form-check-input:checked {
    background-color: #064497 !important;
    border-color: #064497 !important;
  }
`;

interface AgentData {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'agent' | 'readonly' | 'owner';
  mfa_enabled: boolean;
  city_id: string | null;
  settings: {
    notifications: {
      emailNotifications: {
        documentsSubmitted: boolean;
        applicationAssigned: boolean;
        applicationShared: boolean;
        adminMessage: boolean;
      };
      newApplications: {
        enabled: boolean;
        email: boolean;
      };
    };
  };
}

interface CityData {
  id: string;
  name: string;
  settings: {
    assignmentRules: {
      filterType: 'type' | 'postcode' | 'household' | 'employment';
      rules: Record<string, string>;
    };
    deletionTime: number;
  };
}

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  mfa_enabled: boolean;
  last_password_change: string | null;
  role: 'admin' | 'agent' | 'readonly' | 'owner';
}

// Helper for MFA icon
const MFACircle = ({ enabled }: { enabled: boolean }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: enabled ? '#e6f4ea' : '#fdecea',
  }}>
    {enabled ? (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 8.5L7 11.5L12 5.5" stroke="#388e3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5 5L11 11M11 5L5 11" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )}
  </span>
);

// Helper for days since password change
const getDaysSince = (dateString: string | null) => {
  if (!dateString) return '-';
  const lastChange = new Date(dateString);
  const now = new Date();
  lastChange.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diffTime = now.getTime() - lastChange.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  if (diffDays === 1) return '1 Tag';
  return `${diffDays} Tagen`;
};

const GovernmentSettingsPage: React.FC = () => {
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<any>(null);
  const [isEditingCitySettings, setIsEditingCitySettings] = useState(false);
  const [isEditingDeletionSettings, setIsEditingDeletionSettings] = useState(false);
  const [tempCitySettings, setTempCitySettings] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'agent' | 'readonly'>('admin');
  const [ownerRoleChangeError, setOwnerRoleChangeError] = useState<string | null>(null);
  const [ownerRoleChangeSuccess, setOwnerRoleChangeSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user session');

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      // Ensure settings object has the correct structure
      const defaultSettings = {
        notifications: {
          emailNotifications: {
            documentsSubmitted: false,
            applicationAssigned: false,
            applicationShared: false,
            adminMessage: false
          },
          newApplications: {
            enabled: false,
            email: false
          }
        }
      };

      setAgentData({
        ...data,
        settings: data.settings || defaultSettings
      });
      setTempSettings(data.settings || defaultSettings);

      // Fetch city data for all users
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('*')
        .eq('id', data.city_id)
        .single();

      if (cityError) throw cityError;
      setCityData(cityData);
      setTempCitySettings(cityData.settings || {});

      // Fetch team members for all users to get admin contact info
      const { data: teamData, error: teamError } = await supabase
        .from('agents')
        .select('id, email, name, mfa_enabled, last_password_change, role')
        .eq('city_id', data.city_id);

      if (teamError) throw teamError;
      setTeamMembers(teamData);
    } catch (err) {
      setError('Fehler beim Laden der Daten');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ settings: tempSettings })
        .eq('id', agentData?.id);

      if (error) throw error;

      setAgentData(prev => prev ? { ...prev, settings: tempSettings } : null);
      setIsEditingSettings(false);
      setSuccess('Einstellungen erfolgreich gespeichert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen');
      console.error('Error saving settings:', err);
    }
  };

  const handleCitySettingsSave = async () => {
    try {
      // If we're editing deletion settings, only update the deletionTime
      if (isEditingDeletionSettings) {
        const { error } = await supabase
          .from('cities')
          .update({ 
            settings: {
              ...cityData?.settings,
              deletionTime: tempCitySettings?.deletionTime || 0
            }
          })
          .eq('id', cityData?.id);

        if (error) throw error;
        setCityData(prev => prev ? { 
          ...prev, 
          settings: {
            ...prev.settings,
            deletionTime: tempCitySettings?.deletionTime || 0
          }
        } : null);
        setIsEditingDeletionSettings(false);
        setSuccess('Löschzeitraum erfolgreich gespeichert');
      } 
      // If we're editing assignment rules, only update the assignmentRules
      else if (isEditingCitySettings) {
        const { error } = await supabase
          .from('cities')
          .update({ 
            settings: {
              ...cityData?.settings,
              assignmentRules: tempCitySettings?.assignmentRules
            }
          })
          .eq('id', cityData?.id);

        if (error) throw error;
        setCityData(prev => prev ? { 
          ...prev, 
          settings: {
            ...prev.settings,
            assignmentRules: tempCitySettings?.assignmentRules
          }
        } : null);
        setIsEditingCitySettings(false);
        setSuccess('Zuweisungsregeln erfolgreich gespeichert');
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen');
      console.error('Error saving settings:', err);
    }
  };

  const handleSendReminder = async (memberId: string, type: 'mfa' | 'password') => {
    try {
      // Here you would implement the actual reminder sending logic
      // For now, we'll just show a success message
      setSuccess(`Erinnerung an ${type === 'mfa' ? 'MFA-Einrichtung' : 'Passwortänderung'} gesendet`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Senden der Erinnerung');
      console.error('Error sending reminder:', err);
    }
  };

  const handleOwnerRoleChange = async () => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ role: selectedRole })
        .eq('id', selectedUserId);

      if (error) throw error;

      setTeamMembers(prev => prev.map(member =>
        member.id === selectedUserId ? { ...member, role: selectedRole } : member
      ));
      setSelectedUserId('');
      setSelectedRole('admin');
      setOwnerRoleChangeSuccess('Rolle erfolgreich geändert');
    } catch (err) {
      setOwnerRoleChangeError('Fehler beim Ändern der Rolle');
      console.error('Error changing owner role:', err);
    }
  };

  // Helper to check if user is owner
  const isOwner = agentData?.role === 'owner';

  // Helper to check if user is admin or owner
  const isAdminOrOwner = agentData?.role === 'admin' || agentData?.role === 'owner';

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" style={{ color: '#064497' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{styles}</style>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
          {success}
        </Alert>
      )}

      {/* Notification Settings Card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, marginBottom: 24 }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 style={{ marginBottom: 4, fontWeight: 500, fontSize: '1.2rem', color: '#064497' }}>Benachrichtigungseinstellungen</h1>
            <p style={{ color: '#666', margin: 0, marginTop: 16 }}>Verwalten Sie Ihre Benachrichtigungen</p>
          </div>
          <Button
            variant={isEditingSettings ? "outline-secondary" : "outline-primary"}
            onClick={() => {
              if (isEditingSettings) {
                setTempSettings(agentData?.settings || {});
              }
              setIsEditingSettings(!isEditingSettings);
            }}
            style={{ borderColor: '#064497', color: '#064497', marginTop: 16 }}
            className={isEditingSettings ? "btn-cancel" : "btn-primary-outline"}
          >
            {isEditingSettings ? 'Schließen' : 'Bearbeiten'}
          </Button>
        </div>

        {isEditingSettings ? (
          <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, marginTop: 16 }}>
            <h6 style={{ marginBottom: 16, fontWeight: 500 }}>Zusätzlich zum Fördercheck Posteingang möchte ich diese Nachrichten per E-Mail erhalten:</h6>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="documentsSubmitted"
                label="Angefragte Dokumente wurden nachgereicht"
                checked={tempSettings?.notifications?.emailNotifications?.documentsSubmitted || false}
                onChange={(e) => {
                  setTempSettings((prev: AgentData['settings']) => ({
                    ...prev,
                    notifications: {
                      ...prev?.notifications,
                      emailNotifications: {
                        ...prev?.notifications?.emailNotifications,
                        documentsSubmitted: e.target.checked
                      }
                    }
                  }));
                }}
              />
              <Form.Check
                type="checkbox"
                id="applicationShared"
                label="An mich geteilte Anträge von Team-Mitgliedern"
                checked={tempSettings?.notifications?.emailNotifications?.applicationShared || false}
                onChange={(e) => {
                  setTempSettings((prev: AgentData['settings']) => ({
                    ...prev,
                    notifications: {
                      ...prev?.notifications,
                      emailNotifications: {
                        ...prev?.notifications?.emailNotifications,
                        applicationShared: e.target.checked
                      }
                    }
                  }));
                }}
              />
              <Form.Check
                type="checkbox"
                id="applicationAssigned"
                label="Neue an mich zugewiesene Anträge"
                checked={tempSettings?.notifications?.emailNotifications?.applicationAssigned || false}
                onChange={(e) => {
                  setTempSettings((prev: AgentData['settings']) => ({
                    ...prev,
                    notifications: {
                      ...prev?.notifications,
                      emailNotifications: {
                        ...prev?.notifications?.emailNotifications,
                        applicationAssigned: e.target.checked
                      }
                    }
                  }));
                }}
              />
              {agentData?.role === 'agent' && (
                <Form.Check
                  type="checkbox"
                  id="adminMessage"
                  label="Admin-Aufforderungen (MFA und Passwort-Einstellungen)"
                  checked={tempSettings?.notifications?.emailNotifications?.adminMessage || false}
                  onChange={(e) => {
                    setTempSettings((prev: AgentData['settings']) => ({
                      ...prev,
                      notifications: {
                        ...prev?.notifications,
                        emailNotifications: {
                          ...prev?.notifications?.emailNotifications,
                          adminMessage: e.target.checked
                        }
                      }
                    }));
                  }}
                />
              )}
            </Form.Group>

            <h6 style={{ marginBottom: 16, fontWeight: 500 }}>Ich möchte auch über neue Anträge informiert werden, die mir nicht zugewiesen wurden:</h6>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="newApplicationsEnabled"
                label="Im Posteingang"
                checked={tempSettings?.notifications?.newApplications?.enabled || false}
                onChange={(e) => {
                  setTempSettings((prev: AgentData['settings']) => ({
                    ...prev,
                    notifications: {
                      ...prev?.notifications,
                      newApplications: {
                        ...prev?.notifications?.newApplications,
                        enabled: e.target.checked
                      }
                    }
                  }));
                }}
              />
              <Form.Check
                type="checkbox"
                id="newApplicationsEmail"
                label="Per E-Mail"
                checked={tempSettings?.notifications?.newApplications?.email || false}
                onChange={(e) => {
                  setTempSettings((prev: AgentData['settings']) => ({
                    ...prev,
                    notifications: {
                      ...prev?.notifications,
                      newApplications: {
                        ...prev?.notifications?.newApplications,
                        email: e.target.checked
                      }
                    }
                  }));
                }}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="primary"
                onClick={handleSettingsSave}
                style={{ background: '#064497', border: 'none' }}
              >
                Speichern
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, marginTop: 16 }}>
            <h6 style={{ marginBottom: 16, fontWeight: 500 }}>E-Mail-Benachrichtigungen erhalten für:</h6>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {!(agentData?.settings?.notifications?.emailNotifications?.documentsSubmitted ||
                  agentData?.settings?.notifications?.emailNotifications?.applicationShared ||
                  agentData?.settings?.notifications?.emailNotifications?.applicationAssigned ||
                  (agentData?.role === 'agent' && agentData?.settings?.notifications?.emailNotifications?.adminMessage)
                ) && (
                  <li style={{ marginBottom: 8, color: '#888' }}>Keine Auswahl getroffen</li>
                )}
              {agentData?.settings?.notifications?.emailNotifications?.documentsSubmitted && (
                <li style={{ marginBottom: 8 }}>✓ Angefragte Dokumente wurden nachgereicht</li>
              )}
              {agentData?.settings?.notifications?.emailNotifications?.applicationShared && (
                <li style={{ marginBottom: 8 }}>✓ An mich geteilte Anträge von Team-Mitgliedern</li>
              )}
              {agentData?.settings?.notifications?.emailNotifications?.applicationAssigned && (
                <li style={{ marginBottom: 8 }}>✓ Neue an mich zugewiesene Anträge</li>
              )}
              {agentData?.role === 'agent' && agentData?.settings?.notifications?.emailNotifications?.adminMessage && (
                <li style={{ marginBottom: 8 }}>✓ Admin-Aufforderungen (MFA und Passwort-Einstellungen)</li>
              )}
            </ul>

            <h6 style={{ marginTop: 16, marginBottom: 16, fontWeight: 500 }}>Benachrichtigungen über alle neue Anträge erhalten:</h6>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {!(agentData?.settings?.notifications?.newApplications?.enabled ||
                  agentData?.settings?.notifications?.newApplications?.email
                ) && (
                  <li style={{ marginBottom: 8, color: '#888' }}>Keine Auswahl getroffen</li>
                )}
              {agentData?.settings?.notifications?.newApplications?.enabled && (
                <li style={{ marginBottom: 8 }}>✓ Im Posteingang</li>
              )}
              {agentData?.settings?.notifications?.newApplications?.email && (
                <li style={{ marginBottom: 8 }}>✓ Per E-Mail</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Assignment Rules Card - Only visible for non-admin users */}
      {agentData?.role !== 'admin' && agentData?.role !== 'owner' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, marginBottom: 24 }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 style={{ marginBottom: 4, fontWeight: 500, fontSize: '1.2rem', color: '#064497' }}>Zuweisungsregeln</h1>
              <p style={{ color: '#666', margin: 0, marginTop: 16 }}>
                Diese Regeln wurden von Ihrem Admin für Sie festgelegt. Um eine Änderung zu beantragen kontaktieren Sie{' '}
                <strong>
                  {(() => {
                    const admins = teamMembers.filter(m => m.role === 'admin' || m.role === 'owner');
                    if (admins.length === 0) return 'Ihren Administrator';
                    return admins.map((admin, index) => {
                      const name = admin.name || admin.email;
                      if (index === 0) return name;
                      if (index === admins.length - 1) return ` oder ${name}`;
                      return `, ${name}`;
                    }).join('');
                  })()}
                </strong>
              </p>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="mb-2">
              
              {cityData?.settings?.assignmentRules ? (
                <div className="mt-3">
                  <div style={{ 
                    background: '#f4f7fb', 
                    borderRadius: 8, 
                    padding: '16px 20px',
                    marginBottom: 16
                  }}>
                    <div style={{ fontWeight: 500, color: '#064497', marginBottom: 8 }}>
                      {(() => {
                        const filterTypeLabels: Record<'type' | 'postcode' | 'household' | 'employment', string> = {
                          type: 'Fördervariante',
                          postcode: 'Postleitzahl',
                          household: 'Haushaltsgröße',
                          employment: 'Beschäftigungsart'
                        };
                        const filterTypeRaw = cityData.settings.assignmentRules.filterType;
                        const filterType: 'type' | 'postcode' | 'household' | 'employment' =
                          filterTypeRaw === 'type' || filterTypeRaw === 'postcode' || filterTypeRaw === 'household' || filterTypeRaw === 'employment'
                            ? filterTypeRaw
                            : 'type';
                        return `Filtertyp: ${filterTypeLabels[filterType]}`;
                      })()}
                    </div>
                  </div>
                  <div>
                    {(() => {
                      // Filter rules for current user
                      const userRules = Object.entries(cityData.settings.assignmentRules.rules)
                        .filter(([_, agentId]) => agentId === agentData?.id);

                      if (userRules.length === 0) {
                        return (
                          <div style={{ 
                            background: '#f4f7fb', 
                            borderRadius: 8, 
                            padding: '16px 20px',
                            color: '#666'
                          }}>
                            Keine Regeln für Sie definiert
                          </div>
                        );
                      }

                      return userRules.map(([key, _]) => {
                        let label = key;
                        if (cityData.settings.assignmentRules.filterType === 'type') {
                          label = TYPE_LABELS[key] || key;
                        } else if (cityData.settings.assignmentRules.filterType === 'employment') {
                          label = EMPLOYMENT_LABELS[key] || key;
                        } else if (cityData.settings.assignmentRules.filterType === 'household') {
                          label = HOUSEHOLD_LABELS[key] || key;
                        }
                        return (
                          <div key={key} style={{
                            background: '#f4f7fb',
                            borderRadius: 8,
                            padding: '16px 20px',
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontWeight: 500, minWidth: 180 }}>{label}:</span>
                            <span style={{ marginLeft: 12 }}>Ihnen zugewiesen</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  background: '#f4f7fb', 
                  borderRadius: 8, 
                  padding: '16px 20px',
                  marginTop: 12,
                  color: '#666'
                }}>
                  Keine Regeln definiert
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings */}
      {isAdminOrOwner && (
        <>
          {/* City Settings Card */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, marginBottom: 24 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h1 style={{ color: '#064497', marginBottom: 0, fontSize: '1.2rem', fontWeight: 500 }}>Zuweisungseinstellungen</h1>
              <Button
                variant={isEditingCitySettings ? "outline-secondary" : "outline-primary"}
                onClick={() => {
                  if (isEditingCitySettings) {
                    setTempCitySettings(cityData?.settings || {});
                  }
                  setIsEditingCitySettings(!isEditingCitySettings);
                }}
                style={{ borderColor: '#064497', color: '#064497' }}
                className={isEditingCitySettings ? "btn-cancel" : "btn-primary-outline"}
              >
                {isEditingCitySettings ? 'Abbrechen' : 'Bearbeiten'}
              </Button>
            </div>

            {isEditingCitySettings ? (
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 600, color: '#064497' }}>Filtertyp</Form.Label>
                  <Form.Select
                    value={tempCitySettings?.assignmentRules?.filterType || ''}
                    onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                      ...prev,
                      assignmentRules: {
                        filterType: e.target.value as 'type' | 'postcode' | 'household' | 'employment',
                        rules: {}
                      }
                    }))}
                    className="mb-3"
                  >
                    <option value="">Filtertyp auswählen</option>
                    <option value="type">Fördervariante</option>
                    <option value="postcode">Postleitzahl</option>
                    <option value="household">Haushaltsgröße</option>
                    <option value="employment">Beschäftigungsart</option>
                  </Form.Select>
                </Form.Group>
                {tempCitySettings?.assignmentRules?.filterType && (
                  <div style={{ background: '#f4f7fb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 500, color: '#064497', marginBottom: 12 }}>
                      {(() => {
                        const filterTypeLabels: Record<'type' | 'postcode' | 'household' | 'employment', string> = {
                          type: 'Fördervariante',
                          postcode: 'Postleitzahl',
                          household: 'Haushaltsgröße',
                          employment: 'Beschäftigungsart'
                        };
                        const filterTypeRaw = tempCitySettings.assignmentRules.filterType;
                        const filterType: 'type' | 'postcode' | 'household' | 'employment' =
                          filterTypeRaw === 'type' || filterTypeRaw === 'postcode' || filterTypeRaw === 'household' || filterTypeRaw === 'employment'
                            ? filterTypeRaw
                            : 'type';
                        return `Fälle für ${filterTypeLabels[filterType]} zuweisen:`;
                      })()}
                    </div>
                    {/* Case dropdowns here (existing code for each filter type) */}
                    {tempCitySettings.assignmentRules.filterType === 'type' && (
                      <div className="mb-3">
                        {Object.entries(TYPE_LABELS).map(([type, label]) => (
                          <div key={type} className="mb-2">
                            <Form.Label>{label}</Form.Label>
                            <Form.Select
                              value={tempCitySettings.assignmentRules?.rules[type] || ''}
                              onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                                ...prev,
                                assignmentRules: {
                                  ...prev.assignmentRules!,
                                  rules: {
                                    ...prev.assignmentRules!.rules,
                                    [type]: e.target.value
                                  }
                                }
                              }))}
                            >
                              <option value="">Sachbearbeiter auswählen</option>
                              {teamMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name || member.email}
                                </option>
                              ))}
                            </Form.Select>
                          </div>
                        ))}
                      </div>
                    )}
                    {tempCitySettings.assignmentRules.filterType === 'postcode' && (
                      <div className="mb-3">
                        {Object.entries(postcodeMap).map(([postcode, data]) => (
                          <div key={postcode} className="mb-2">
                            <Form.Label>{postcode}</Form.Label>
                            <Form.Select
                              value={tempCitySettings.assignmentRules?.rules[postcode] || ''}
                              onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                                ...prev,
                                assignmentRules: {
                                  ...prev.assignmentRules!,
                                  rules: {
                                    ...prev.assignmentRules!.rules,
                                    [postcode]: e.target.value
                                  }
                                }
                              }))}
                            >
                              <option value="">Sachbearbeiter auswählen</option>
                              {teamMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name || member.email}
                                </option>
                              ))}
                            </Form.Select>
                          </div>
                        ))}
                      </div>
                    )}
                    {tempCitySettings.assignmentRules.filterType === 'household' && (
                      <div className="mb-3">
                        <div className="mb-2">
                          <Form.Label>1 Erwachsene/r, keine Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['1_0'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '1_0': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>2 Erwachsene, keine Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['2_0'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '2_0': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>3+ Erwachsene, keine Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['3+_0'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '3+_0': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>1 Erwachsene/r, 1 Kind</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['1_1'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '1_1': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>1 Erwachsene/r, 2 Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['1_2'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '1_2': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>1 Erwachsene/r, 3+ Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['1_3+'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '1_3+': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>2 Erwachsene, 1 Kind</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['2_1'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '2_1': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>2 Erwachsene, 2 Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['2_2'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '2_2': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>2 Erwachsene, 3+ Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['2_3+'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '2_3+': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>3+ Erwachsene, 1 Kind</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['3+_1'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '3+_1': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>3+ Erwachsene, 2 Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['3+_2'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '3+_2': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>3+ Erwachsene, 3+ Kinder</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['3+_3+'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  '3+_3+': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                      </div>
                    )}
                    {tempCitySettings.assignmentRules.filterType === 'employment' && (
                      <div className="mb-3">
                        <div className="mb-2">
                          <Form.Label>Arbeiterinnen und Arbeiter</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['worker'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'worker': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Angestellte</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['employee'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'employee': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Beamtinnen und Beamte</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['civil-servant'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'civil-servant': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Auszubildende</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['apprentice'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'apprentice': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Rentnerinnen/Pensionärinnen und Rentner/Pensionäre</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['retired'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'retired': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Arbeitslos</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['unemployed'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'unemployed': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Einzelkaufleute</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['sole-trader'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'sole-trader': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Gewerbetreibende</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['business-owner'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'business-owner': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Freiberuflich Tätige</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['freelancer'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'freelancer': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Landwirte</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['farmer'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'farmer': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Privatperson deren Einkommen überwiegend aus Vermögen stammt</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['private-income'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'private-income': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Studierende</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['student'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'student': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Schülerinnen und Schüler</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['pupil'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'pupil': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>Hausfrauen und Hausmänner</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['homemaker'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'homemaker': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                        <div className="mb-2">
                          <Form.Label>ohne Berufsangabe</Form.Label>
                          <Form.Select
                            value={tempCitySettings.assignmentRules?.rules['no-occupation'] || ''}
                            onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                              ...prev,
                              assignmentRules: {
                                ...prev.assignmentRules!,
                                rules: {
                                  ...prev.assignmentRules!.rules,
                                  'no-occupation': e.target.value
                                }
                              }
                            }))}
                          >
                            <option value="">Sachbearbeiter auswählen</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </Form.Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  variant="primary"
                  onClick={handleCitySettingsSave}
                  style={{ background: '#064497', border: 'none' }}
                >
                  Speichern
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-2">
                  <strong style={{ fontWeight: 600, color: '#222' }}>Zuweisungsregeln:</strong>
                  {!cityData?.settings?.assignmentRules?.filterType ? (
                    <div style={{ color: '#888', marginTop: 8 }}>Keine Zuweisungsregel definiert</div>
                  ) : Object.keys(cityData.settings.assignmentRules.rules || {}).length === 0 ? (
                    <div style={{ color: '#888', marginTop: 8 }}>Keine Fälle zugewiesen</div>
                  ) : (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 600, color: '#064497', marginBottom: 8 }}>
                        {(() => {
                          const filterTypeLabels: Record<'type' | 'postcode' | 'household' | 'employment', string> = {
                            type: 'Fördervariante',
                            postcode: 'Postleitzahl',
                            household: 'Haushaltsgröße',
                            employment: 'Beschäftigungsart'
                          };
                          const filterTypeRaw = cityData.settings.assignmentRules.filterType;
                          const filterType: 'type' | 'postcode' | 'household' | 'employment' =
                            filterTypeRaw === 'type' || filterTypeRaw === 'postcode' || filterTypeRaw === 'household' || filterTypeRaw === 'employment'
                              ? filterTypeRaw
                              : 'type';
                          return `Filtertyp: ${filterTypeLabels[filterType]}`;
                        })()}
                      </div>
                      <div>
                        {Object.entries(cityData.settings.assignmentRules.rules).map(([key, agentId]) => {
                          const agent = teamMembers.find(m => m.id === agentId);
                          let label = key;
                          if (cityData.settings.assignmentRules.filterType === 'type') {
                            label = TYPE_LABELS[key] || key;
                          } else if (cityData.settings.assignmentRules.filterType === 'employment') {
                            label = EMPLOYMENT_LABELS[key] || key;
                          } else if (cityData.settings.assignmentRules.filterType === 'household') {
                            label = HOUSEHOLD_LABELS[key] || key;
                          }
                          return (
                            <div key={key} style={{
                              background: '#f4f7fb',
                              borderRadius: 8,
                              padding: '10px 16px',
                              marginBottom: 12,
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontWeight: 500, minWidth: 180 }}>{label}:</span>
                              <span style={{ marginLeft: 12 }}>{agent?.name || agent?.email || <span style={{ color: '#888' }}>Nicht zugewiesen</span>}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* City Settings Card - Deletion Settings */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, marginBottom: 24 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h1 style={{ color: '#064497', marginBottom: 0, fontSize: '1.2rem', fontWeight: 500 }}>Stadteinstellungen</h1>
              <Button
                variant={isEditingDeletionSettings ? "outline-secondary" : "outline-primary"}
                onClick={() => {
                  if (isEditingDeletionSettings) {
                    setTempCitySettings(cityData?.settings || {});
                  }
                  setIsEditingDeletionSettings(!isEditingDeletionSettings);
                }}
                style={{ borderColor: '#064497', color: '#064497' }}
                className={isEditingDeletionSettings ? "btn-cancel" : "btn-primary-outline"}
              >
                {isEditingDeletionSettings ? 'Abbrechen' : 'Bearbeiten'}
              </Button>
            </div>

            {isEditingDeletionSettings ? (
              <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <Form.Group className="mb-3">
                  <Form.Label>Löschzeitraum für abgeschlossene Anträge (in Tagen)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={tempCitySettings?.deletionTime || 0}
                    onChange={(e) => setTempCitySettings((prev: CityData['settings']) => ({
                      ...prev,
                      deletionTime: parseInt(e.target.value) || 0
                    }))}
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  onClick={handleCitySettingsSave}
                  style={{ background: '#064497', border: 'none' }}
                >
                  Speichern
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-2">
                  <strong>Löschzeitraum für abgeschlossene Anträge:</strong> {cityData?.settings?.deletionTime || 0} Tage
                </div>
              </div>
            )}
          </div>

          {/* Team Members Card */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h1 style={{ color: '#064497', marginBottom: 0, fontSize: '1.2rem', fontWeight: 500 }}>Sicherheits Übersicht</h1>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Table hover responsive>
                <thead style={{ background: '#F7F8FA' }}>
                  <tr>
                    <th>Name</th>
                    <th>E-Mail</th>
                    <th>Rolle</th>
                    <th>MFA</th>
                    <th>Passwortänderung vor</th>
                    <th>Heinweis Senden</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name || '-'}</td>
                      <td>{member.email}</td>
                      <td style={{ minWidth: 120 }}>
                        {member.role === 'owner' ? 'Eigentümer' :
                          member.role === 'admin' ? 'Administrator' :
                          member.role === 'agent' ? 'Benutzer' : 'Lesender Benutzer'}
                      </td>
                      <td>
                        <MFACircle enabled={member.mfa_enabled} />
                      </td>
                      <td>
                        {getDaysSince(member.last_password_change)}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            style={{
                              background: !member.mfa_enabled && agentData?.id !== member.id ? '#064497' : '#e0e0e0',
                              color: !member.mfa_enabled && agentData?.id !== member.id ? '#fff' : '#888',
                              border: 'none',
                              borderRadius: 6,
                              pointerEvents: agentData?.id === member.id ? 'none' : undefined,
                              opacity: !member.mfa_enabled && agentData?.id !== member.id ? 1 : 0.7,
                              boxShadow: 'none',
                            }}
                            size="sm"
                            disabled={member.mfa_enabled || agentData?.id === member.id}
                            variant="secondary"
                            onClick={() => handleSendReminder(member.id, 'mfa')}
                          >
                            MFA-Einrichten
                          </Button>
                          <Button
                            style={{
                              background: agentData?.id !== member.id ? '#064497' : '#e0e0e0',
                              color: agentData?.id !== member.id ? '#fff' : '#888',
                              border: 'none',
                              borderRadius: 6,
                              pointerEvents: agentData?.id === member.id ? 'none' : undefined,
                              opacity: agentData?.id !== member.id ? 1 : 0.7,
                              boxShadow: 'none',
                            }}
                            size="sm"
                            disabled={agentData?.id === member.id}
                            variant="secondary"
                            onClick={() => handleSendReminder(member.id, 'password')}
                          >
                            Passwort-Erneuern
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>

          {/* Eigentümer Einstellungen Card */}
          {isOwner && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, marginTop: 24 }}>
              <h1 style={{ color: '#064497', fontSize: '1.2rem', fontWeight: 500 }}>Eigentümer Einstellungen</h1>
              <p style={{ color: '#666', marginTop: 12, marginBottom: 24 }}>
                Benutzer mit der Rolle <b>Eigentümer</b> können hier die Rollen der restlichen Team-Mitglieder anpassen. Eigentümer verfügen über alle Funktionen wie Admins, können jedoch keine weiteren Eigentümer bestimmen. Bitte wenden Sie sich an Fördercheck.NRW, falls Sie einen neuen Eigentümer benötigen.<br /><br />
                <b>Admins</b> können Zuweisungsregeln anpassen, Anträge manuell zuweisen, Stadteinstellungen anpassen, Teamdaten einsehen, sowie alle Funktionen der Benutzer nutzen.<br /><br />
                <b>Benutzer</b> können Anträge bearbeiten und persönliche Einstellungen anpassen.<br /><br />
                <b>Lesende Benutzer</b> können Anträge nur über die Plattform einsehen, jedoch nicht bearbeiten oder herunterladen.
              </p>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Team-Mitglied auswählen</Form.Label>
                  <Form.Select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                  >
                    <option value="">Bitte wählen...</option>
                    {teamMembers.filter(m => m.id !== agentData?.id && m.role !== 'owner').map(m => (
                      <option key={m.id} value={m.id}>{m.name || m.email}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Neue Rolle auswählen</Form.Label>
                  <Form.Select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value as 'admin' | 'agent' | 'readonly')}
                  >
                    <option value="">Bitte wählen...</option>
                    <option value="admin">Administrator</option>
                    <option value="agent">Benutzer</option>
                    <option value="readonly">Lesender Benutzer</option>
                  </Form.Select>
                </Form.Group>
                <Button
                  variant="primary"
                  style={{ background: '#064497', border: 'none' }}
                  disabled={!selectedUserId || !selectedRole}
                  onClick={handleOwnerRoleChange}
                >
                  Rolle zuweisen
                </Button>
                {ownerRoleChangeError && (
                  <Alert variant="danger" className="mt-3" onClose={() => setOwnerRoleChangeError(null)} dismissible>
                    {ownerRoleChangeError}
                  </Alert>
                )}
                {ownerRoleChangeSuccess && (
                  <Alert variant="success" className="mt-3" onClose={() => setOwnerRoleChangeSuccess(null)} dismissible>
                    {ownerRoleChangeSuccess}
                  </Alert>
                )}
              </Form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GovernmentSettingsPage; 