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
  Moon,
  CheckSquare,
  Square,
  Layers,
  Clock
} from "lucide-react";
import { getUsers, getMostRecentOrder, getOrderProducts, placeOrder, updateAmountDue } from "../../services/api";
import { toast } from 'react-hot-toast'; // Added toast import

export default function CustomerSelection({ onCustomerSelect, selectedCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReorderMenu, setShowReorderMenu] = useState(null); // Track which customer's reorder menu is open
  const [reorderLoading, setReorderLoading] = useState({});
  const [bulkSelectedCustomers, setBulkSelectedCustomers] = useState([]); // For bulk selection
  const [showBulkReorderMenu, setShowBulkReorderMenu] = useState(false); // For bulk reorder menu
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const data = await getUsers("");
        // Filter for users with role "user" only
        const customerData = Array.isArray(data) ? data.filter(user => user.role === "user") : [];
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

  // Bulk selection functions
  const toggleCustomerSelection = (customerId) => {
    setBulkSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const selectAllCustomers = () => {
    const allCustomerIds = paginatedCustomers.map(c => c.customer_id);
    setBulkSelectedCustomers(allCustomerIds);
  };

  const clearAllSelections = () => {
    setBulkSelectedCustomers([]);
  };

  const handleReorderClick = (customerId, e) => {
    e.stopPropagation(); // Prevent customer selection when clicking reorder
    setShowReorderMenu(showReorderMenu === customerId ? null : customerId);
  };

  // Handle bulk reorder
  const handleBulkReorder = async (orderType, action) => {
    // Filter customers to only include those with auto order enabled for the selected order type
    const autoOrderCustomers = bulkSelectedCustomers.filter(customerId => {
      const customer = customers.find(c => c.customer_id === customerId);
      return customer && hasAutoOrderEnabled(customer, orderType);
    });
    
    // If no customers have auto order enabled, show a message
    if (autoOrderCustomers.length === 0) {
      toast.error(`No selected customers have auto ${orderType} order enabled. Please select customers with auto orders enabled.`);
      return;
    }
    
    // If some customers don't have auto order enabled, show a warning
    if (autoOrderCustomers.length < bulkSelectedCustomers.length) {
      const nonAutoOrderCount = bulkSelectedCustomers.length - autoOrderCustomers.length;
      toast(`Processing ${autoOrderCustomers.length} customers with auto ${orderType} order enabled. Skipping ${nonAutoOrderCount} customers without auto orders.`, {
        icon: 'ℹ️'
      });
    } else {
      toast(`Processing ${autoOrderCustomers.length} customers with auto ${orderType} order enabled...`, {
        icon: '🔄'
      });
    }

    try {
      setReorderLoading(prev => ({ ...prev, bulk: true }));
      
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      const customerIdsForUpdate = [];
      const amountsForUpdate = [];

      // Set a flag to indicate we're in a bulk operation
      window.isBulkReorderOperation = true;

      // Process each customer with auto order enabled
      for (const customerId of autoOrderCustomers) {
        try {
          console.log(`Processing bulk reorder for customer ${customerId}`);
          
          // Fetch the most recent order for this customer and order type
          const orderResponse = await getMostRecentOrder(customerId, orderType);
          
          if (!orderResponse.success) {
            throw new Error(orderResponse.message || `Failed to fetch ${orderType} order`);
          }
          
          if (!orderResponse.order) {
            throw new Error(`No ${orderType} order found`);
          }
          
          const orderId = orderResponse.order.id;
          
          // Fetch order products
          const productsResponse = await getOrderProducts(orderId);
          
          if (action === 'confirm') {
            // For bulk operations, we need to calculate the total amount before placing the order
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
            
            formattedProducts = productsToProcess.map(product => ({
              id: product.product_id || product.id || product.productId,
              quantity: product.quantity || product.qty || 0,
              price: product.price || 0
            })).filter(product => product.id); // Filter out invalid products
            
            if (formattedProducts.length > 0) {
              // Calculate total amount
              const totalAmount = formattedProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
              
              // Place order directly without calling handleConfirmReorder to avoid individual updates
              const orderDate = new Date().toISOString().split('T')[0];
              const response = await placeOrder(formattedProducts, orderType, orderDate, customerId);
              
              console.log('Order placement response for customer', customerId, ':', response);
              
              // Check if order was successful - more robust checking
              let isOrderSuccessful = false;
              
              if (response) {
                // Check various success indicators
                if (response.success === true || response.status === 'success' || response.code === 200 || response.status === 200) {
                  isOrderSuccessful = true;
                } else if (response.message && !response.message.toLowerCase().includes('error') && !response.message.toLowerCase().includes('failed')) {
                  // If there's a message that doesn't indicate an error, consider it a success
                  isOrderSuccessful = true;
                } else if (Object.keys(response).length > 0 && !response.error) {
                  // If response has content and no explicit error, consider it a success
                  isOrderSuccessful = true;
                }
              }
              
              if (isOrderSuccessful) {
                successCount++;
                // Only add to bulk update if order was successful
                customerIdsForUpdate.push(customerId);
                amountsForUpdate.push(totalAmount);
              } else {
                errorCount++;
              }
            } else {
              errorCount++;
            }
          } else if (action === 'edit') {
            // For bulk edit, we'll just show a message as this would require a different flow
            toast.error("Bulk edit is not supported. Please use individual edit option.");
            errorCount++;
          }
        } catch (error) {
          console.error(`Error processing reorder for customer ${customerId}:`, error);
          errorCount++;
        }
      }
      
      // Clear the bulk operation flag
      window.isBulkReorderOperation = false;
      
      // Update amount due for all successful customers in bulk
      if (customerIdsForUpdate.length > 0) {
        try {
          console.log('Updating amount due for customers:', customerIdsForUpdate, 'with amounts:', amountsForUpdate);
          const updateResponse = await updateAmountDue(customerIdsForUpdate, amountsForUpdate, 'add');
          console.log('Amount due update response:', updateResponse);
          
          if (updateResponse && updateResponse.successCount > 0) {
            toast.success(`Successfully updated amount due for ${updateResponse.successCount} customers`);
          } else if (updateResponse && updateResponse.errorCount > 0) {
            toast.error(`Failed to update amount due for ${updateResponse.errorCount} customers`);
          }
        } catch (updateError) {
          console.error("Failed to bulk update amount due:", updateError);
          toast.error(`Failed to update amount due: ${updateError.message}`);
        }
      }
      
      // Show summary toast
      if (successCount > 0) {
        toast.success(`Successfully placed ${successCount} auto ${orderType} orders`);
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to place ${errorCount} auto ${orderType} orders`);
      }
      
      // Clear selections after bulk operation
      setBulkSelectedCustomers([]);
      setShowBulkReorderMenu(false);
    } catch (error) {
      // Clear the bulk operation flag in case of error
      window.isBulkReorderOperation = false;
      console.error("Error in bulk reorder operation:", error);
      toast.error(`Error in bulk reorder: ${error.message}`);
    } finally {
      setReorderLoading(prev => ({ ...prev, bulk: false }));
    }
  };

  const handleOrderTypeSelect = async (customerId, orderType, action) => {
    // Find the customer
    const customer = customers.find(c => c.customer_id === customerId);
    
    // Check if auto order is enabled for this order type when action is 'edit'
    if (action === 'edit' && customer && !hasAutoOrderEnabled(customer, orderType)) {
      toast.error(`Auto ${orderType} order is disabled for this customer. Cannot proceed with edit and reorder.`);
      setShowReorderMenu(null);
      return;
    }
    
    // Fetch the most recent order for this customer and order type
    try {
      setReorderLoading(prev => ({ ...prev, [customerId]: true }));
      
      console.log('Fetching most recent order for:', { customerId, orderType });
      
      // Fetch the most recent order for this customer and order type
      const orderResponse = await getMostRecentOrder(customerId, orderType);
      console.log('Order response:', orderResponse);
      
      if (!orderResponse.success) {
        console.error(`Failed to fetch ${orderType} order:`, orderResponse.message);
        toast.error(`Failed to fetch ${orderType} order: ${orderResponse.message}`);
        setReorderLoading(prev => ({ ...prev, [customerId]: false }));
        setShowReorderMenu(null);
        return;
      }
      
      if (!orderResponse.order) {
        console.error(`No ${orderType} order found for this customer`);
        toast.error(`No ${orderType} order found`);
        setReorderLoading(prev => ({ ...prev, [customerId]: false }));
        setShowReorderMenu(null);
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
      
      // Handle action based on user selection, regardless of auto-order status
      if (action === 'edit') {
        // Navigate to product catalog with prefilled items for editing
        handleEditReorder(customerId, orderType, productsResponse);
      } else if (action === 'confirm') {
        // For confirm action, check if customer has auto order enabled
        if (customer && hasAutoOrderEnabled(customer, orderType)) {
          // Show a toast indicating auto order is being processed
          toast(`Processing auto ${orderType} order for ${customer.name}...`, {
            icon: '🔄'
          });
        }
        // Confirm and place order directly
        await handleConfirmReorder(customerId, orderType, productsResponse);
      }
    } catch (error) {
      console.error(`Error processing ${orderType} reorder:`, error);
      toast.error(`Error processing ${orderType} reorder: ${error.message}`);
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
        toast.error("No products found for reorder");
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
        toast.error("No valid products found for reorder");
        return;
      }
      
      // Get today's date for the order
      const orderDate = new Date().toISOString().split('T')[0];
      console.log('Placing order with:', { formattedProducts, orderType, orderDate, customerId });
      
      // Calculate total amount from products
      const totalAmount = formattedProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
      
      // Place the order
      const response = await placeOrder(formattedProducts, orderType, orderDate, customerId);
      console.log('Order placement response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      
      // Update amount due after successful order placement
      if (response && (response.success === true || response.status === 'success' || response.code === 200 || response.status === 200)) {
        try {
          await updateAmountDue(customerId, totalAmount, 'add');
          console.log(`Successfully updated amount due for customer ${customerId}`);
        } catch (updateError) {
          console.error("Failed to update amount due:", updateError);
          // Don't show error to user as the order was placed successfully
        }
      }
      
      // Robust response handling - assume success unless we can prove it's an error
      let isSuccessful = true; // Default to success
      let message = `${orderType} reorder placed successfully!`;
      
      try {
        // Log the entire response for debugging
        console.log('Full response structure:', JSON.stringify(response, null, 2));
        
        // If response is null or undefined, it's an error
        if (!response) {
          isSuccessful = false;
          message = 'No response received from server';
        }
        // Check for explicit error indicators
        else if (response.success === false || 
                 response.status === 'error' || 
                 response.error ||
                 response.code > 400 ||
                 (response.message && (response.message.toLowerCase().includes('error') || response.message.toLowerCase().includes('failed')))) {
          isSuccessful = false;
          message = response.message || response.error || response.statusText || 'Order placement failed';
        }
        // Check for explicit success indicators
        else if (response.success === true || 
                 response.status === 'success' || 
                 response.code === 200 ||
                 response.status === 200) {
          isSuccessful = true;
          message = response.message || `${orderType} reorder placed successfully!`;
        }
        // Check if response contains data with success/error indicators
        else if (response.data) {
          if (response.data.success === false || 
              response.data.status === 'error' || 
              response.data.error ||
              (response.data.message && (response.data.message.toLowerCase().includes('error') || response.data.message.toLowerCase().includes('failed')))) {
            isSuccessful = false;
            message = response.data.message || response.data.error || 'Order placement failed';
          } else if (response.data.success === true || 
                     response.data.status === 'success') {
            isSuccessful = true;
            message = response.data.message || `${orderType} reorder placed successfully!`;
          }
        }
        // If we got here and there's a message that looks like an error, treat it as an error
        else if (response.message && (response.message.toLowerCase().includes('error') || response.message.toLowerCase().includes('failed'))) {
          isSuccessful = false;
          message = response.message;
        }
        // Default case: if we can't determine it's an error, assume success
        else {
          isSuccessful = true;
          // Use the response message if it exists and doesn't look like an error, otherwise use default
          if (response.message && !response.message.toLowerCase().includes('error') && !response.message.toLowerCase().includes('failed')) {
            message = response.message;
          } else {
            message = `${orderType} reorder placed successfully!`;
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        // If we can't parse the response, assume it's a success with default message
        isSuccessful = true;
        message = `${orderType} reorder placed successfully!`;
      }
      
      // Show appropriate toast based on success/failure
      if (isSuccessful) {
        console.log(`${orderType} order placed successfully!`);
        toast.success(message); // Green success toast
      } else {
        console.error(`Failed to place ${orderType} order:`, message);
        toast.error(message); // Red error toast
      }
    } catch (error) {
      console.error(`Error placing ${orderType} order:`, error);
      toast.error(`Error placing ${orderType} order: ${error.message}`); // Red error toast for exceptions
    }
  };

  const handleEditReorder = (customerId, orderType, productsResponse) => {
    try {
      console.log('Editing reorder with products response:', productsResponse);
      
      // Check if there are products to reorder
      let hasProducts = false;
      
      // Handle different possible data structures
      if (Array.isArray(productsResponse) && productsResponse.length > 0) {
        hasProducts = true;
      } else if (productsResponse && Array.isArray(productsResponse.data) && productsResponse.data.length > 0) {
        hasProducts = true;
      } else if (productsResponse && typeof productsResponse.data === 'object' && productsResponse.data !== null) {
        hasProducts = true;
      } else if (productsResponse && typeof productsResponse === 'object' && productsResponse !== null) {
        hasProducts = true;
      }
      
      if (!hasProducts) {
        toast.error(`No products found in previous ${orderType} order. Cannot proceed to cart.`);
        return;
      }
      
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
      toast.error(`Error preparing edit reorder: ${error.message}`);
    }
  };

  // Function to count how many selected customers have auto order enabled for each type
  const countAutoOrderCustomers = (orderType) => {
    return bulkSelectedCustomers.filter(customerId => {
      const customer = customers.find(c => c.customer_id === customerId);
      return customer && hasAutoOrderEnabled(customer, orderType);
    }).length;
  };

  // Function to get auto order status with user-friendly display
  const getCustomerAutoOrderStatus = (customer) => {
    const statuses = [];
    
    if (customer.auto_am_order === 'Yes') {
      statuses.push('AM');
    }
    if (customer.auto_pm_order === 'Yes') {
      statuses.push('PM');
    }
    if (customer.auto_eve_order === 'Yes') {
      statuses.push('Eve');
    }
    
    return statuses;
  };

  // Function to check if customer has auto order enabled for a specific order type
  const hasAutoOrderEnabled = (customer, orderType) => {
    if (!customer || !orderType) return false;
    
    switch (orderType) {
      case 'AM':
        return customer.auto_am_order === 'Yes';
      case 'PM':
        return customer.auto_pm_order === 'Yes';
      case 'Evening':
        return customer.auto_eve_order === 'Yes';
      default:
        return false;
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

        {/* Bulk Actions Section - Moved below filter section */}
        {paginatedCustomers.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg mb-6 overflow-visible">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2">
              <h2 className="text-white text-sm font-semibold">Bulk Actions</h2>
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {bulkSelectedCustomers.length > 0 ? (
                    <>
                      <span className="text-sm text-gray-700">
                        {bulkSelectedCustomers.length} customer{bulkSelectedCustomers.length !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={clearAllSelections}
                        className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
                      >
                        Clear Selection
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={selectAllCustomers}
                      className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200 flex items-center"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Select All
                    </button>
                  )}
                </div>
                
                {/* Bulk Reorder Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBulkReorderMenu(!showBulkReorderMenu)}
                    disabled={bulkSelectedCustomers.length === 0}
                    className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Bulk Process</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Bulk Reorder Menu - Fixed visibility issue */}
                  {showBulkReorderMenu && (
                    <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            handleBulkReorder('AM', 'confirm');
                            setShowBulkReorderMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                        >
                          <Sunrise className="h-4 w-4 mr-2" />
                          Confirm AM Orders
                          {bulkSelectedCustomers.length > 0 && (
                            <span className="ml-auto text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                              {countAutoOrderCustomers('AM')} customers
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            handleBulkReorder('PM', 'confirm');
                            setShowBulkReorderMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                        >
                          <Sunset className="h-4 w-4 mr-2" />
                          Confirm PM Orders
                          {bulkSelectedCustomers.length > 0 && (
                            <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {countAutoOrderCustomers('PM')} customers
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            handleBulkReorder('Evening', 'confirm');
                            setShowBulkReorderMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                        >
                          <Moon className="h-4 w-4 mr-2" />
                          Confirm Evening Orders
                          {bulkSelectedCustomers.length > 0 && (
                            <span className="ml-auto text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                              {countAutoOrderCustomers('Evening')} customers
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                  {paginatedCustomers.map((customer) => {
                    // Get auto order status for display
                    const autoOrderStatus = getCustomerAutoOrderStatus(customer);
                    
                    return (
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
                            {/* Checkbox for bulk selection */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCustomerSelection(customer.customer_id);
                              }}
                              className="flex items-center justify-center w-5 h-5 rounded border border-gray-300 bg-white mt-1"
                            >
                              {bulkSelectedCustomers.includes(customer.customer_id) && (
                                <CheckSquare className="h-4 w-4 text-orange-500" />
                              )}
                            </button>
                            
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
                                {/* Auto Order Indicator Badge */}
                                {getCustomerAutoOrderStatus(customer).length > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Auto
                                  </span>
                                )}
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
                              
                              {/* Auto Order Information */}
                              <div className="mt-2 flex items-start">
                                <Clock className="h-3 w-3 mr-1 text-orange-500 flex-shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1">
                                  {autoOrderStatus && autoOrderStatus.length > 0 ? (
                                    autoOrderStatus.map((status, index) => {
                                      let IconComponent = Sunrise;
                                      let bgColor = "bg-orange-100";
                                      let textColor = "text-orange-800";
                                      
                                      if (status === 'PM') {
                                        IconComponent = Sunset;
                                        bgColor = "bg-blue-100";
                                        textColor = "text-blue-800";
                                      } else if (status === 'Eve') {
                                        IconComponent = Moon;
                                        bgColor = "bg-purple-100";
                                        textColor = "text-purple-800";
                                      }
                                      
                                      return (
                                        <span 
                                          key={index} 
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
                                        >
                                          <IconComponent className="h-3 w-3 mr-1" />
                                          {status}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-gray-500 font-medium">
                                      No Auto Orders
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Auto Order Indicator */}
                              {autoOrderStatus && autoOrderStatus.length > 0 && (
                                <div className="mt-1 flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                                  <span className="text-xs text-green-600 font-medium">
                                    Auto Order Enabled
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                            {/* Reorder Button - Only Edit options now */}
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
                              
                              {/* Reorder Menu - Only Edit options */}
                              {showReorderMenu === customer.customer_id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                  <div className="py-1">
                                    <button
                                      onClick={() => hasAutoOrderEnabled(customer, 'AM') ? handleOrderTypeSelect(customer.customer_id, 'AM', 'edit') : null}
                                      disabled={!hasAutoOrderEnabled(customer, 'AM')}
                                      className={`flex items-center w-full px-4 py-2 text-sm ${
                                        hasAutoOrderEnabled(customer, 'AM')
                                          ? 'text-gray-700 hover:bg-orange-50 hover:text-orange-700 cursor-pointer'
                                          : 'text-gray-400 cursor-not-allowed bg-gray-50'
                                      }`}
                                      title={!hasAutoOrderEnabled(customer, 'AM') ? 'Auto AM order is disabled for this customer' : ''}
                                    >
                                      <Sunrise className="h-4 w-4 mr-2" />
                                      Edit & Reorder AM
                                      {!hasAutoOrderEnabled(customer, 'AM') && (
                                        <span className="ml-auto text-xs text-gray-400">(Disabled)</span>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => hasAutoOrderEnabled(customer, 'PM') ? handleOrderTypeSelect(customer.customer_id, 'PM', 'edit') : null}
                                      disabled={!hasAutoOrderEnabled(customer, 'PM')}
                                      className={`flex items-center w-full px-4 py-2 text-sm ${
                                        hasAutoOrderEnabled(customer, 'PM')
                                          ? 'text-gray-700 hover:bg-orange-50 hover:text-orange-700 cursor-pointer'
                                          : 'text-gray-400 cursor-not-allowed bg-gray-50'
                                      }`}
                                      title={!hasAutoOrderEnabled(customer, 'PM') ? 'Auto PM order is disabled for this customer' : ''}
                                    >
                                      <Sunset className="h-4 w-4 mr-2" />
                                      Edit & Reorder PM
                                      {!hasAutoOrderEnabled(customer, 'PM') && (
                                        <span className="ml-auto text-xs text-gray-400">(Disabled)</span>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => hasAutoOrderEnabled(customer, 'Evening') ? handleOrderTypeSelect(customer.customer_id, 'Evening', 'edit') : null}
                                      disabled={!hasAutoOrderEnabled(customer, 'Evening')}
                                      className={`flex items-center w-full px-4 py-2 text-sm ${
                                        hasAutoOrderEnabled(customer, 'Evening')
                                          ? 'text-gray-700 hover:bg-orange-50 hover:text-orange-700 cursor-pointer'
                                          : 'text-gray-400 cursor-not-allowed bg-gray-50'
                                      }`}
                                      title={!hasAutoOrderEnabled(customer, 'Evening') ? 'Auto Evening order is disabled for this customer' : ''}
                                    >
                                      <Moon className="h-4 w-4 mr-2" />
                                      Edit & Reorder Evening
                                      {!hasAutoOrderEnabled(customer, 'Evening') && (
                                        <span className="ml-auto text-xs text-gray-400">(Disabled)</span>
                                      )}
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
                    );
                  })}
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