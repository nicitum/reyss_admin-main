import React, { useState, useEffect } from "react";
import {
  getUsers,
  toggleUserBlock,
  updateUser,
  addUser,
  getAssignedUsers,
  getRoutes
} from "../services/api";
import toast from "react-hot-toast";
import SearchBar from "./UsersTab/SearchBar";
import UserTable from "./UsersTab/UserTable";
import EditUserModal from "./UsersTab/EditUserModal";

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    delivery_address: "",
    route: "",
    price_tier: "",
    role: "user",
    delivery_sequence: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    customer_id: "",
    phone: "",
    password: "",
    name: "",
    route: "",
    price_tier: "",
    delivery_sequence: "",
  });
  const [roleFilter, setRoleFilter] = useState("all");

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

  // Filter users based on search term and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm) ||
                         user.route?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

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
      // Don't show error toast for routes, just log it
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchUsers = async (search) => {
    try {
      console.log('Fetching users...');
      if (loggedInUser?.role === "superadmin") {
        const data = await getUsers(search);
        setUsers(data);
      } else if (loggedInUser?.role === "admin") {
        console.log('Fetching assigned users...');
        const result = await getAssignedUsers(loggedInUser.id1);
        console.log("Assigned Users Response:", result);

        if (result.success) {
          setUsers(result.assignedUsers);
        } else {
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error("Error fetching users:", error);
    }
  };

  const handleToggleBlock = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === "Block" ? "Active" : "Block";
      await toggleUserBlock(userId, newStatus);
      await fetchUsers(searchTerm);
      toast.success(
        `User ${newStatus === "Block" ? "Blocked" : "Activated"} successfully`
      );
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      delivery_address: user.delivery_address || "",
      route: user.route || "",
      price_tier: user.price_tier || "",
      role: user.role || "user",
      delivery_sequence: user.delivery_sequence || "",
    });
  };

  const handleUpdateUser = async () => {
    console.log(editForm);
    try {
      await updateUser(selectedUser.customer_id, editForm);
      await fetchUsers(searchTerm);
      setSelectedUser(null);
      toast.success("User updated successfully");
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addUser(newUser);
      await fetchUsers(searchTerm);
      setShowAddModal(false);
      setNewUser({
        username: "",
        customer_id: "",
        phone: "",
        password: "",
        name: "",
        route: "",
        price_tier: "",
        delivery_sequence: "",
      });
      toast.success("User added successfully");
    } catch (error) {
      toast.error("Failed to add user");
    }
  };

  const generateNextCustomerId = () => {
    // Find IDs that look like PREFIX+NUMBER (e.g., SLE372)
    let maxNum = 0;
    let chosenPrefix = "SLE";
    let chosenWidth = 0;
    users.forEach((u) => {
      const cid = u?.customer_id || "";
      const match = String(cid).match(/^([A-Za-z]+)(\d+)$/);
      if (match) {
        const [, prefix, digits] = match;
        const num = parseInt(digits, 10);
        if (!Number.isNaN(num) && num >= maxNum) {
          maxNum = num;
          chosenPrefix = prefix;
          chosenWidth = digits.length; // preserve zero-padding width
        }
      }
    });
    const nextNum = maxNum + 1;
    const padded = chosenWidth > 0 ? String(nextNum).padStart(chosenWidth, "0") : String(nextNum);
    return `${chosenPrefix}${padded}`;
  };

  const openAddModal = () => {
    const nextId = generateNextCustomerId();
    setNewUser((prev) => ({
      ...prev,
      customer_id: nextId,
    }));
    setShowAddModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          
          {/* Role Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Add User
        </button>
      </div>

      {/* Users Count Display */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredUsers.length} of {users.length} users
        {roleFilter !== "all" && ` (filtered by ${roleFilter} role)`}
        {searchTerm && ` (searching for "${searchTerm}")`}
      </div>

      <UserTable
        users={filteredUsers}
        onEditUser={loggedInUser?.role === "superadmin" ? handleEditUser : null}
        onToggleBlock={handleToggleBlock}
      />

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          editForm={editForm}
          onEditFormChange={setEditForm}
          onClose={() => setSelectedUser(null)}
          onSave={handleUpdateUser}
        />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
            </div>
            <form onSubmit={handleAddUser} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Half - Basic User Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          required
                          value={newUser.username}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              username: e.target.value,
                              password: e.target.value, // Setting password same as username for now
                            })
                          }
                          placeholder="Enter username"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          placeholder="Enter full name"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Customer ID
                        </label>
                        <input
                          type="text"
                          required
                          value={newUser.customer_id}
                          readOnly
                          placeholder="Auto-generated"
                          className="w-full rounded-md border border-gray-300 bg-gray-100 text-gray-700 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          required
                          value={newUser.phone}
                          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                          placeholder="Enter phone number"
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
                          value={newUser.route}
                          onChange={(e) => setNewUser({ ...newUser, route: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price Tier
                        </label>
                        <select
                          value={newUser.price_tier}
                          onChange={(e) => setNewUser({ ...newUser, price_tier: e.target.value })}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delivery Sequence
                        </label>
                        <input
                          type="number"
                          value={newUser.delivery_sequence}
                          onChange={(e) => setNewUser({ ...newUser, delivery_sequence: e.target.value })}
                          placeholder="Enter delivery sequence number"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}