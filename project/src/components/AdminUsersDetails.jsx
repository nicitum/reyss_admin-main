import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getUsers, getAssignedUsers } from "../services/api"; // Import API functions

const AdminUserDetails = () => {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [userDetails, setUserDetails] = useState([]);

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
      const response = await getAssignedUsers(selectedAdmin);
      console.log("API Response:", response);
      
      // Ensure we get the correct assigned users
      setUserDetails(response.assignedUsers || []);
    } catch (error) {
      console.error("API Error:", error);
      toast.error("Failed to fetch user details.");
    }
  };
  
  

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        View Users Assigned to Admin
      </h2>

      {/* Select Admin Dropdown */}
      <div className="mb-4">
        <label className="block text-lg font-medium text-gray-700 mb-2">
          Select Admin:
        </label>
        <select
          value={selectedAdmin}
          onChange={(e) => setSelectedAdmin(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md"
        >
          <option value="">Select Admin</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.username}
            </option>
          ))}
        </select>
      </div>

      {/* Fetch User Details Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={fetchUserDetails}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Show Users
        </button>
      </div>

      {/* Display User Details */}
      {userDetails.length > 0 ? (
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">User ID</th>
              <th className="border px-4 py-2">Username</th>
              <th className="border px-4 py-2">Customer ID</th>
              <th className="border px-4 py-2">Phone</th>
              <th className="border px-4 py-2">Route</th>
              <th className="border px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {userDetails.map((user, index) => (
              <tr key={index}>
                <td className="border px-4 py-2">{user.id}</td>
                <td className="border px-4 py-2">{user.username}</td>
                <td className="border px-4 py-2">{user.cust_id}</td>
                <td className="border px-4 py-2">{user.phone}</td>
                <td className="border px-4 py-2">{user.route}</td>
                <td className="border px-4 py-2">{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600 text-center">No users assigned to this admin.</p>
      )}
    </div>
  );
};

export default AdminUserDetails;
