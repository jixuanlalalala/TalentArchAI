import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {AuthProvider, useAuth } from './context/AuthContext';
import SignUp from './components/SignUp';

const Navigation = () => {
  const {user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav>
      {user ? (
        <>
          <span>Welcome, {user.email}</span>
          <button onClick={handleSignOut}>Sign Out</button>
        </>
      ) : (
        <Link to="/signup">Sign Up</Link>
      )}
    </nav>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
