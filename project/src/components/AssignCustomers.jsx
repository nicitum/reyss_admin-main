import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getUsers, assignUsersToAdmin } from "../services/api"; // Import API function

const AssignCustomers = () => {
  const [routes, setRoutes] = useState([]); // Unique routes
  const [selectedRoutes, setSelectedRoutes] = useState([]); // Selected routes
  const [admins, setAdmins] = useState([]); // Admins list
  const [selectedAdmin, setSelectedAdmin] = useState(null); // Selected admin
  const [users, setUsers] = useState([]); // All users (from the selected routes)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userData = await getUsers();

        // Filter admins
        const adminUsers = userData.filter((user) => user.role === "admin");
        setAdmins(adminUsers);

        // Extract unique routes from users
        const allRoutes = new Set();
        userData.forEach((user) => {
          if (user.route) {
            allRoutes.add(user.route);
          }
        });

        setRoutes([...allRoutes]); // Convert Set to array
      } catch (error) {
        toast.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, []);

  // Handle route selection
  const handleRouteSelection = (event) => {
    const selected = Array.from(event.target.selectedOptions, (option) => option.value);
    setSelectedRoutes(selected);
  };

  // Handle admin selection
  const handleAdminChange = (event) => {
    setSelectedAdmin(event.target.value);
  };

  // Fetch users based on selected routes
  useEffect(() => {
    const fetchUsersFromRoutes = async () => {
      try {
        if (selectedRoutes.length > 0) {
          // Filter users based on selected routes
          const filteredUsers = await getUsers(); // Make API call to get all users
          const usersToAssign = filteredUsers.filter((user) =>
            selectedRoutes.includes(user.route)
          );
          setUsers(usersToAssign);
        }
      } catch (error) {
        toast.error("Failed to fetch users for selected routes.");
      }
    };

    fetchUsersFromRoutes();
  }, [selectedRoutes]);

  // Frontend: Show error if users are already assigned
const handleAssignUsers = async () => {
  try {
    if (!selectedAdmin || users.length === 0) {
      toast.error("Please select an admin and routes.");
      return;
    }

    const userIds = users.map((user) => user.id);
    const result = await assignUsersToAdmin(selectedAdmin, userIds);

    if (result.success) {
      toast.success("Users successfully assigned to the admin.");
    } else {
      toast.error(result.message || "Failed to assign users.");
      if (result.existingAssignments) {
        result.existingAssignments.forEach((assignment) => {
          toast.error(`User ${assignment.customer_id} is already assigned to Admin ${assignment.admin_id}`);
        });
      }
    }
  } catch (error) {
    toast.error("Error occurred while assigning users.");
  }
};


  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Assign Customers to Admin</h2>

      {/* Select Admin Dropdown */}
      <div className="mb-4">
        <label htmlFor="admin" className="block text-lg font-medium text-gray-700">
          Select Admin:
        </label>
        <select
          id="admin"
          value={selectedAdmin || ""}
          onChange={handleAdminChange}
          className="mt-2 p-2 border border-gray-300 rounded-md w-full"
        >
          <option value="">Select Admin</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.username}
            </option>
          ))}
        </select>
      </div>

      {/* Select Routes Dropdown */}
      <div className="mb-4">
        <label htmlFor="routes" className="block text-lg font-medium text-gray-700">
          Select Routes:
        </label>
        <select
          id="routes"
          multiple
          value={selectedRoutes}
          onChange={handleRouteSelection}
          className="mt-2 p-2 border border-gray-300 rounded-md w-full"
        >
          {routes.length === 0 ? (
            <option>No routes available</option>
          ) : (
            routes.map((route, index) => (
              <option key={index} value={route}>
                {route}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Assign Users Button */}
      <div className="mb-4">
        <button
          onClick={handleAssignUsers}
          className="p-2 bg-blue-500 text-white rounded-md"
        >
          Assign Users
        </button>
      </div>
    </div>
  );
};

export default AssignCustomers;
