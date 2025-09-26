import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin, Search, Filter, CheckCircle, X } from "lucide-react";
import { getRoutes, addRoute, updateRoute, deleteRoute }  from "../../services/api";
import toast from "react-hot-toast";

export default function RouteMasters() {
  const [routes, setRoutes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeSearch, setRouteSearch] = useState("");
  const [newRoute, setNewRoute] = useState({
    name: "",
    description: "",
  });
  const [editRoute, setEditRoute] = useState({
    id: "",
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const data = await getRoutes();
      setRoutes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch routes");
    }
  };

  // Filter routes based on search
  const filteredRoutes = routes.filter(route => {
    if (!routeSearch) return true;
    const searchLower = routeSearch.toLowerCase();
    return (
      route.name.toLowerCase().includes(searchLower) ||
      (route.description && route.description.toLowerCase().includes(searchLower)) ||
      route.id.toString().includes(routeSearch)
    );
  });

  const handleAddRoute = async (e) => {
    e.preventDefault();
    try {
      await addRoute(newRoute);
      await fetchRoutes();
      setShowAddModal(false);
      setNewRoute({ name: "", description: "" });
      toast.success("Route added successfully");
    } catch (error) {
      toast.error("Failed to add route");
    }
  };

  const handleEditRoute = async (e) => {
    e.preventDefault();
    try {
      await updateRoute(editRoute.id, {
        name: editRoute.name,
        description: editRoute.description,
      });
      await fetchRoutes();
      setShowEditModal(false);
      setEditRoute({ id: "", name: "", description: "" });
      toast.success("Route updated successfully");
    } catch (error) {
      toast.error("Failed to update route");
    }
  };

  const handleDeleteRoute = async (id) => {
    if (window.confirm("Are you sure you want to delete this route?")) {
      try {
        await deleteRoute(id);
        await fetchRoutes();
        toast.success("Route deleted successfully");
      } catch (error) {
        toast.error("Failed to delete route");
      }
    }
  };

  const openEditModal = (route) => {
    setEditRoute({
      id: route.id,
      name: route.name,
      description: route.description || "",
    });
    setShowEditModal(true);
  };

  const clearFilters = () => {
    setRouteSearch("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Route Masters</h1>
              <p className="text-gray-600 mt-1">Manage delivery routes and their descriptions</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Add Route</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Search & Filter
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by route name, ID or description..."
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="flex items-center justify-between md:justify-end">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredRoutes.length}</span> of{" "}
                  <span className="font-semibold">{routes.length}</span> routes
                </div>
                
                {routeSearch && (
                  <button
                    onClick={clearFilters}
                    className="ml-4 text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Routes Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">Route List</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {route.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="mr-2 text-orange-500" size={16} />
                        <span className="text-sm font-medium text-gray-900">
                          {route.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {route.description || "No description"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(route)}
                          className="flex items-center text-orange-600 hover:text-orange-800 transition-colors duration-200"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="flex items-center text-red-600 hover:text-red-800 transition-colors duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRoutes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <MapPin className="mx-auto mb-4 text-gray-300" size={48} />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No routes found</h3>
                      <p className="text-sm">
                        {routeSearch 
                          ? "Try adjusting your search criteria" 
                          : "Get started by adding your first route"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowAddModal(false)}></div>
            
            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Add New Route</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-white hover:text-gray-200 transition-colors duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleAddRoute} className="px-6 py-5">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter route name"
                      value={newRoute.name}
                      onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Enter route description (optional)"
                      value={newRoute.description}
                      onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-md transition-colors flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Add Route
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Route Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowEditModal(false)}></div>
            
            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Edit Route</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-white hover:text-gray-200 transition-colors duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleEditRoute} className="px-6 py-5">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter route name"
                      value={editRoute.name}
                      onChange={(e) => setEditRoute({ ...editRoute, name: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Enter route description (optional)"
                      value={editRoute.description}
                      onChange={(e) => setEditRoute({ ...editRoute, description: e.target.value })}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-md transition-colors flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Route
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}