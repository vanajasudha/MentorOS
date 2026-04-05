import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mentor_token'));
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('mentor_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check expiry
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setUser({ id: decoded.sub }); // Sub is user_id
          fetchUserProfile(token);
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, [token]);

  const fetchUserProfile = async (authToken) => {
    try {
      const res = await axios.get('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
  };

  const login = (newToken) => {
    localStorage.setItem('mentor_token', newToken);
    setToken(newToken);
  };


  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
