import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getRoutes, checkUniqueDeliverySequence } from "../../services/api";
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Hash, 
  Route,
  UserCheck,
  UserX,
  Save,
  X
} from "lucide-react";

export default function EditUserModal({ user, editForm, onEditFormChange, onClose, onSave }) {
  const [routes, setRoutes] = useState([]);
  const [deliverySequenceError, setDeliverySequenceError] = useState("");
  const [checkingSequence, setCheckingSequence] = useState(false);
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

  // Check delivery sequence uniqueness
  const checkDeliverySequenceUniqueness = async (route, deliverySequence) => {
    if (!route || !deliverySequence) {
      setDeliverySequenceError("");
      return;
    }

    // Clear previous errors
    setDeliverySequenceError("");
    setCheckingSequence(true);

    try {
      const response = await checkUniqueDeliverySequence(route, deliverySequence, user.customer_id);
      
      if (response.conflict) {
        setDeliverySequenceError(response.message);
      } else {
        setDeliverySequenceError(""); // Clear error if no conflict
      }
    } catch (error) {
      // Handle conflict error (409) specifically
      if (error.response && error.response.status === 409) {
        const conflictData = error.response.data;
        setDeliverySequenceError(conflictData.message);
      } else {
        console.error('Error checking delivery sequence uniqueness:', error);
        setDeliverySequenceError("Error checking delivery sequence uniqueness");
      }
    } finally {
      setCheckingSequence(false);
    }
  };

  // Handle delivery sequence change with debounce
  const handleDeliverySequenceChange = (e) => {
    const value = e.target.value;
    onEditFormChange({ ...editForm, delivery_sequence: value });

    // Clear previous error immediately when user types
    setDeliverySequenceError("");

    // Check uniqueness with debounce
    if (editForm.route && value) {
      // Debounce the API call
      clearTimeout(window.deliverySequenceCheckTimeout);
      window.deliverySequenceCheckTimeout = setTimeout(() => {
        checkDeliverySequenceUniqueness(editForm.route, value);
      }, 500);
    }
  };

  // Handle route change
  const handleRouteChange = (e) => {
    const route = e.target.value;
    onEditFormChange({ ...editForm, route: route });

    // Check delivery sequence uniqueness when route changes
    if (editForm.delivery_sequence) {
      checkDeliverySequenceUniqueness(route, editForm.delivery_sequence);
    }
  };

  if (!user) return null;

  // Handle role change for superadmins only
  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    onEditFormChange({ ...editForm, role: selectedRole });
  };

  // Handle save with validation
  const handleSave = async () => {
    // Check for delivery sequence conflicts before saving
    if (editForm.route && editForm.delivery_sequence) {
      try {
        const response = await checkUniqueDeliverySequence(
          editForm.route, 
          editForm.delivery_sequence, 
          user.customer_id
        );
        
        if (response.conflict) {
          toast.error(response.message);
          return;
        }
      } catch (error) {
        if (error.response && error.response.status === 409) {
          const conflictData = error.response.data;
          toast.error(conflictData.message);
          return;
        } else {
          toast.error("Error validating delivery sequence");
          return;
        }
      }
    }
    
    // Proceed with save if no conflicts
    onSave();
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-xl p-2 mr-3">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Edit User</h3>
                <p className="text-gray-600">Modify user account details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Half - Basic User Information */}
            <div className="space-y-6">
              <div className="bg-orange-50 p-5 rounded-xl">
                <div className="flex items-center mb-4">
                  <div className="bg-orange-100 rounded-lg p-2 mr-3">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Basic Information</h4>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={(e) => onEditFormChange({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(e) => onEditFormChange({ ...formData, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter delivery address"
                      value={formData.delivery_address}
                      onChange={(e) => onEditFormChange({ ...formData, delivery_address: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Half - User Settings & Configuration */}
            <div className="space-y-6">
              <div className="bg-orange-50 p-5 rounded-xl">
                <div className="flex items-center mb-4">
                  <div className="bg-orange-100 rounded-lg p-2 mr-3">
                    <Route className="h-5 w-5 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">User Settings</h4>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      Route Assignment
                    </label>
                    <select
                      value={formData.route}
                      onChange={handleRouteChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 appearance-none"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                      Price Tier
                    </label>
                    <select
                      value={formData.price_tier}
                      onChange={(e) => onEditFormChange({ ...formData, price_tier: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 appearance-none"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Hash className="h-4 w-4 mr-2 text-gray-500" />
                      Delivery Sequence
                    </label>
                    <input
                      type="number"
                      placeholder="Enter delivery sequence number"
                      value={formData.delivery_sequence}
                      onChange={handleDeliverySequenceChange}
                      className={`w-full rounded-lg border px-4 py-3 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 ${
                        deliverySequenceError ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {checkingSequence && (
                      <p className="mt-2 text-sm text-gray-500 flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking sequence availability...
                      </p>
                    )}
                    {deliverySequenceError && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {deliverySequenceError}
                      </p>
                    )}
                  </div>

                  {/* Conditionally render Role section only if logged-in user is superadmin */}
                  {loggedInUser?.role === "superadmin" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <UserCheck className="h-4 w-4 mr-2 text-gray-500" />
                        User Role
                      </label>
                      <div className="flex space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name="role"
                            value="admin"
                            checked={formData.role === "admin"}
                            onChange={handleRoleChange}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Admin</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name="role"
                            value="user"
                            checked={formData.role === "user"}
                            onChange={handleRoleChange}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">User</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!!deliverySequenceError || checkingSequence}
              className={`px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors duration-200 flex items-center ${
                deliverySequenceError || checkingSequence
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg"
              }`}
            >
              {deliverySequenceError || checkingSequence ? (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {checkingSequence ? "Checking..." : "Fix Error"}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}