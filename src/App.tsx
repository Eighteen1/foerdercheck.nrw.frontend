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

function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/application-types" element={<ApplicationTypesPage />} />
            <Route path="/initial-check" element={<InitialCheckPage />} />
            <Route path="/ic-results" element={<ResultPage />} />
            <Route path="/personal-space" element={<PersonalSpace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify/:token" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/document-check" element={<DocumentCheck />} />
            <Route path="/document-upload" element={<DocumentUpload />} />
          </Routes>
        </Layout>
      </FormProvider>
    </AuthProvider>
  );
}

export default App;
