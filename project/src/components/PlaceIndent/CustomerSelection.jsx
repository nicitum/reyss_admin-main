import React, { useEffect, useMemo, useState } from "react";
import { 
  Search, 
  User, 
  Phone, 
  MapPin, 
  ChevronRight, 
  Users, 
  Filter,
  ArrowRight
} from "lucide-react";
import { getUsers } from "../../services/api";
import toast from "react-hot-toast";

export default function CustomerSelection({ onCustomerSelect, selectedCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const data = await getUsers("");
        const customerData = Array.isArray(data) ? data : [];
        setCustomers(customerData);
      } catch (error) {
        toast.error("Failed to load customers");
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const uniqueRoutes = useMemo(() => {
    const routes = customers
      .map(c => c.route)
      .filter(Boolean) // Remove null/undefined values
      .map(route => String(route).trim()) // Convert to string and trim whitespace
      .filter(route => route.length > 0) // Remove empty strings
      .filter((route, index, arr) => arr.indexOf(route) === index); // Remove duplicates
    return routes.sort((a, b) => a.localeCompare(b)); // Natural sort
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    
    // Apply search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((c) =>
        [c.name, c.username, c.customer_id, c.phone, c.route]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      );
    }
    
    // Apply route filter
    if (routeFilter) {
      filtered = filtered.filter(c => {
        const customerRoute = c.route ? String(c.route).trim() : '';
        return customerRoute === routeFilter;
      });
    }
    
    return filtered;
  }, [customers, searchTerm, routeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handleCustomerSelect = (customer) => {
    onCustomerSelect(customer);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRouteFilter("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Select Customer
              </h1>
              <p className="text-gray-600 text-lg">
                Choose a customer to place an order for
              </p>
            </div>
            <div className="bg-blue-100 rounded-2xl p-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h2 className="text-white text-xl font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Search & Filter
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Customers
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name, username, customer ID, phone, or route..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Route Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Route
                </label>
                <select
                  value={routeFilter}
                  onChange={(e) => {
                    setRouteFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Routes</option>
                  {uniqueRoutes.map((route) => (
                    <option key={route} value={route}>
                      {route}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Results Summary and Clear Filter */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{paginatedCustomers.length}</span> of{" "}
                <span className="font-semibold">{filteredCustomers.length}</span> customers
                {uniqueRoutes.length > 0 && (
                  <span className="ml-4 text-xs text-gray-500">
                    • {uniqueRoutes.length} routes available
                  </span>
                )}
              </div>
              {(searchTerm || routeFilter) && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
            <h2 className="text-white text-xl font-semibold">Customer Directory</h2>
          </div>
          
          {paginatedCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-500">
                {searchTerm || routeFilter
                  ? "Try adjusting your search criteria"
                  : "No customers available at the moment"}
              </p>
            </div>
          ) : (
            <>
              {/* Customer Cards */}
              <div className="p-6">
                <div className="grid gap-4">
                  {paginatedCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`group relative bg-gray-50 hover:bg-blue-50 border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer ${
                        selectedCustomer?.id === customer.id
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          {/* Avatar */}
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                            selectedCustomer?.id === customer.id
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                          } transition-colors duration-200`}>
                            <User className="h-6 w-6" />
                          </div>
                          
                          {/* Customer Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {customer.name}
                              </h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                ID: {customer.customer_id}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="truncate">{customer.username}</span>
                              </div>
                              
                              {customer.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              
                              {customer.route && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                  <span className="truncate">{customer.route}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <div className="flex items-center space-x-3">
                          {selectedCustomer?.id === customer.id && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              Selected
                            </span>
                          )}
                          
                          <button className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                            selectedCustomer?.id === customer.id
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-600 group-hover:bg-blue-500 group-hover:text-white"
                          }`}>
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
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
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white"
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
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Selected Customer Summary & Next Button */}
        {selectedCustomer && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Selected: {selectedCustomer.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ID: {selectedCustomer.customer_id} • Route: {selectedCustomer.route}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => onCustomerSelect(selectedCustomer)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  <span>Continue to Products</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}