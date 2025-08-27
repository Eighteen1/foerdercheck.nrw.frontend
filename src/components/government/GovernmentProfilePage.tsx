import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import { useAutoLogoutContext } from '../../contexts/AutoLogoutContext';
import './GovernmentProfilePage.css';

interface AgentData {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'agent' | 'readonly' | 'owner';
  mfa_enabled: boolean;
  city_id: string | null;
  settings?: {
    auto_logout?: {
      enabled: boolean;
      timeout_minutes: number;
    };
  };
}

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'agent' | 'readonly' | 'owner';
}

const GovernmentProfilePage: React.FC = () => {
  const { settings: autoLogoutSettings, updateSettings } = useAutoLogoutContext();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSettingUpMFA, setIsSettingUpMFA] = useState(false);
  const [mfaData, setMfaData] = useState({
    qrCode: '',
    secret: '',
    verificationCode: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isEditingAutoLogout, setIsEditingAutoLogout] = useState(false);
  const [autoLogoutData, setAutoLogoutData] = useState({
    enabled: false,
    timeout_minutes: 30
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (agentData?.settings?.auto_logout) {
      setAutoLogoutData(agentData.settings.auto_logout);
    }
  }, [agentData]);

  useEffect(() => {
    if (autoLogoutSettings) {
      setAutoLogoutData(autoLogoutSettings);
    }
  }, [autoLogoutSettings]);

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
      setAgentData(data);
      setNewName(data.name || '');

      // Fetch team members for the same city
      const { data: teamData, error: teamError } = await supabase
        .from('agents')
        .select('id, email, name, role')
        .eq('city_id', data.city_id);

      if (teamError) throw teamError;
      setTeamMembers(teamData);
    } catch (err) {
      setError('Fehler beim Laden der Profildaten');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ name: newName })
        .eq('id', agentData?.id);

      if (error) throw error;
      setAgentData(prev => prev ? { ...prev, name: newName } : null);
      setIsEditingName(false);
      setSuccess('Name erfolgreich aktualisiert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Aktualisieren des Namens');
      console.error('Error updating name:', err);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Die Passwörter stimmen nicht überein');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      // Update the last_password_change in the agents table
      const { error: updateError } = await supabase
        .from('agents')
        .update({ last_password_change: new Date().toISOString() })
        .eq('id', agentData?.id);

      if (updateError) throw updateError;

      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Passwort erfolgreich geändert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Ändern des Passworts');
      console.error('Error changing password:', err);
    }
  };

  const handleMFASetup = async () => {
    try {
      if (!mfaData.verificationCode) {
        setError('Bitte geben Sie den Verifizierungscode ein');
        return;
      }

      // First challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaData.secret
      });

      if (challengeError) throw challengeError;

      // Then verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaData.secret,
        challengeId: challengeData.id,
        code: mfaData.verificationCode
      });

      if (verifyError) throw verifyError;

      await supabase
        .from('agents')
        .update({ mfa_enabled: true })
        .eq('id', agentData?.id);

      setAgentData(prev => prev ? { ...prev, mfa_enabled: true } : null);
      setIsSettingUpMFA(false);
      setMfaData({ qrCode: '', secret: '', verificationCode: '' });
      setSuccess('Zwei-Faktor-Authentifizierung erfolgreich eingerichtet');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Einrichten der Zwei-Faktor-Authentifizierung: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
      console.error('Error setting up MFA:', err);
    }
  };

  const startMFASetup = async () => {
    try {
      // First, get existing factors
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;

      // If there's an existing TOTP factor, unenroll it first
      const existingFactor = data?.totp?.[0];
      if (existingFactor) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: existingFactor.id
        });
        if (unenrollError) throw unenrollError;
      }

      // Now enroll for a new factor
      const { data: enrollData, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });

      if (error) throw error;
      
      // Convert the TOTP URI to a QR code data URL
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(enrollData.totp.uri)}`;
      
      setMfaData(prev => ({ ...prev, qrCode: qrCodeUrl, secret: enrollData.id }));
      setIsSettingUpMFA(true);
    } catch (err) {
      setError('Fehler beim Starten der MFA-Einrichtung: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
      console.error('Error starting MFA setup:', err);
    }
  };

  const handleDisableMFA = async () => {
    try {
      // Get the TOTP factor
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = data?.totp?.[0];
      if (!totpFactor) {
        setError("Kein MFA-Faktor gefunden.");
        return;
      }

      // Unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id
      });

      if (unenrollError) throw unenrollError;

      // Update the agent record
      await supabase
        .from('agents')
        .update({ mfa_enabled: false })
        .eq('id', agentData?.id);

      setAgentData(prev => prev ? { ...prev, mfa_enabled: false } : null);
      setSuccess('Zwei-Faktor-Authentifizierung erfolgreich deaktiviert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Deaktivieren der Zwei-Faktor-Authentifizierung: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
      console.error('Error disabling MFA:', err);
    }
  };

  const handleAutoLogoutUpdate = async () => {
    try {
      await updateSettings(autoLogoutData);
      setIsEditingAutoLogout(false);
      setSuccess('Auto-Logout-Einstellungen erfolgreich aktualisiert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Aktualisieren der Auto-Logout-Einstellungen');
      console.error('Error updating auto-logout settings:', err);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" style={{ color: '#064497' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
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

      {/* Personal Information Card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, marginBottom: 24 }}>
        <h1 style={{ color: '#064497', marginBottom: 16, fontSize: '1.2rem', fontWeight: 500 }}>Persönliche Informationen</h1>
        
        <div style={{ marginBottom: 16 }}>
          <Form.Label style={{ fontWeight: 500 }}>Name</Form.Label>
          {isEditingName ? (
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ihr Name"
              />
              <Button
                variant="primary"
                onClick={handleNameUpdate}
                style={{ background: '#064497', border: 'none' }}
              >
                Speichern
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setIsEditingName(false);
                  setNewName(agentData?.name || '');
                }}
                className="btn-cancel"
              >
                Abbrechen
              </Button>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <div style={{ flex: 1 }}>
                {agentData?.name || 'Kein Name gesetzt'}
              </div>
              <Button
                variant="link"
                onClick={() => setIsEditingName(true)}
                style={{ color: '#064497', padding: 0 }}
              >
                <span className="material-icons">edit</span>
              </Button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <Form.Label style={{ fontWeight: 500 }}>E-Mail</Form.Label>
          <div>{agentData?.email}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Form.Label style={{ fontWeight: 500 }}>Rolle</Form.Label>
          <div>
            {agentData?.role === 'admin' ? 'Administrator' :
             agentData?.role === 'agent' ? 'Benutzer' :
             agentData?.role === 'readonly' ? 'Lesender Benutzer' :
             agentData?.role === 'owner' ? 'Eigentümer' : agentData?.role}
          </div>
        </div>
      </div>

      {/* Security Card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32, marginBottom: 24 }}>
        <h1 style={{ color: '#064497', marginBottom: 16, fontSize: '1.2rem', fontWeight: 500 }}>Sicherheit</h1>

        <div style={{ marginBottom: 24 }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 style={{ marginBottom: 4, fontWeight: 500 }}>Passwort ändern</h5>
              <p style={{ color: '#666', margin: 0 }}>Aktualisieren Sie Ihr Passwort regelmäßig</p>
            </div>
            <Button
              variant={isChangingPassword ? "outline-secondary" : "outline-primary"}
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              style={{ borderColor: '#064497', color: '#064497' }}
              className={isChangingPassword ? "btn-cancel" : "btn-primary-outline"}
            >
              {isChangingPassword ? 'Abbrechen' : 'Ändern'}
            </Button>
          </div>

          {isChangingPassword && (
            <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
              <Form.Group className="mb-3">
                <Form.Label>Aktuelles Passwort</Form.Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Form.Control
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                  <Button
                    variant="link"
                    style={{
                      color: '#064497',
                      padding: 0,
                      marginLeft: 0,
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none'
                    }}
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    tabIndex={-1}
                  >
                    <span className="material-icons">
                      {showPasswords.current ? "visibility_off" : "visibility"}
                    </span>
                  </Button>
                </div>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Neues Passwort</Form.Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Form.Control
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    isInvalid={passwordData.newPassword.length > 0 && passwordData.newPassword.length < 6}
                  />
                  <Button
                    variant="link"
                    style={{
                      color: '#064497',
                      padding: 0,
                      marginLeft: 0,
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none'
                    }}
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    tabIndex={-1}
                  >
                    <span className="material-icons">
                      {showPasswords.new ? "visibility_off" : "visibility"}
                    </span>
                  </Button>
                </div>
                <Form.Control.Feedback type="invalid">
                  Das Passwort muss mindestens 6 Zeichen lang sein.
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Neues Passwort bestätigen</Form.Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Form.Control
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    isInvalid={passwordData.confirmPassword.length > 0 && passwordData.confirmPassword !== passwordData.newPassword}
                  />
                  <Button
                    variant="link"
                    style={{
                      color: '#064497',
                      padding: 0,
                      marginLeft: 0,
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none'
                    }}
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    tabIndex={-1}
                  >
                    <span className="material-icons">
                      {showPasswords.confirm ? "visibility_off" : "visibility"}
                    </span>
                  </Button>
                </div>
                <Form.Control.Feedback type="invalid">
                  Die Passwörter stimmen nicht überein.
                </Form.Control.Feedback>
              </Form.Group>
              <Button
                variant="primary"
                onClick={handlePasswordChange}
                style={{ background: '#064497', border: 'none' }}
                disabled={passwordData.newPassword.length < 6 || passwordData.newPassword !== passwordData.confirmPassword}
              >
                Passwort ändern
              </Button>
            </div>
          )}
        </div>

        <div>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 style={{ marginBottom: 4, fontWeight: 500 }}>Zwei-Faktor-Authentifizierung</h5>
              <p style={{ color: '#666', margin: 0 }}>
                {agentData?.mfa_enabled
                  ? 'Zwei-Faktor-Authentifizierung ist aktiviert'
                  : 'Erhöhen Sie die Sicherheit Ihres Kontos'}
              </p>
            </div>
            {agentData?.mfa_enabled ? (
              <Button
                variant="outline-danger"
                onClick={handleDisableMFA}
                style={{ borderColor: '#dc3545', color: '#dc3545' }}
                className="btn-danger-outline"
              >
                Deaktivieren
              </Button>
            ) : (
              <Button
                variant={isSettingUpMFA ? "outline-secondary" : "outline-primary"}
                onClick={isSettingUpMFA ? () => setIsSettingUpMFA(false) : startMFASetup}
                style={{ borderColor: '#064497', color: '#064497' }}
                className={isSettingUpMFA ? "btn-cancel" : "btn-primary-outline"}
              >
                {isSettingUpMFA ? 'Abbrechen' : 'Aktivieren'}
              </Button>
            )}
          </div>

          {isSettingUpMFA && (
            <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
              <p style={{ marginBottom: 16 }}>
                1. Scannen Sie den QR-Code mit Ihrer Authenticator-App (z.B. Google Authenticator)
              </p>
              {mfaData.qrCode && (
                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                  <img src={mfaData.qrCode} alt="MFA QR Code" style={{ maxWidth: 200 }} />
                </div>
              )}
              <Form.Group className="mb-3">
                <Form.Label>Verifizierungscode</Form.Label>
                <Form.Control
                  type="text"
                  value={mfaData.verificationCode}
                  onChange={(e) => setMfaData(prev => ({ ...prev, verificationCode: e.target.value }))}
                  placeholder="Code aus Ihrer Authenticator-App"
                />
              </Form.Group>
              <Button
                variant="primary"
                onClick={handleMFASetup}
                style={{ background: '#064497', border: 'none' }}
              >
                Verifizieren und aktivieren
              </Button>
            </div>
          )}
        </div>

        {/* Auto-Logout Section */}
        <div style={{ marginTop: 24 }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 style={{ marginBottom: 4, fontWeight: 500 }}>Auto-Logout</h5>
              <p style={{ color: '#666', margin: 0 }}>
                {autoLogoutSettings?.enabled
                  ? `Automatische Abmeldung nach ${autoLogoutSettings.timeout_minutes} Minuten Inaktivität`
                  : 'Automatische Abmeldung bei Inaktivität ist deaktiviert'}
              </p>
            </div>
            <Button
              variant={isEditingAutoLogout ? "outline-secondary" : "outline-primary"}
              onClick={() => setIsEditingAutoLogout(!isEditingAutoLogout)}
              style={{ borderColor: '#064497', color: '#064497' }}
              className={isEditingAutoLogout ? "btn-cancel" : "btn-primary-outline"}
            >
              {isEditingAutoLogout ? 'Abbrechen' : 'Ändern'}
            </Button>
          </div>

          {isEditingAutoLogout && (
            <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  id="autoLogoutEnabled"
                  label="Auto-Logout aktivieren"
                  checked={autoLogoutData.enabled}
                  onChange={(e) => setAutoLogoutData(prev => ({ ...prev, enabled: e.target.checked }))}
                />
              </Form.Group>
              
              {autoLogoutData.enabled && (
                <Form.Group className="mb-3">
                  <Form.Label>Timeout bei Inaktivität</Form.Label>
                  <div className="d-flex gap-2 align-items-center">
                    <Form.Control
                      type="number"
                      min="1"
                      max="1440"
                      value={autoLogoutData.timeout_minutes}
                      onChange={(e) => setAutoLogoutData(prev => ({ ...prev, timeout_minutes: parseInt(e.target.value) || 1 }))}
                      style={{ width: '120px' }}
                    />
                    <span style={{ color: '#666' }}>
                      {autoLogoutData.timeout_minutes === 1 ? 'Minute' : 'Minuten'}
                    </span>
                  </div>
                  <Form.Text className="text-muted">
                    Wählen Sie zwischen 1 Minute und 24 Stunden (1440 Minuten)
                  </Form.Text>
                </Form.Group>
              )}
              
              <Button
                variant="primary"
                onClick={handleAutoLogoutUpdate}
                style={{ background: '#064497', border: 'none' }}
                disabled={autoLogoutData.enabled && (autoLogoutData.timeout_minutes < 1 || autoLogoutData.timeout_minutes > 1440)}
              >
                Einstellungen speichern
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Team Overview Card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 32 }}>
        <h1 style={{ color: '#064497', marginBottom: 16, fontSize: '1.2rem', fontWeight: 500 }}>Team Übersicht</h1>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>E-Mail</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Rolle</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '12px 16px' }}>{member.name || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{member.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {member.role === 'admin' ? 'Administrator' :
                     member.role === 'agent' ? 'Benutzer' :
                     member.role === 'readonly' ? 'Lesender Benutzer' :
                     member.role === 'owner' ? 'Eigentümer' : member.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GovernmentProfilePage; 