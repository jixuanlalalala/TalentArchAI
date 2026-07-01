import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {AuthProvider, useAuth } from './context/AuthContext';
import SignUp from './components/SignUp';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';

const Navigation = () => {
  const {user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // return (
  //   <nav>
  //     {user ? (
  //       <>
  //         <span>Welcome, {user.email}</span>
  //         <button onClick={handleSignOut}>Sign Out</button>
  //       </>
  //     ) : (
  //       <Link to="/signup">Sign Up</Link>
  //     )}
  //   </nav>
  // );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
