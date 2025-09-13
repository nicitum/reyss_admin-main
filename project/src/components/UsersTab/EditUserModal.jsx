import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getRoutes } from "../../services/api";

export default function EditUserModal({ user, editForm, onEditFormChange, onClose, onSave }) {
  const [routes, setRoutes] = useState([]);
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")); // Get logged-in user info

  // Fetch routes on component mount
  useEffect(() => {
    fetchRoutes();
  }, []);

  // Fetch all routes from Route Masters CRUD API
  const fetchRoutes = async () => {
    try {
      const routesData = await getRoutes();
      setRoutes(routesData || []);
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
    delivery_sequence: user.delivery_sequence || "",
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Edit User</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Half - Basic User Information */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={(e) => onEditFormChange({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(e) => onEditFormChange({ ...formData, phone: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                    <input
                      type="text"
                      placeholder="Enter delivery address"
                      value={formData.delivery_address}
                      onChange={(e) => onEditFormChange({ ...formData, delivery_address: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Half - User Settings & Configuration */}
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-4">User Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route Assignment
                    </label>
                    <select
                      value={formData.route}
                      onChange={(e) => onEditFormChange({ ...formData, route: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select a route</option>
                      {routes.map((route) => (
                        <option key={route.id} value={route.name}>
                          {route.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Tier</label>
                    <select
                      value={formData.price_tier}
                      onChange={(e) => onEditFormChange({ ...formData, price_tier: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select Price Tier</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                      <option value="P4">P4</option>
                      <option value="P5">P5</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Sequence</label>
                    <input
                      type="number"
                      placeholder="Enter delivery sequence number"
                      value={formData.delivery_sequence}
                      onChange={(e) => onEditFormChange({ ...formData, delivery_sequence: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Conditionally render Role section only if logged-in user is superadmin */}
                  {loggedInUser?.role === "superadmin" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center">
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
                        <div className="flex items-center">
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
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}