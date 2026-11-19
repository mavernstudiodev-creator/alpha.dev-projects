import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { ThemeProvider } from './contexts/ThemeContext';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { SourcesInfoPage } from './pages/SourcesInfoPage';
import { SignInPage } from './pages/SignInPage';
import { RegisterPage } from './pages/RegisterPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { WorkspacePreviewPage } from './pages/WorkspacePreviewPage';

// Application Workspace Layout & Pages
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { VerificationResultsPage } from './pages/VerificationResultsPage';
import { ClaimDetailsPage } from './pages/ClaimDetailsPage';
import { HumanReviewPage } from './pages/HumanReviewPage';
import { DocumentHistoryPage } from './pages/DocumentHistoryPage';
import { SourcesPage } from './pages/SourcesPage';
import { ReportExportPage } from './pages/ReportExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { AssistantPage } from './pages/AssistantPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Website */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/sources-info" element={<SourcesInfoPage />} />
            <Route path="/login" element={<SignInPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/workspace-preview" element={<WorkspacePreviewPage />} />

            {/* Application Workspace Shell */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/overview" element={<Navigate to="/dashboard" replace />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/new-analysis" element={<Navigate to="/upload" replace />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:docId" element={<VerificationResultsPage />} />
              <Route path="/workspace/:docId" element={<VerificationResultsPage />} />
              <Route path="/documents/:docId/claims/:claimId" element={<ClaimDetailsPage />} />
              <Route path="/documents/:docId/review" element={<HumanReviewPage />} />
              <Route path="/documents/:docId/export" element={<ReportExportPage />} />
              <Route path="/reports" element={<ReportExportPage />} />
              <Route path="/history" element={<DocumentHistoryPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
