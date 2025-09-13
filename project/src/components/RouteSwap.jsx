import React, { useState, useEffect } from "react";
import { getUsers, getRoutes, bulkReassignCustomersAdmin } from "../services/api";
import toast from "react-hot-toast";
import { Users, Search, Filter, CheckSquare, Square, ArrowRightLeft, X } from "lucide-react";

const RouteSwap = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [routeAssignments, setRouteAssignments] = useState({});
  const [isReassigning, setIsReassigning] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchRoutes();
  }, []);

  useEffect(() => {
    // Filter users by role = "user" and search term
    const filtered = users.filter(user => {
      const matchesRole = user.role === "user";
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.phone?.includes(searchTerm) ||
                           user.route?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesRole && matchesSearch;
    });
    
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data || []);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      setRoutesLoading(true);
      console.log('Fetching routes...');
      const routesData = await getRoutes();
      console.log('Routes data received:', routesData);
      setRoutes(routesData || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error("Failed to fetch routes");
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  };

  const handleUserSelection = (customerId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.customer_id)));
    }
  };

  const handleRouteChange = (customerId, newRoute) => {
    console.log('Route change:', { customerId, newRoute });
    setRouteAssignments(prev => ({
      ...prev,
      [customerId]: newRoute
    }));
  };

  const handleBulkReassign = async () => {
    // Get all users that have route assignments (regardless of selection)
    const usersWithRouteAssignments = Object.keys(routeAssignments).filter(
      customerId => routeAssignments[customerId] && routeAssignments[customerId].trim() !== ""
    );

    if (usersWithRouteAssignments.length === 0) {
      toast.error("Please select new routes for at least one customer");
      return;
    }

    const assignments = [];
    const errors = [];

    usersWithRouteAssignments.forEach(customerId => {
      const newRoute = routeAssignments[customerId];
      if (!newRoute) {
        errors.push(`${customerId}: No route selected`);
        return;
      }
      
      const user = users.find(u => u.customer_id === customerId);
      if (user && user.route === newRoute) {
        errors.push(`${customerId}: Already assigned to this route`);
        return;
      }

      assignments.push({
        customer_id: customerId,
        new_route: newRoute
      });
    });

    if (errors.length > 0) {
      toast.error(`Please fix these issues: ${errors.join(', ')}`);
      return;
    }

    if (assignments.length === 0) {
      toast.error("No valid assignments to process");
      return;
    }

    try {
      setIsReassigning(true);
      const result = await bulkReassignCustomersAdmin(assignments);
      
      if (result.success) {
        toast.success(`Successfully reassigned ${result.data.summary.successful} customers`);
        
        // Show detailed results
        if (result.data.failed_assignments.length > 0) {
          toast.error(`${result.data.failed_assignments.length} assignments failed`);
        }
        
        // Refresh users data
        await fetchUsers();
        
        // Clear selections
        setSelectedUsers(new Set());
        setRouteAssignments({});
      } else {
        toast.error(result.message || "Failed to reassign customers");
      }
    } catch (error) {
      toast.error("Failed to reassign customers");
      console.error("Error in bulk reassign:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Route Swap</h1>
        <p className="text-gray-600">Manage user route assignments and swaps</p>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search users by name, customer ID, phone, or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>Filtered by: User Role</span>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800 flex items-center justify-between">
            <span>
              <strong>Debug Info:</strong> Routes loaded: {routes.length} | Routes loading: {routesLoading.toString()} | Selected users: {selectedUsers.size}
            </span>
            <button
              onClick={fetchRoutes}
              className="ml-4 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Retry Routes
            </button>
          </div>
        </div>
      )}

      {/* Users Count Display */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.filter(u => u.role === "user").length} users
          {searchTerm && ` (searching for "${searchTerm}")`}
          {(() => {
            const usersWithRouteAssignments = Object.keys(routeAssignments).filter(
              customerId => routeAssignments[customerId] && routeAssignments[customerId].trim() !== ""
            );
            return usersWithRouteAssignments.length > 0 && ` | ${usersWithRouteAssignments.length} with new routes`;
          })()}
        </div>
        <div className="flex items-center space-x-2 text-sm text-indigo-600">
          <Users className="h-4 w-4" />
          <span>All Users with Role: User</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? `No users match your search "${searchTerm}"` 
                : "No users with 'user' role found"
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center space-x-2 hover:text-gray-700"
                    >
                      {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      <span>Select</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Sequence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const hasNewRoute = routeAssignments[user.customer_id] && routeAssignments[user.customer_id].trim() !== "";
                  return (
                  <tr key={user.customer_id} className={`hover:bg-gray-50 ${hasNewRoute ? 'bg-green-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleUserSelection(user.customer_id)}
                        className="flex items-center space-x-2 hover:text-gray-700"
                      >
                        {selectedUsers.has(user.customer_id) ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.customer_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.phone || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.route || "No Route"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <select
                        value={routeAssignments[user.customer_id] || ""}
                        onChange={(e) => handleRouteChange(user.customer_id, e.target.value)}
                        className="w-full max-w-xs px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={routesLoading}
                      >
                        <option value="">
                          {routesLoading ? "Loading routes..." : "Select new route"}
                        </option>
                        {routes.map((route) => (
                          <option key={route.id} value={route.name}>
                            {route.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {user.price_tier || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.delivery_sequence || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === "Active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {user.status || "Active"}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Route Swap Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>This page displays all users with the "user" role. You can reassign customers to different routes.</p>
              <p className="mt-1">Steps: 1) Choose new routes from dropdowns for customers you want to reassign, 2) Click "Reassign" to apply changes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Reassign Button */}
      {(() => {
        const usersWithRouteAssignments = Object.keys(routeAssignments).filter(
          customerId => routeAssignments[customerId] && routeAssignments[customerId].trim() !== ""
        );
        return usersWithRouteAssignments.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 relative">
              <button
                onClick={() => setRouteAssignments({})}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{usersWithRouteAssignments.length}</span> customers ready to reassign
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setRouteAssignments({})}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleBulkReassign}
                    disabled={isReassigning || routesLoading || routes.length === 0}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                  >
                    <ArrowRightLeft className="h-5 w-5" />
                    <span className="font-medium">
                      {isReassigning ? "Reassigning..." : 
                       routesLoading ? "Loading routes..." :
                       routes.length === 0 ? "No routes available" :
                       `Reassign ${usersWithRouteAssignments.length} Customers`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default RouteSwap;
