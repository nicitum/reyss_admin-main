import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { getRoutes, addRoute, updateRoute, deleteRoute } from "../services/api";
import toast from "react-hot-toast";

export default function RouteMasters() {
  const [routes, setRoutes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Masters</h1>
          <p className="text-gray-600 mt-1">Manage delivery routes and their descriptions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus className="mr-2" size={20} />
          Add Route
        </button>
      </div>


      {/* Routes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {route.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="mr-2 text-indigo-500" size={16} />
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
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRoute(route.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <MapPin className="mx-auto mb-4 text-gray-300" size={48} />
                    <p className="text-lg font-medium">No routes found</p>
                    <p className="text-sm">Get started by adding your first route</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New Route</h3>
            </div>
            <form onSubmit={handleAddRoute} className="p-6">
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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  Add Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Route Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Edit Route</h3>
            </div>
            <form onSubmit={handleEditRoute} className="p-6">
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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  Update Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
