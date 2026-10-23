import { useCallback, useState } from 'react';
import { SecurityDashboard } from './components/SecurityDashboard';
import LoadingScreenPage from './components/LoadingScreen';

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const handleLoadingComplete = useCallback(() => {
    setShowDashboard(true);
  }, []);

  if (showDashboard) {
    return <SecurityDashboard onReturnToLoader={() => setShowDashboard(false)} />;
  }

  return <LoadingScreenPage onComplete={handleLoadingComplete} />;
}
