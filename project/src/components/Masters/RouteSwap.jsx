import React, { useState, useEffect } from "react";
import { getUsers, getRoutes, bulkReassignCustomersAdmin }  from "../../services/api";
import toast from "react-hot-toast";
import { 
  Users, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  ArrowRightLeft, 
  X, 
  Route,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Hash,
  CreditCard
} from "lucide-react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    setCurrentPage(1); // Reset to first page when filtering
  }, [users, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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
      console.log('Routes data type:', typeof routesData, 'Is array:', Array.isArray(routesData));
      
      // Handle different response structures
      let processedRoutes = [];
      if (Array.isArray(routesData)) {
        processedRoutes = routesData;
      } else if (routesData && Array.isArray(routesData.data)) {
        processedRoutes = routesData.data;
      } else if (routesData && routesData.routes && Array.isArray(routesData.routes)) {
        processedRoutes = routesData.routes;
      }
      
      console.log('Processed routes:', processedRoutes);
      setRoutes(processedRoutes);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error(`Failed to fetch routes: ${error.message}`);
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
    if (selectedUsers.size === paginatedUsers.length && paginatedUsers.every(user => selectedUsers.has(user.customer_id))) {
      // Deselect all users on current page
      const newSelected = new Set(selectedUsers);
      paginatedUsers.forEach(user => newSelected.delete(user.customer_id));
      setSelectedUsers(newSelected);
    } else {
      // Select all users on current page
      const newSelected = new Set(selectedUsers);
      paginatedUsers.forEach(user => newSelected.add(user.customer_id));
      setSelectedUsers(newSelected);
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
      console.log('Sending assignments to API:', assignments);
      const result = await bulkReassignCustomersAdmin(assignments);
      console.log('API result:', result);
      
      if (result.success) {
        const successCount = result.data.summary.successful;
        const failedCount = result.data.summary.failed;
        
        toast.success(`Successfully reassigned ${successCount} customers`);
        
        // Show detailed results for failed assignments
        if (failedCount > 0) {
          console.log('Failed assignments:', result.data.failed_assignments);
          toast.error(`${failedCount} assignments failed. Check console for details.`);
          
          // Log detailed error information
          result.data.failed_assignments.forEach(failure => {
            console.error(`Failed to reassign ${failure.customer_id}: ${failure.error}`);
          });
        }
        
        // Refresh users data
        await fetchUsers();
        
        // Clear selections and assignments
        setSelectedUsers(new Set());
        setRouteAssignments({});
      } else {
        toast.error(result.message || "Failed to reassign customers");
        console.error('API returned error:', result);
      }
    } catch (error) {
      toast.error(`Failed to reassign customers: ${error.message}`);
      console.error("Error in bulk reassign:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
    setRouteAssignments({});
    setSelectedUsers(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Route Swap Management</h1>
              <p className="text-gray-600">Manage user route assignments and bulk route transfers</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <Route className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          {/* Route Swap Instructions */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Route className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-orange-800 mb-2">Route Swap Instructions</h3>
                <div className="text-sm text-orange-700 space-y-2">
                  <p className="flex items-center">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                    Select new routes from the dropdown for customers you want to reassign
                  </p>
                  <p className="flex items-center">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                    Review your selections (rows with new routes will be highlighted in green)
                  </p>
                  <p className="flex items-center">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                    Click the "Reassign" button to apply all route changes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
            <div className="flex items-center mb-3">
              <Search className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Search Users</h2>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-orange-100 mb-1">Search Users</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by name, ID, phone, or route..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-full mx-auto px-4 py-6">
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="text-sm text-yellow-800 flex items-center justify-between">
              <span>
                <strong>Debug Info:</strong> Routes loaded: {routes.length} | Routes loading: {routesLoading.toString()} | Selected users: {selectedUsers.size}
              </span>
              <button
                onClick={fetchRoutes}
                className="ml-4 px-3 py-1 bg-yellow-600 text-white text-xs rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Retry Routes
              </button>
            </div>
          </div>
        )}

        {/* Users Count Display */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Route className="h-5 w-5 text-orange-500 mr-2" />
              <p className="text-gray-600">
                Showing <span className="font-semibold">{paginatedUsers.length}</span> of <span className="font-semibold">{filteredUsers.length}</span> users
                {searchTerm && ` (searching for "${searchTerm}")`}
                {(() => {
                  const usersWithRouteAssignments = Object.keys(routeAssignments).filter(
                    customerId => routeAssignments[customerId] && routeAssignments[customerId].trim() !== ""
                  );
                  return usersWithRouteAssignments.length > 0 && ` | ${usersWithRouteAssignments.length} with new routes`;
                })()}
              </p>
            </div>
            {searchTerm && (
              <button
                onClick={clearFilters}
                className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Route Swap Management</h2>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Route className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
                          {paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.has(user.customer_id)) ? (
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
                    {paginatedUsers.map((user) => {
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
                              {routes.map((route, index) => {
                                // Handle different route data structures
                                const routeKey = route.id || route.route_id || index;
                                const routeName = route.name || route.route_name || route.route || route;
                                
                                return (
                                  <option key={routeKey} value={routeName}>
                                    {routeName}
                                  </option>
                                );
                              })}
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
            )
          }

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
                          currentPage === pageNum
                            ? "bg-orange-500 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>



        {/* Sticky Reassign Button */}
        {(() => {
          const usersWithRouteAssignments = Object.keys(routeAssignments).filter(
            customerId => routeAssignments[customerId] && routeAssignments[customerId].trim() !== ""
          );
          return usersWithRouteAssignments.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50">
              <div className="bg-white rounded-xl shadow-2xl border border-orange-200 p-6 relative max-w-sm">
                <button
                  onClick={() => setRouteAssignments({})}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3">
                      <ArrowRightLeft className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready to Reassign</h3>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-orange-600">{usersWithRouteAssignments.length}</span> customers selected for route change
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={handleBulkReassign}
                      disabled={isReassigning || routesLoading || routes.length === 0}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg font-medium"
                    >
                      <ArrowRightLeft className="h-5 w-5" />
                      <span>
                        {isReassigning ? "Processing..." : 
                         routesLoading ? "Loading..." :
                         routes.length === 0 ? "No Routes" :
                         `Reassign ${usersWithRouteAssignments.length} Users`}
                      </span>
                    </button>
                    <button
                      onClick={() => setRouteAssignments({})}
                      className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Clear All Selections
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default RouteSwap;
