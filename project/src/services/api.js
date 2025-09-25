import axios from "axios";
import { jwtDecode } from "jwt-decode"; // Use curly braces

const api = axios.create({
  baseURL: "http://82.112.226.135:8090",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (username, password) => {
  const response = await api.post("/auth", { username, password });
  const token = response.data.token;

  if (token) {
    const decodedToken = jwtDecode(token); // Decode token to get user details
    localStorage.setItem("loggedInUser", JSON.stringify(decodedToken));
    localStorage.setItem("authToken", token); // Store token for API calls
  }

  return response.data;
};

export const getOrders = async (date) => {
  const response = await api.get(`/allOrders?date=${date}`);
  console.log("Full API Response:", response); // Log the entire response
  console.log("response.data:", response.data);
  return response.data.data;
};

export const getUsers = async (search) => {
  try {
    console.log('API Call - getUsers:', { search });
    const response = await api.get(
      `/allUsers${search ? `?search=${search}` : ""}`
    );
    console.log('API Response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const getAdmins = async () => {
  try {
    console.log('API Call - getAdmins');
    const response = await api.get('/fetch_admins');
    console.log('API Response - getAdmins:', response.data);
    return response.data.data.admins;
  } catch (error) {
    console.error("Error fetching admins:", error);
    throw error;
  }
};

export const addUser = async (userDetails) => {
  const response = await api.post(`/addUser`, userDetails);
  return response.data.data;
};

// Double-check that the backend expects the role to be part of the payload
export const updateUser = async (userId, userData) => {
  console.log(userData); // Verify if role is in the request payload
  const response = await api.post(`/update?customer_id=${userId}`, userData);
  return response.data.data;
};


export const toggleUserBlock = async (userId, status) => {
  const response = await api.post(`/update?customer_id=${userId}`, { status });
  return response.data.data;
};

export const getPayments = async () => {
  const response = await api.get("/payments");
  return response.data.data;
};

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

// Place an order (web admin version). Backend may derive customer from token,
// but we also pass an explicit identifier if provided for on-behalf placement.
export const placeOrder = async (products, orderType, orderDate, customerId = null) => {
  const payload = { products, orderType, orderDate };
  if (customerId) {
    payload.customer_id = customerId;
    payload.customerId = customerId; // send both to match backend expectations
  }
  const response = await api.post("/place", payload);
  return response.data;
};

export const addProduct = async (productData) => {
  const response = await api.post("/newItem", productData);
  return response.data;
};

export const updateProduct = async (productId, productData) => {
  const response = await api.post(`/editProd?id=${productId}`, productData);
  return response.data;
};

export const updateProductsByBrand = async (brand, updateData) => {
  const response = await api.patch(`/products/brand/${brand}`, updateData);
  return response.data;
};



export const saveAssignment = async (customerId, routes) => {
  try {
    console.log("Request Body:", { customerId, routes });  // Log the request body
    
    const response = await api.post("/save-assignment", {
      customerId: customerId,
      routes: routes,
    });

    if (response.data) {
      return response.data;
    } else {
      throw new Error("Invalid response from server");
    }
  } catch (error) {
    console.error("Error while saving assignment:", error);
    throw error;
  }
};

// New function to get assigned routes for a given customerId (admin)
export const getAssignedRoutes = async (customerId) => {
  try {
    console.log("Fetching assigned routes for customerId:", customerId);

    const response = await api.post("/get-all-assigned-routes", {
      customerId: customerId,
    });

    if (response.data && response.data.success) {
     
      return response.data.assignedRoutes; // Return the list of assigned routes
    } else {
      throw new Error(response.data.message || "Failed to fetch assigned routes.");
    }
  } catch (error) {
    console.error("Error fetching assigned routes:", error);
    throw error;
  }
};





// Fetch users by selected routes
export const getUniqueRoutes = async (routes) => {
  try {
    const response = await api.post("/get-unique-routes", { routes });
    return response.data;
  } catch (error) {
    console.error("Error fetching users by routes:", error);
    throw error;
  }
};

// Assign users to selected admin
export const assignUsersToAdmin = async (adminId, users) => {
  try {
    const response = await api.post("/assign-users-to-admin", { adminId, users });
    return response.data;
  } catch (error) {
    console.error("Error assigning users to admin:", error);
    throw error;
  }
};




export const getAssignedUsers = async (adminId) => {
  try {
    const response = await api.get(`/assigned-users/${adminId}`);
    return response.data; // return the response data
  } catch (error) {
    console.error("Error fetching assigned users:", error);
    throw new Error("Failed to fetch assigned users");
  }
};


export const updateOrderStatus = async (id, approve_status) => {
  try {
    console.log('API Call - updateOrderStatus:', { id, approve_status });
    const payload = { id: id, approve_status: approve_status };
    console.log('API Payload:', payload);
    const response = await api.post("/update-order-status", payload);
    console.log('API Response - updateOrderStatus:', response);
    return response; // Return full response to check status code
  } catch (error) {
    console.error("Error updating order status:", error.response?.data || error.message);
    throw error;
  }
};


export const getAdminOrders = async (adminId, date = null) => {
  try {
    const url = `/get-admin-orders/${adminId}${date ? `?date=${date}` : ''}`;
    console.log("[DEBUG] Fetching admin orders from:", url);
    const response = await api.get(url);
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to fetch admin orders");
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    throw new Error(error.message || "Failed to fetch admin orders");
  }
};


export const getOrderProducts = async (orderId) => {
  try {
    console.log('API Call - getOrderProducts:', { orderId });
    const response = await fetch(`http://82.112.226.135:8090/order-products?orderId=${orderId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response Data:', data);
    return data;
  } catch (error) {
    console.error("Error fetching order products:", error);
    throw new Error("Failed to fetch order products");
  }
};


export const fetchMostRecentOrderApi = async (customerId, orderType) => {
  try {
    const response = await api.get(`/most-recent-order`, {
      params: {
        customerId: customerId,
        orderType: orderType, // This will be automatically added if orderType is provided
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching most recent order:", error);
    throw new Error("Failed to fetch most recent order");
  }
};

// API to fetch the most recent order for a specific customer and order type
export const getMostRecentOrder = async (customerId, orderType) => {
  try {
    const response = await api.get(`/most-recent-order`, {
      params: {
        customerId,
        orderType
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching most recent order:", error);
    throw error;
  }
};


export const placeAdminOrder = async (customerId, orderType, referenceOrderId) => {
  try {
    const response = await api.post(`/on-behalf`, {
      customer_id: customerId,
      order_type: orderType,
      reference_order_id: referenceOrderId,
    });
    return response.data;
  } catch (error) {
    console.error(`Error placing ${orderType} order for customer ${customerId}:`, error);
    throw new Error(`Failed to place ${orderType} order for customer ${customerId}`);
  }
};


export const getAllOrders = async () => {
  const response = await api.get(
    `/get-all-orders`
  );
  return response.data.data;
};


export const updateOrderPrice = async (orderId, productId, newPrice) => {
  try {
    const response = await api.put(`/update_order_price/${orderId}/product/${productId}`, { newPrice });
    return response;
  } catch (error) {
    console.error('Error updating order price:', error);
    throw error;
  }
};


export const updateCustomerPrice = async (customerId, productId, customerPrice) => {
  try {
    const response = await api.post('/customer_price_update', {
      customer_id: customerId,
      product_id: productId,
      customer_price: customerPrice,
    });
    return response;
  } catch (error) {
    console.error('Error updating/adding customer price:', error);
    throw error;
  }
};


export const globalPriceUpdate = async (productId, newDiscountPrice) => {
  try {
    const response = await api.post("/global-price-update", {
      product_id: productId,
      new_discount_price: parseFloat(newDiscountPrice), // Ensure it’s a number
    });
    return response;
  } catch (error) {
    console.error("Error updating global prices:", error);
    throw error;
  }
};

export const getInvoices = async (startDate = '', endDate = '') => {
  try {
    console.log('Fetching invoices with params:', { startDate, endDate });
    const response = await api.get('/fetch-all-invoices', {
      params: {
        startDate,
        endDate,
      },
    });
    console.log('Raw API response:', response.data);
    
    // Backend returns { message: "...", data: [...] }
    return {
      success: true,
      data: response.data.data || [],
      message: response.data.message || 'Invoices fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch invoices';
    return {
      success: false,
      data: [],
      message: errorMessage,
    };
  }
};


export const fetchAllPaymentTransactions = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const url = `/fetch-all-payment-transactions${queryParams ? `?${queryParams}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching payment transactions:", error);
    throw error;
  }
};


export const fetchMostRecentOrdersBatchApi = async (customerIds, orderTypes) => {
  try {
      const response = await api.post('/most-recent-orders/batch', { customerIds, orderTypes });
      return response.data;
  } catch (error) {
      console.error('Error fetching batch recent orders:', error);
      throw error;
  }
};


export const getReceipts = async (startDate = '', endDate = '') => {
  try {
    const query = [];
    if (startDate) query.push(`start_date=${startDate}`);
    if (endDate) query.push(`end_date=${endDate}`);
    const url = `/fetch-all-receipts${query.length ? '?' + query.join('&') : ''}`;
    const response = await api.get(url);
    console.log("Full API Response:", response);
    console.log("response.data:", response.data);
    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error("Invalid response structure: response.data.data is not an array");
    }
    return response.data.data;
  } catch (error) {
    console.error("Error in getReceipts:", error);
    throw error;
  }
};

// Fetch orders with date range filtering for Order Acceptance page
export const getOrdersWithDateRange = async (fromDate = '', toDate = '') => {
  try {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    
    const response = await api.get('/get-all-orders', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching orders with date range:', error);
    throw error;
  }
};

// Fetch customer route by customer ID
export const getCustomerRoute = async (customerId) => {
  try {
    const response = await api.get('/fetch-routes', { 
      params: { customer_id: customerId } 
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching customer route:', error);
    throw error;
  }
};

export const getAllRoutes = async () => {
  try {
    const response = await api.get(`/all_routes`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all routes:', error);
    throw error;
  }
};

// Can Order API - Single customer update (wrapper for bulk API)
export const updateCanOrder = async (customerId, canOrderValue) => {
  try {
    const customer_updates = [{
      customer_id: customerId,
      can_order_value: canOrderValue
    }];
    
    const response = await api.post('/can_order', { customer_updates });
    
    // For single update, return simplified response
    if (response.data.success && response.data.data.successful_updates.length > 0) {
      return {
        success: true,
        message: `Customer ${customerId} updated successfully`
      };
    } else if (response.data.data.failed_updates.length > 0) {
      return {
        success: false,
        message: response.data.data.failed_updates[0].error
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating can_order status:', error);
    throw error;
  }
};

// Can Order API - Bulk update multiple customers
export const updateCanOrderBulk = async (customerUpdates) => {
  try {
    const response = await api.post('/can_order', { customer_updates: customerUpdates });
    return response.data;
  } catch (error) {
    console.error('Error bulk updating can_order status:', error);
    throw error;
  }
};



// Bulk reassign customers to different admins based on route changes
export const bulkReassignCustomersAdmin = async (assignments) => {
  try {
    console.log('Bulk reassign API call with assignments:', assignments);
    
    // Transform the assignments to match the expected API format
    const customer_assignments = assignments.map(assignment => ({
      customer_id: assignment.customer_id,
      new_route: assignment.new_route
    }));

    const response = await api.post('/bulk-reassign-customers-admin', {
      customer_assignments: customer_assignments
    });
    
    console.log('Bulk reassign API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in bulk reassign customers admin:', error);
    throw error;
  }
};


export const getBrandReport = async (fromDate, toDate, orderType, brand) => {
  try {
    const response = await api.get(`/brand_report`, {
      params: {
        from_date: fromDate,
        to_date: toDate,
        order_type: orderType,
        brand: brand
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching brand report:', error);
    throw error;
  }
};

export const getUniqueBrands = async () => {
  try {
    const response = await api.get(`/fetch_unique_brands`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unique brands:', error);
    throw error;
  }
};

// Route Masters CRUD API functions
export const getRoutes = async () => {
  try {
    const response = await api.get('/routes_crud');
    // Sort routes by ID in ascending order (1, 2, 3...)
    const sortedRoutes = response.data.sort((a, b) => a.id - b.id);
    return sortedRoutes;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

export const getRouteById = async (id) => {
  try {
    const response = await api.get(`/routes_crud/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw error;
  }
};

export const addRoute = async (routeData) => {
  try {
    const response = await api.post('/routes_crud', routeData);
    return response.data;
  } catch (error) {
    console.error('Error adding route:', error);
    throw error;
  }
};

export const updateRoute = async (id, routeData) => {
  try {
    const response = await api.put(`/routes_crud/${id}`, routeData);
    return response.data;
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
};

export const deleteRoute = async (id) => {
  try {
    const response = await api.delete(`/routes_crud/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
};

// Update order with products and total amount
export const updateOrder = async (orderId, products, totalAmount) => {
  try {
    const response = await api.post('/order_update', {
      orderId,
      products,
      totalAmount
    });
    return response.data;
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

// Delete order product by product ID
export const deleteOrderProduct = async (orderProductId) => {
  try {
    const response = await api.delete(`/delete_order_product/${orderProductId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting order product:', error);
    throw error;
  }
};

// Cancel order by order ID
export const cancelOrder = async (orderId) => {
  try {
    const response = await api.post(`/cancel_order/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};


// Post Invoice to API
export const postInvoiceToAPI = async (orderId, invoiceId, orderPlacedOn) => {
  try {
    const invoiceDate = Math.floor(Date.now() / 1000); // Current time in epoch seconds

    const response = await api.post('/invoice', {
      order_id: orderId,
      invoice_id: invoiceId,
      order_date: parseInt(orderPlacedOn),
      invoice_date: invoiceDate,
    });

    console.log("Invoice posted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error posting invoice to API:", error.response?.data || error.message);
    throw new Error("Failed to save invoice data to server.");
  }
};

// Cut Off Timing API functions
export const getCutOffTimings = async () => {
  try {
    const response = await api.get('/cut_off');
    return response.data;
  } catch (error) {
    console.error("Error fetching cut off timings:", error);
    throw error;
  }
};

export const updateCutOffTiming = async (name, from_time, to_time) => {
  try {
    const response = await api.put(`/cut_off/${name}`, { from_time, to_time });
    return response.data;
  } catch (error) {
    console.error("Error updating cut off timing:", error);
    throw error;
  }
};

// Customer Order History API function
export const getCustomerOrders = async (customerId, fromDate = null, toDate = null) => {
  try {
    let url = `/get-orders/${customerId}`;
    const params = {};
    
    console.log('API Call - getCustomerOrders:', { customerId, fromDate, toDate });
    
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    
    // Add query parameters if they exist
    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    console.log('API Request URL:', url);
    
    const response = await api.get(url);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    throw error;
  }
};

// Update auto order preferences for a customer (single update)
export const updateAutoOrderPreferences = async (customerId, autoAmOrder, autoPmOrder, autoEveOrder) => {
  try {
    const response = await api.post('/update-auto-order-preferences', {
      customer_id: customerId,
      auto_am_order: autoAmOrder,
      auto_pm_order: autoPmOrder,
      auto_eve_order: autoEveOrder
    });
    return response.data;
  } catch (error) {
    console.error('Error updating auto order preferences:', error);
    throw error;
  }
};

// Update auto order preferences for multiple customers (bulk update)
export const updateAutoOrderPreferencesBulk = async (bulkUpdates) => {
  try {
    const response = await api.post('/update-auto-order-preferences', {
      bulk_updates: bulkUpdates
    });
    return response.data;
  } catch (error) {
    console.error('Error bulk updating auto order preferences:', error);
    throw error;
  }
};

export const fetchCreditLimitData = async () => {
  try {
    const response = await api.get("/fetch_credit_data");
    return response.data;
  } catch (error) {
    console.error("Error fetching credit limit data:", error);
    throw error;
  }
};

export const increaseCreditLimit = async (customerId, amountToIncrease) => {
  try {
    const response = await api.post("/increase-credit-limit", {
      customerId,
      amountToIncrease
    });
    return response.data;
  } catch (error) {
    console.error("Error increasing credit limit:", error);
    throw error;
  }
};

export const decreaseCreditLimit = async (customerId, amountToDecrease) => {
  try {
    const response = await api.post("/decrease-credit-limit", {
      customerId,
      amountToDecrease
    });
    return response.data;
  } catch (error) {
    console.error("Error decreasing credit limit:", error);
    throw error;
  }
};

export const collectCash = async (customerId, cash, paymentType = 'regular') => {
  try {
    // Get the logged-in user ID from localStorage
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    const collectedBy = loggedInUser?.id || null;
    
    const response = await api.post("/collect_cash", {
      customerId,
      cash,
      paymentType,
      collectedBy
    });
    return response.data;
  } catch (error) {
    console.error("Error collecting cash:", error);
    throw error;
  }
};

export const updateAmountDue = async (customerId, amount, operation = 'add') => {
  try {
    // Handle both single customer_id/amount and arrays
    let payload = {};
    
    if (Array.isArray(customerId) && Array.isArray(amount)) {
      // Both are arrays - must have same length
      if (customerId.length !== amount.length) {
        throw new Error("Customer ID and amount arrays must have the same length");
      }
      
      console.log('Sending bulk update with arrays:', { customer_id: customerId, amount: amount });
      payload = {
        customer_id: customerId,
        amount: amount,
        operation: operation
      };
    } else if (Array.isArray(customerId) && !Array.isArray(amount)) {
      // Multiple customers, single amount
      console.log('Sending bulk update with single amount:', { customer_id: customerId, amount: amount });
      payload = {
        customer_id: customerId,
        amount: amount,
        operation: operation
      };
    } else if (!Array.isArray(customerId) && Array.isArray(amount)) {
      // Single customer, multiple amounts - not valid
      throw new Error("Cannot update a single customer with multiple amounts");
    } else {
      // Single customer, single amount
      console.log('Sending single update:', { customer_id: customerId, amount: amount });
      payload = {
        customer_id: customerId,
        amount: amount,
        operation: operation
      };
    }
    
    const response = await api.post("/update_amount_due", payload);
    console.log('API response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating amount due:", error);
    throw error;
  }
};

// Item Report API function
export const getItemReport = async (date = null, fromDate = null, toDate = null, route = null) => {
  try {
    const params = {};
    if (date) {
      params.date = date;
    }
    if (fromDate) {
      params.from_date = fromDate;
    }
    if (toDate) {
      params.to_date = toDate;
    }
    if (route) {
      params.route = route;
    }
    
    const response = await api.get('/item-report', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching item report:', error);
    throw error;
  }
};

// Fetch customer names by customer IDs
export const fetchCustomerNames = async (customerIds) => {
  try {
    const response = await api.get('/fetch-names', { 
      params: { customer_id: customerIds },
      paramsSerializer: {
        indexes: null // This ensures array params are sent correctly
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching customer names:', error);
    throw error;
  }
};

// Fetch cash payment details with route and admin information
export const getCashDetails = async (fromDate, toDate) => {
  try {
    const response = await api.get('/cash_details', {
      params: { from_date: fromDate, to_date: toDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching cash details:', error);
    throw error;
  }
};

// Main Wallet API functions
export const mainWalletAPI = {
  // Fetch all transactions
  fetchTransactions: async () => {
    try {
      const response = await api.get('/main_wallet');
      return response.data;
    } catch (error) {
      console.error('Error fetching main wallet transactions:', error);
      throw error;
    }
  },
  
  // Transfer amount to main wallet
  transfer: async (name, amount) => {
    try {
      const response = await api.post('/main_wallet', {
        action: 'transfer',
        name,
        amount
      });
      return response.data;
    } catch (error) {
      console.error('Error transferring to main wallet:', error);
      throw error;
    }
  }
};

// Check for unique delivery sequence numbers based on customer route
export const checkUniqueDeliverySequence = async (route, deliverySequence, customerId = null) => {
  try {
    const payload = { route, delivery_sequence: deliverySequence };
    if (customerId) {
      payload.customer_id = customerId;
    }
    
    const response = await api.post('/check-unique-delivery-sequence', payload);
    return response.data;
  } catch (error) {
    console.error('Error checking delivery sequence uniqueness:', error);
    throw error;
  }
};

// Fetch delivery sequence data for customers
export const fetchDeliverySequence = async (customerIds) => {
  try {
    const response = await api.get('/fetch-delivery-sequence', {
      params: { customer_id: customerIds },
      paramsSerializer: {
        indexes: null // This ensures array params are sent correctly
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching delivery sequence data:', error);
    throw error;
  }
};
