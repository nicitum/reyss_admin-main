import React, { useState, useEffect } from "react";
import {
  getUsers,
  toggleUserBlock,
  updateUser,
  addUser,
  getAssignedUsers,
  getAllRoutes
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
  });

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

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
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <button
          onClick={openAddModal}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Add User
        </button>
      </div>

      <UserTable
        users={users}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 block w-full rounded-md border border-gray-300 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                  className="mt-1 block w-full rounded-md border border-gray-300 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer ID
                </label>
                <input
                  type="text"
                  required
                  value={newUser.customer_id}
                  readOnly
                  placeholder="Auto-generated"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 text-gray-700 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Route
                </label>
                <select
                  value={newUser.route}
                  onChange={(e) => setNewUser({ ...newUser, route: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
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
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  required
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="mt-1 block w-full rounded-md border border-gray-300 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price Tier
                </label>
                <select
                  value={newUser.price_tier}
                  onChange={(e) => setNewUser({ ...newUser, price_tier: e.target.value })}
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
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
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