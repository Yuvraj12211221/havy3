import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { DictationProvider } from './contexts/DictationContext';

import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import ChatbotWidget from './components/Chatbot/ChatbotWidget';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PricingSelect from './pages/PricingSelect';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Payment from './pages/Payment';

import DictationToggle from './components/Dictation/DictationToggle';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return !user ? <>{children}</> : <Navigate to="/dashboard" />;
};

// Wrapper component for subscription provider
const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <SubscriptionProvider userId={user?.id}>
      <DictationProvider>
        <div className="min-h-screen flex flex-col">
          <Header />

            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />

                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />

                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <Signup />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/pricing-select"
                  element={
                    <ProtectedRoute>
                      <PricingSelect />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/payment"
                  element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>

            <Footer />

            <DictationToggle />
            
            <ChatbotWidget 
              rasaServerUrl="http://localhost:5005"
              businessName="HAVY AI Services"
              position="bottom-right"
              primaryColor="#6366f1"
            />
          </div>
        </DictationProvider>
      </SubscriptionProvider>
    );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;