import React, { useEffect, useMemo, useState } from "react";
import { 
  Search, 
  User, 
  Phone, 
  MapPin, 
  ChevronRight, 
  Users, 
  Filter,
  ArrowRight,
  Repeat,
  Sunrise,
  Sunset,
  Moon
} from "lucide-react";
import { getUsers, getMostRecentOrder, getOrderProducts, placeOrder } from "../../services/api";

export default function CustomerSelection({ onCustomerSelect, selectedCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReorderMenu, setShowReorderMenu] = useState(null); // Track which customer's reorder menu is open
  const [reorderLoading, setReorderLoading] = useState({});
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const data = await getUsers("");
        const customerData = Array.isArray(data) ? data : [];
        setCustomers(customerData);
      } catch (error) {
        console.error("Failed to load customers");
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

  const handleReorderClick = (customerId, e) => {
    e.stopPropagation(); // Prevent customer selection when clicking reorder
    setShowReorderMenu(showReorderMenu === customerId ? null : customerId);
  };

  const handleOrderTypeSelect = async (customerId, orderType, action) => {
    try {
      setReorderLoading(prev => ({ ...prev, [customerId]: true }));
      
      console.log('Fetching most recent order for:', { customerId, orderType });
      
      // Fetch the most recent order for this customer and order type
      const orderResponse = await getMostRecentOrder(customerId, orderType);
      console.log('Order response:', orderResponse);
      
      if (!orderResponse.success) {
        console.error(`Failed to fetch ${orderType} order:`, orderResponse.message);
        return;
      }
      
      if (!orderResponse.order) {
        console.error(`No previous ${orderType} orders found for this customer`);
        return;
      }
      
      const orderId = orderResponse.order.id;
      console.log('Fetching products for order ID:', orderId);
      
      // Fetch order products
      const productsResponse = await getOrderProducts(orderId);
      console.log('Raw products response:', productsResponse);
      console.log('Products response structure:', {
        type: typeof productsResponse,
        keys: productsResponse ? Object.keys(productsResponse) : null,
        isArray: Array.isArray(productsResponse),
        hasData: productsResponse && productsResponse.data,
        dataType: productsResponse && productsResponse.data ? typeof productsResponse.data : null,
        dataIsArray: productsResponse && productsResponse.data ? Array.isArray(productsResponse.data) : null
      });
      
      if (action === 'confirm') {
        // Confirm and place order directly
        await handleConfirmReorder(customerId, orderType, productsResponse);
      } else if (action === 'edit') {
        // Navigate to product catalog with prefilled items
        handleEditReorder(customerId, orderType, productsResponse);
      }
    } catch (error) {
      console.error(`Error processing ${orderType} reorder:`, error);
    } finally {
      setReorderLoading(prev => ({ ...prev, [customerId]: false }));
      setShowReorderMenu(null);
    }
  };

  const handleConfirmReorder = async (customerId, orderType, productsResponse) => {
    try {
      console.log('Confirming reorder with products response:', productsResponse);
      
      // Check if productsResponse has the expected structure
      if (!productsResponse) {
        return;
      }
      
      // Format products for placeOrder function
      let formattedProducts = [];
      
      // Handle different possible data structures
      let productsToProcess = [];
      if (Array.isArray(productsResponse)) {
        // Direct array format
        productsToProcess = productsResponse;
      } else if (Array.isArray(productsResponse.data)) {
        // Object with data array
        productsToProcess = productsResponse.data;
      } else if (typeof productsResponse.data === 'object') {
        // Single object
        productsToProcess = [productsResponse.data];
      } else if (typeof productsResponse === 'object') {
        // Direct object
        productsToProcess = [productsResponse];
      }
      
      console.log('Processing products for confirm:', productsToProcess);
      
      formattedProducts = productsToProcess.map(product => ({
        id: product.product_id || product.id || product.productId,
        quantity: product.quantity || product.qty || 0,
        price: product.price || 0
      })).filter(product => product.id); // Filter out invalid products
      
      console.log('Formatted products:', formattedProducts);
      
      if (formattedProducts.length === 0) {
        return;
      }
      
      // Get today's date for the order
      const orderDate = new Date().toISOString().split('T')[0];
      console.log('Placing order with:', { formattedProducts, orderType, orderDate, customerId });
      
      // Place the order
      const response = await placeOrder(formattedProducts, orderType, orderDate, customerId);
      console.log('Order placement response:', response);
      
      if (response.success) {
        console.log(`${orderType} order placed successfully!`);
      } else {
        console.error(`Failed to place ${orderType} order:`, response.message);
      }
    } catch (error) {
      console.error(`Error placing ${orderType} order:`, error);
    }
  };

  const handleEditReorder = (customerId, orderType, productsResponse) => {
    try {
      console.log('Editing reorder with products response:', productsResponse);
      
      // Store the products in localStorage to be used in ProductCatalogue
      // The productsResponse is already an array, so we store it directly
      localStorage.setItem('reorderProducts', JSON.stringify(productsResponse));
      localStorage.setItem('reorderType', orderType);
      
      // Dispatch storage event to notify ProductCatalogue component
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'reorderProducts',
        newValue: JSON.stringify(productsResponse)
      }));
      
      // Select the customer and navigate to product catalog
      const customer = customers.find(c => c.customer_id === customerId);
      if (customer) {
        // Add a small delay to ensure ProductCatalogue has time to process
        setTimeout(() => {
          onCustomerSelect(customer);
        }, 100);
      }
    } catch (error) {
      console.error(`Error preparing edit reorder:`, error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Select Customer
              </h1>
              <p className="text-gray-600">
                Choose a customer to place an order for
              </p>
            </div>
            <div className="bg-orange-100 rounded-xl p-3">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2">
            <h2 className="text-white text-sm font-semibold flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Search & Filter
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by name, username, customer ID, phone, or route..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>
              </div>
              
              {/* Route Filter */}
              <div>
                <select
                  value={routeFilter}
                  onChange={(e) => {
                    setRouteFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-1.5 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
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
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Showing <span className="font-semibold">{paginatedCustomers.length}</span> of{" "}
                <span className="font-semibold">{filteredCustomers.length}</span> customers
                {uniqueRoutes.length > 0 && (
                  <span className="ml-3 text-xs text-gray-500">
                    • {uniqueRoutes.length} routes available
                  </span>
                )}
              </div>
              {(searchTerm || routeFilter) && (
                <button
                  onClick={clearFilters}
                  className="text-orange-600 hover:text-orange-800 text-xs font-medium transition-colors duration-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">Customer Directory</h2>
          </div>
          
          {paginatedCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No customers found</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm || routeFilter
                  ? "Try adjusting your search criteria"
                  : "No customers available at the moment"}
              </p>
            </div>
          ) : (
            <>
              {/* Customer Cards */}
              <div className="p-4">
                <div className="grid gap-3">
                  {paginatedCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`group relative bg-gray-50 hover:bg-orange-50 border rounded-lg p-4 transition-all duration-300 cursor-pointer ${
                        selectedCustomer?.id === customer.id
                          ? "border-orange-500 bg-orange-50 ring-1 ring-orange-200"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                          {/* Avatar */}
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm ${
                            selectedCustomer?.id === customer.id
                              ? "bg-orange-500 text-white"
                              : "bg-gray-200 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600"
                          } transition-colors duration-200`}>
                            <User className="h-5 w-5" />
                          </div>
                          
                          {/* Customer Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate text-sm">
                                {customer.name}
                              </h3>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                ID: {customer.customer_id}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1 text-gray-400" />
                                <span className="truncate">{customer.username}</span>
                              </div>
                              
                              {customer.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              
                              {customer.route && (
                                <div className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                  <span className="truncate">{customer.route}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {/* Reorder Button */}
                          <div className="relative">
                            <button 
                              onClick={(e) => handleReorderClick(customer.customer_id, e)}
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-orange-500 hover:text-white transition-all duration-200"
                              disabled={reorderLoading[customer.customer_id]}
                            >
                              {reorderLoading[customer.customer_id] ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                              ) : (
                                <Repeat className="h-4 w-4" />
                              )}
                            </button>
                            
                            {/* Reorder Menu */}
                            {showReorderMenu === customer.customer_id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleOrderTypeSelect(customer.customer_id, 'AM', 'confirm')}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    <Sunrise className="h-3 w-3 mr-1" />
                                    Confirm AM Order
                                  </button>
                                  <button
                                    onClick={() => handleOrderTypeSelect(customer.customer_id, 'AM', 'edit')}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    <Sunrise className="h-3 w-3 mr-1" />
                                    Edit & Reorder AM
                                  </button>
                                  <button
                                    onClick={() => handleOrderTypeSelect(customer.customer_id, 'PM', 'confirm')}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    <Sunset className="h-3 w-3 mr-1" />
                                    Confirm PM Order
                                  </button>
                                  <button
                                    onClick={() => handleOrderTypeSelect(customer.customer_id, 'PM', 'edit')}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    <Sunset className="h-3 w-3 mr-1" />
                                    Edit & Reorder PM
                                  </button>
                                  <button
                                    onClick={() => handleOrderTypeSelect(customer.customer_id, 'Evening', 'confirm')}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    <Moon className="h-3 w-3 mr-1" />
                                    Confirm Evening Order
                                  </button>
                                  <button
                                    onClick={() => handleOrderTypeSelect(customer.customer_id, 'Evening', 'edit')}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    <Moon className="h-3 w-3 mr-1" />
                                    Edit & Reorder Evening
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {selectedCustomer?.id === customer.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Selected
                            </span>
                          )}
                          
                          <button className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                            selectedCustomer?.id === customer.id
                              ? "bg-orange-500 text-white"
                              : "bg-gray-200 text-gray-600 group-hover:bg-orange-500 group-hover:text-white"
                          }`}>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors duration-200 ${
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
                        className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      Selected: {selectedCustomer.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      ID: {selectedCustomer.customer_id} • Route: {selectedCustomer.route}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => onCustomerSelect(selectedCustomer)}
                  className="flex items-center space-x-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                >
                  <span>Continue to Products</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}