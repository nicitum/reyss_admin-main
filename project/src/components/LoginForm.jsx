import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import toast from 'react-hot-toast';
import { CircleUser, KeyRound } from 'lucide-react';
import { jwtDecode } from "jwt-decode";

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const role = 'superadmin'; // Set role to 'superadmin' and make it constant
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Attempting login with:", { username, password, selectedRole: role });

      const response = await login(username, password); // API call
      console.log("Response from backend:", response);

      if (!response.token) {
        console.error("Login failed: No token received");
        toast.error("Unexpected error. Please try again.");
        return;
      }

      // Decode JWT token
      const decodedToken = jwtDecode(response.token);
      console.log("Decoded Token:", decodedToken);

      if (!decodedToken.role) {
        console.error("Decoded token missing role!");
        toast.error("Unexpected error: Role not found.");
        return;
      }

      // Validate role
      if (decodedToken.role !== role) {
        console.warn(`Access Denied: Expected Role - ${role}, Actual Role - ${decodedToken.role}`);
        toast.error(`Access Denied: You are not a ${role}`);
        return;
      }

      // Store token & role in local storage
      localStorage.setItem("token", response.token);
      localStorage.setItem("role", decodedToken.role);

      toast.success("Login successful!");
      navigate("/dashboard/ordersummary");
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Gradient Header */}
      <h1 className="text-4xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 text-transparent bg-clip-text mb-8">
        SL Enterprisess
      </h1>

      <div className="max-w-md w-full space-y-8">
        <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative">
              <CircleUser className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Username"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-red-600 to-yellow-500 hover:opacity-90`}
            >
              Sign in as Super Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}