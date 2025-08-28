import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getUsers, saveAssignment, getAssignedRoutes } from "../services/api"; // Import API functions

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([]); // Available routes
  const [selectedRoutes, setSelectedRoutes] = useState([]); // Selected routes
  const [newRoute, setNewRoute] = useState(""); // New route input
  const [users, setUsers] = useState([]); // Users list
  const [selectedAdmin, setSelectedAdmin] = useState(null); // Selected admin
  const [assignedRoutesData, setAssignedRoutesData] = useState([]); // State for assigned routes data
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userData = await getUsers();

        // Filter users to show only admins
        const adminUsers = userData.filter((user) => user.role === "admin");
        setUsers(adminUsers);

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
  const fetchAssignedRoutes = async () => {
    if (!selectedAdmin) {
      toast.error("Please select an admin to view assigned routes.");
      return;
    }
  
    try {
      const response = await getAssignedRoutes({ admin_id: selectedAdmin });
  
      // Filter out any entries where route is empty or null
      const filteredRoutes = (response || []).filter(route => route.route && route.route.trim() !== "");
  
      setAssignedRoutesData(filteredRoutes); // Update state with only valid routes
    } catch (error) {
      toast.error("Failed to fetch assigned routes");
    }
  };
  

  // Toggle the modal and fetch assigned routes if it's opening
  const openModal = () => {
    setIsModalOpen(true);
    fetchAssignedRoutes(); // Fetch routes when opening the modal
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Handle route selection
  const handleRouteSelection = (event) => {
    const selected = Array.from(event.target.selectedOptions, (option) => option.value);
    setSelectedRoutes(selected);
  };

  // Handle admin selection
  const handleAdminChange = (event) => {
    setSelectedAdmin(event.target.value);
  };

  // Add new route to the dropdown
  const addNewRoute = () => {
    if (!newRoute.trim()) {
      toast.error("Route name cannot be empty.");
      return;
    }
    if (routes.includes(newRoute)) {
      toast.error("This route already exists.");
      return;
    }

    setRoutes((prevRoutes) => [...prevRoutes, newRoute]); // Update routes list
    setNewRoute(""); // Clear input field
    toast.success("New route added successfully!");
  };

  const saveRoutes = async () => {
    if (!selectedAdmin || selectedRoutes.length === 0) {
      toast.error("Please select an admin and at least one route.");
      return;
    }

    const adminId = Number(selectedAdmin);
    try {
      const selectedAdminUser = users.find((user) => user.id === adminId);
      const customerId = selectedAdminUser ? selectedAdminUser.customer_id : null;

      if (!customerId) {
        toast.error("Selected admin does not have a valid customer_id.");
        return;
      }

      // Fetch all assigned routes from the backend (assigned to all admins)
      const response = await getAssignedRoutes(); // This will fetch all assigned routes from the backend
      const allAssignedRoutes = response || [];
      console.log("All Assigned Routes:", allAssignedRoutes);

      // Check for conflicts with the selected routes (from frontend) against all assigned routes
      const conflictRoutes = selectedRoutes.filter((route) =>
        allAssignedRoutes.includes(route) // Check if any of the selected routes are already assigned to any admin
      );

      if (conflictRoutes.length > 0) {
        const routeNames = conflictRoutes.join(", ");
        toast.error("The following routes are already assigned to other admins:");
        return; // Stop further processing if there's a conflict
      }

      // Proceed with saving the assignment if no conflict
      const result = await saveAssignment(customerId, selectedRoutes);

      if (result.success) {
        toast.success("Routes updated successfully!");
      } else {
        toast.error(result.message || "Failed to update routes.");
      }
    } catch (error) {
      toast.error("Error while saving routes. Please check if routes are already assigned to other admins.");
      console.error("Error:", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Assign Routes to Admin</h2>

      {/* Select Admin Dropdown */}
      <div className="mb-4">
        <label htmlFor="admin" className="block text-lg font-medium text-gray-700 mb-2">
          Select Admin:
        </label>
        <select
          id="admin"
          value={selectedAdmin || ""}
          onChange={handleAdminChange}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select Admin</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
      </div>

      {/* Select Routes Dropdown */}
      <div className="mb-4">
        <label htmlFor="routes" className="block text-lg font-medium text-gray-700 mb-2">
          Select Routes:
        </label>
        <select
          id="routes"
          multiple
          value={selectedRoutes}
          onChange={handleRouteSelection}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* New Route Input and Button */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          value={newRoute}
          onChange={(e) => setNewRoute(e.target.value)}
          placeholder="Enter new route"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={addNewRoute}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
        >
          Add Route
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={saveRoutes}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
        >
          Save Routes
        </button>
      </div>

      {/* Button to open the modal and show assigned routes */}
      <div className="flex justify-center">
        <button
          onClick={openModal}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
        >
          Show Assigned Routes
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md shadow-md w-3/4 max-w-3xl">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Assigned Routes</h3>
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className="border px-4 py-2 text-left">Route</th>
                  <th className="border px-4 py-2 text-left">Admin Name</th>
                  <th className="border px-4 py-2 text-left">Customer ID</th>
                </tr>
              </thead>
              <tbody>
                {assignedRoutesData.map((route, index) => (
                  <tr key={index}>
                    <td className="border px-4 py-2">{route.route}</td>
                    <td className="border px-4 py-2">{route.username}</td>
                    <td className="border px-4 py-2">{route.customer_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoutes;
