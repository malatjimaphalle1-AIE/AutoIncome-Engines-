const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/auth';

export const authService = {
  signup: async (userData: { email: string; password: string; name?: string }) => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      return data;
    } catch (error) {
      console.error('Signup Error:', error);
      throw error;
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      return data;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  me: async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user');
      }
      return data;
    } catch (error) {
      console.error('Me Error:', error);
      throw error;
    }
  }
};
