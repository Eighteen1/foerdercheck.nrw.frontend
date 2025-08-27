import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FormProvider } from './contexts/FormContext';
import { AutoLogoutProvider } from './contexts/AutoLogoutContext';
import LandingPage from './components/LandingPage';
import ApplicationTypesPage from './components/ApplicationTypesPage';
import InitialCheckPage from './components/InitialCheckPage';
import ResultPage from './components/ResultPage';
import PersonalSpace from './components/PersonalSpace';
import LoginPage from './components/LoginPage';
import VerifyEmail from './components/VerifyEmail';
//import DocumentCheck from './components/DocumentCheck';
import DocumentUpload from './components/DocumentUpload';
import UploadDocumentPage from './pages/UploadDocumentPage';
import Layout from './components/Layout';
import AuthCallback from './components/AuthCallback';
import PasswordProtection from './components/PasswordProtection';
import PasswordProtectionMiddleware from './components/PasswordProtectionMiddleware';
import RoutingProtection from './components/RoutingProtection';
import HauptantragContainer from './components/Hauptantrag/HauptantragContainer';
import EinkommenserklaerungContainer from './components/Einkommenserklaerung/EinkommenserklaerungContainer';
import GovernmentLanding from './components/government/GovernmentLanding';
import GovernmentLogin from './components/government/GovernmentLogin';
import GovernmentDashboard from './components/government/GovernmentDashboard';
import ApplicationReviewContainer from './components/government/review/ApplicationReviewContainer';
import SelbstauskunftContainer from './components/Selbstauskunft/SelbstauskunftContainer';
import WoFIVContainer from './components/WoFIV/WoFIVContainer';
import Din277Container from './components/DIN277/Din277Container';
import SelbsthilfeContainer from './components/Selbsthilfe/SelbsthilfeContainer';
import HaushaltContainer from './components/Haushaltsauskunft/HaushaltContainer';
import ValidationPage from './components/ValidationPage';
import UserApplicationReview from './components/UserApplicationReview';
import PersoenlicheDaten from './components/PersoenlicheDaten';
import AutoLogoutActivator from './components/common/AutoLogoutActivator';

function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <PasswordProtectionMiddleware>
          <AutoLogoutProvider>
            {/* Globally activate auto-logout wherever provider is mounted */}
            <AutoLogoutActivator />
            <Layout>
              <Routes>
                <Route path="/government" element={<GovernmentLanding />} />
                <Route path="/government/login" element={<GovernmentLogin />} />
                <Route path="/government/dashboard" element={
                  <RoutingProtection>
                    <GovernmentDashboard />
                  </RoutingProtection>
                } />
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
                  <RoutingProtection>
                    <PersonalSpace />
                  </RoutingProtection>
                } />
                <Route path="/persoenliche-daten" element={
                  <RoutingProtection requireAuth>
                    <PersoenlicheDaten />
                  </RoutingProtection>
                } />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify/:token" element={<VerifyEmail />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                {/*<Route path="/document-check" element={
                  <RoutingProtection requireAuth>
                    <DocumentCheck />
                  </RoutingProtection>
                } />*/}
                <Route path="/document-upload" element={
                  <RoutingProtection requireAuth>
                    <DocumentUpload />
                  </RoutingProtection>
                } />
                <Route path="/hauptantrag" element={
                  <RoutingProtection requireAuth>
                    <HauptantragContainer />
                  </RoutingProtection>
                } />
                <Route path="/einkommenserklaerung" element={
                  <RoutingProtection requireAuth>
                    <EinkommenserklaerungContainer />
                  </RoutingProtection>
                } />
                <Route path="/selbstauskunft" element={
                  <RoutingProtection requireAuth>
                    <SelbstauskunftContainer />
                  </RoutingProtection>
                } />
                <Route path="/wofiv" element={
                  <RoutingProtection requireAuth>
                    <WoFIVContainer />
                  </RoutingProtection>
                } />
                <Route path="/din277" element={
                  <RoutingProtection requireAuth>
                    <Din277Container />
                  </RoutingProtection>
                } />
                <Route path="/selbsthilfe" element={
                  <RoutingProtection requireAuth>
                    <SelbsthilfeContainer />
                  </RoutingProtection>
                } />
                <Route path="/haushaltsauskunft" element={
                  <RoutingProtection requireAuth>
                    <HaushaltContainer />
                  </RoutingProtection>
                } />
                <Route path="/upload-document/:token" element={<UploadDocumentPage />} />
                <Route path="/validation" element={
                  <RoutingProtection requireAuth>
                    <ValidationPage />
                  </RoutingProtection>
                } />
                <Route path="/view-application" element={
                  <RoutingProtection requireAuth>
                    <UserApplicationReview />
                  </RoutingProtection>
                } />
              </Routes>
            </Layout>
          </AutoLogoutProvider>
        </PasswordProtectionMiddleware>
      </FormProvider>
    </AuthProvider>
  );
}

export default App;
