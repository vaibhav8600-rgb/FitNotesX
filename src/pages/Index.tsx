import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Home page
    navigate('/home', { replace: true });
  }, [navigate]);

  return null;
};

export default Index;
