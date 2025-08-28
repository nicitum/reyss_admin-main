import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getAllRoutes } from "../../services/api";

export default function EditUserModal({ user, editForm, onEditFormChange, onClose, onSave }) {
  const [routes, setRoutes] = useState([]);
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")); // Get logged-in user info

  // Fetch routes on component mount
  useEffect(() => {
    fetchRoutes();
  }, []);

  // Fetch all routes
  const fetchRoutes = async () => {
    try {
      const response = await getAllRoutes();
      if (response.message === "All routes fetched successfully") {
        setRoutes(response.routes || []);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to fetch routes');
    }
  };

  if (!user) return null;

  // Handle role change for superadmins only
  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    onEditFormChange({ ...editForm, role: selectedRole });
  };

  // Use editForm if available, otherwise fall back to user data
  const formData = editForm || {
    name: user.name || "",
    phone: user.phone || "",
    delivery_address: user.delivery_address || "",
    route: user.route || "",
    price_tier: user.price_tier || "",
    role: user.role || "user",
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h3 className="text-lg font-medium mb-4">Edit User</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => onEditFormChange({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => onEditFormChange({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
            <input
              type="text"
              placeholder="Enter delivery address"
              value={formData.delivery_address}
              onChange={(e) => onEditFormChange({ ...formData, delivery_address: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Route
            </label>
            <select
              value={formData.route}
              onChange={(e) => onEditFormChange({ ...formData, route: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a route</option>
              {routes.map((route, index) => (
                <option key={index} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price Tier</label>
            <select
              value={formData.price_tier}
              onChange={(e) => onEditFormChange({ ...formData, price_tier: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select Price Tier</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
              <option value="P5">P5</option>
            </select>
          </div>

          {/* Conditionally render Role section only if logged-in user is superadmin */}
          {loggedInUser?.role === "superadmin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="flex items-center space-x-4">
                <div>
                  <input
                    type="radio"
                    id="admin"
                    name="role"
                    value="admin"
                    checked={formData.role === "admin"}
                    onChange={handleRoleChange}
                    className="mr-2"
                  />
                  <label htmlFor="admin" className="text-sm text-gray-700">Admin</label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="user"
                    name="role"
                    value="user"
                    checked={formData.role === "user"}
                    onChange={handleRoleChange}
                    className="mr-2"
                  />
                  <label htmlFor="user" className="text-sm text-gray-700">User</label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}