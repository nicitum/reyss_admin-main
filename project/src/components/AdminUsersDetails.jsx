import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getUsers, getAssignedUsers } from "../services/api";
import { User, Search, Filter, Phone, MapPin, CheckCircle } from "lucide-react";

const AdminUserDetails = () => {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [userDetails, setUserDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const userData = await getUsers();
        const adminUsers = userData.filter((user) => user.role === "admin");
        setAdmins(adminUsers);
      } catch (error) {
        toast.error("Failed to fetch admins.");
      }
    };
    fetchAdmins();
  }, []);

  const fetchUserDetails = async () => {
    if (!selectedAdmin) {
      toast.error("Please select an admin.");
      return;
    }
  
    try {
      setLoading(true);
      const response = await getAssignedUsers(selectedAdmin);
      console.log("API Response:", response);
      
      // Ensure we get the correct assigned users
      setUserDetails(response.assignedUsers || []);
    } catch (error) {
      console.error("API Error:", error);
      toast.error("Failed to fetch user details.");
    } finally {
      setLoading(false);
    }
  };

  const getAdminName = (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    return admin ? admin.username : "Select an administrator";
  };

  // Get selected admin name for display
  const selectedAdminName = selectedAdmin ? getAdminName(selectedAdmin) : "Select an administrator";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin User Details</h1>
              <p className="text-gray-600 mt-1">View users assigned to specific administrators</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <User className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Card - Moved to top */}
        {selectedAdmin && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-5 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Assignment Summary</h3>
                <p className="text-orange-100 mt-1">
                  {selectedAdminName} has {userDetails.length} user{userDetails.length !== 1 ? 's' : ''} assigned
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {/* Admin Selection Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Select Administrator
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Admin Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Admin
                </label>
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Select an Administrator</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.username}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Action Button */}
              <div className="flex items-end">
                <button
                  onClick={fetchUserDetails}
                  disabled={loading || !selectedAdmin}
                  className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    loading || !selectedAdmin
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Show Assigned Users
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Details Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">
              {selectedAdmin 
                ? `Users assigned to ${selectedAdminName}` 
                : "Assigned Users"}
            </h2>
          </div>
          
          {userDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userDetails.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="mr-2 text-orange-500" size={16} />
                          <span className="text-sm font-medium text-gray-900">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.cust_id || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Phone className="mr-2 text-gray-400" size={14} />
                          {user.phone || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="mr-2 text-gray-400" size={14} />
                          {user.route || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === "active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {user.status || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {selectedAdmin ? "No users assigned" : "Select an administrator"}
              </h3>
              <p className="text-gray-500 text-sm">
                {selectedAdmin 
                  ? "This administrator has no users assigned yet" 
                  : "Please select an administrator to view assigned users"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetails;