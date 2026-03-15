import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Hero from './components/Landing/Hero';
import Login from './components/Auth/Login';
import SignUp from './components/Auth/SignUp';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import Profile from './components/Dashboard/Profile';
import ApplicationsTracker from './components/Dashboard/ApplicationsTracker';
import Analytics from './components/Dashboard/Analytics';
import Settings from './components/Dashboard/Settings';
import { Loader as Loader2 } from 'lucide-react';

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<'landing' | 'login' | 'signup' | 'dashboard'>('landing');
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('applications');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    if (screen === 'landing') {
      return <Hero onGetStarted={() => setScreen('login')} />;
    }
    return isSignUp ? (
      <SignUp onToggleMode={() => setIsSignUp(false)} onSuccess={() => setScreen('dashboard')} />
    ) : (
      <Login onToggleMode={() => setIsSignUp(true)} onSuccess={() => setScreen('dashboard')} />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'applications':
        return <ApplicationsTracker />;
      case 'analytics':
        return <Analytics />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings />;
      default:
        return <ApplicationsTracker />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
