import React, { useState, useEffect } from "react";
import {
  getUsers,
  toggleUserBlock,
  updateUser,
  addUser,
  getAssignedUsers,
  getRoutes,
  checkUniqueDeliverySequence
} from "../../../services/api";
import toast from "react-hot-toast";
import { 
  Search, 
  User, 
  UserPlus, 
  Edit3, 
  UserX, 
  UserCheck,
  Filter,
  MapPin,
  CreditCard,
  Hash,
  Phone,
  Route,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import SearchBar from "./SearchBar";
import UserTable from "./UserTable";
import EditUserModal from "./EditUserModal";

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
    customer_id: "",
    phone: "",
    password: "",
    name: "",
    delivery_address: "",
    route: "",
    price_tier: "",
    delivery_sequence: "",
  });
  const [roleFilter, setRoleFilter] = useState("all");
  const [deliverySequenceError, setDeliverySequenceError] = useState("");
  const [checkingSequence, setCheckingSequence] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

  // Filter users based on search term and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm) ||
                         user.route?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.delivery_address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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

  // Check delivery sequence uniqueness for add user form
  const checkDeliverySequenceUniqueness = async (route, deliverySequence) => {
    if (!route || !deliverySequence) {
      setDeliverySequenceError("");
      return;
    }

    // Clear previous errors
    setDeliverySequenceError("");
    setCheckingSequence(true);

    try {
      const response = await checkUniqueDeliverySequence(route, deliverySequence);
      
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

  // Handle delivery sequence change in add user form with debounce
  const handleDeliverySequenceChange = (e) => {
    const value = e.target.value;
    setNewUser({ ...newUser, delivery_sequence: value });

    // Clear previous error immediately when user types
    setDeliverySequenceError("");

    // Check uniqueness with debounce
    if (newUser.route && value) {
      // Debounce the API call
      clearTimeout(window.deliverySequenceCheckTimeout);
      window.deliverySequenceCheckTimeout = setTimeout(() => {
        checkDeliverySequenceUniqueness(newUser.route, value);
      }, 500);
    }
  };

  // Handle route change in add user form
  const handleRouteChange = (e) => {
    const route = e.target.value;
    setNewUser({ ...newUser, route: route });

    // Check delivery sequence uniqueness when route changes
    if (newUser.delivery_sequence) {
      checkDeliverySequenceUniqueness(route, newUser.delivery_sequence);
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
    
    // Check for delivery sequence conflicts before adding
    if (newUser.route && newUser.delivery_sequence) {
      try {
        const response = await checkUniqueDeliverySequence(newUser.route, newUser.delivery_sequence);
        
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
    
    try {
      await addUser(newUser);
      await fetchUsers(searchTerm);
      setShowAddModal(false);
      setNewUser({
        customer_id: "",
        phone: "",
        password: "",
        name: "",
        delivery_address: "",
        route: "",
        price_tier: "",
        delivery_sequence: "",
      });
      setDeliverySequenceError("");
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

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">Manage customer accounts and user permissions</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <User className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          {/* Professional Filters */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
            <div className="flex items-center mb-3">
              <Filter className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Filters & Search</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Search Users</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, phone, route or address..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Filter by Role</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 appearance-none"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={openAddModal}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add New User
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        {/* Users Count Display */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 text-orange-500 mr-2" />
              <p className="text-gray-600">
                Showing <span className="font-semibold">{paginatedUsers.length}</span> of <span className="font-semibold">{filteredUsers.length}</span> users
                {roleFilter !== "all" && ` (filtered by ${roleFilter} role)`}
                {searchTerm && ` (searching for "${searchTerm}")`}
              </p>
            </div>
            {(searchTerm || roleFilter !== "all") && (
              <button
                onClick={clearFilters}
                className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Expanded container width for better table display */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">User Accounts</h2>
          </div>
          
          {/* Improved responsive container with better width management */}
          <div className="w-full">
            <UserTable
              users={paginatedUsers}
              onEditUser={loggedInUser?.role === "superadmin" ? handleEditUser : null}
              onToggleBlock={handleToggleBlock}
            />
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-orange-600 hover:bg-orange-100 transition-colors duration-200'
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                            currentPage === pageNum
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-700 hover:bg-orange-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-orange-600 hover:bg-orange-100 transition-colors duration-200'
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-orange-100 rounded-xl p-2 mr-3">
                      <UserPlus className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Add New User</h3>
                      <p className="text-gray-600">Create a new customer account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setDeliverySequenceError("");
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddUser} className="p-6">
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
                            required
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            placeholder="Enter full name"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-500" />
                            Phone Number
                          </label>
                          <input
                            type="text"
                            required
                            value={newUser.phone}
                            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                            placeholder="Enter phone number"
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
                            value={newUser.delivery_address}
                            onChange={(e) => setNewUser({ ...newUser, delivery_address: e.target.value })}
                            placeholder="Enter delivery address"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Hash className="h-4 w-4 mr-2 text-gray-500" />
                            Customer ID
                          </label>
                          <input
                            type="text"
                            required
                            value={newUser.customer_id}
                            readOnly
                            placeholder="Auto-generated"
                            className="w-full rounded-lg border border-gray-300 bg-gray-100 text-gray-700 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-500" />
                            Password
                          </label>
                          <input
                            type="text"
                            required
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            placeholder="Enter password"
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
                            value={newUser.route}
                            onChange={handleRouteChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 appearance-none"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                            Price Tier
                          </label>
                          <select
                            value={newUser.price_tier}
                            onChange={(e) => setNewUser({ ...newUser, price_tier: e.target.value })}
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
                            value={newUser.delivery_sequence}
                            onChange={handleDeliverySequenceChange}
                            placeholder="Enter delivery sequence number"
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setDeliverySequenceError("");
                    }}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="submit"
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
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}