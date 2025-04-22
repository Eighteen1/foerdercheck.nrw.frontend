import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FormProvider } from './contexts/FormContext';
import LandingPage from './components/LandingPage';
import ApplicationTypesPage from './components/ApplicationTypesPage';
import InitialCheckPage from './components/InitialCheckPage';
import ResultPage from './components/ResultPage';
import PersonalSpace from './components/PersonalSpace';
import LoginPage from './components/LoginPage';
import VerifyEmail from './components/VerifyEmail';
import DocumentCheck from './components/DocumentCheck';
import DocumentUpload from './components/DocumentUpload';
import Layout from './components/Layout';
import AuthCallback from './components/AuthCallback';
import PasswordProtection from './components/PasswordProtection';
import PasswordProtectionMiddleware from './components/PasswordProtectionMiddleware';
import RoutingProtection from './components/RoutingProtection';

function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <PasswordProtectionMiddleware>
          <Layout>
            <Routes>
              <Route path="/password-protection" element={<PasswordProtection />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/application-types" element={<ApplicationTypesPage />} />
              <Route path="/initial-check" element={<InitialCheckPage />} />
              <Route path="/ic-results" element={
                <RoutingProtection>
                  <ResultPage />
                </RoutingProtection>
              } />
              <Route path="/personal-space" element={
                <RoutingProtection requireAuth>
                  <PersonalSpace />
                </RoutingProtection>
              } />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify/:token" element={<VerifyEmail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/document-check" element={
                <RoutingProtection requireAuth>
                  <DocumentCheck />
                </RoutingProtection>
              } />
              <Route path="/document-upload" element={
                <RoutingProtection requireAuth>
                  <DocumentUpload />
                </RoutingProtection>
              } />
            </Routes>
          </Layout>
        </PasswordProtectionMiddleware>
      </FormProvider>
    </AuthProvider>
  );
}

export default App;
