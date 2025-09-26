import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getOrdersWithDateRange, getCustomerRoute, getRoutes } from '../../services/api';
import { 
  createLoadingSlipDataForRoute, 
  generateExcelReport, 
  groupOrdersByRoute, 
  updateLoadingSlipStatus,
  filterOrdersByRoutes 
} from '../../utils/loadingSlipHelper';
import '../CSS/LoadingSlip.css';

const LoadingSlip = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderTypeFilter, setOrderTypeFilter] = useState('AM');
  const [generatingSlip, setGeneratingSlip] = useState(false);
  const [customerRoutes, setCustomerRoutes] = useState({});
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [loadingSlipData, setLoadingSlipData] = useState(null);
  const [showDisplay, setShowDisplay] = useState(false);

  // Filter orders by selected route(s) and order type
  const getFilteredOrders = useCallback(() => {
    const routesToFilter = selectedRoutes.length > 0 ? selectedRoutes : (selectedRoute ? [selectedRoute] : []);
    let filteredOrders = filterOrdersByRoutes(orders, routesToFilter, customerRoutes, routes);
    
    // Apply order type filter
    if (orderTypeFilter === 'AM') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'AM');
    } else if (orderTypeFilter === 'PM + Evening') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'PM' || order.order_type === 'Evening');
    }
    // If orderTypeFilter is 'All', no additional filtering is applied
    
    // Only show orders that are eligible for loading slip generation:
    // approve_status must be 'Accepted' and cancelled must be 'No'
    filteredOrders = filteredOrders.filter(order => 
      order.approve_status === 'Accepted' && 
      order.cancelled !== 'Yes'
    );
    
    return filteredOrders;
  }, [orders, selectedRoute, selectedRoutes, customerRoutes, routes, orderTypeFilter]);

  // Bulk selection functions
  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const filteredOrders = getFilteredOrders();
    const allSelected = filteredOrders.every(order => selectedOrders.has(order.id));
    
    if (allSelected) {
      // Deselect all
      setSelectedOrders(new Set());
    } else {
      // Select all eligible orders
      const orderIds = filteredOrders.map(order => order.id);
      setSelectedOrders(new Set(orderIds));
    }
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  // Fetch routes from routes_crud API
  const fetchRoutes = useCallback(async () => {
    try {
      setRoutesLoading(true);
      const routesData = await getRoutes();
      
      // Check if routesData is an array and has data
      if (Array.isArray(routesData) && routesData.length > 0) {
        setRoutes(routesData);
        console.log('Routes loaded successfully:', routesData.length, 'routes');
      } else {
        setRoutes([]);
        toast.error('No routes found', { duration: 2000 });
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to fetch routes: ' + error.message, { duration: 2000 });
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  // Fetch customer routes for all orders
  const fetchCustomerRoutes = async (ordersList) => {
    const routes = {};
    for (const order of ordersList) {
      if (order.customer_id && !customerRoutes[order.customer_id]) {
        try {
          const response = await getCustomerRoute(order.customer_id);
          if (response.message === "User routes fetched successfully" && response.customers && response.customers.length > 0) {
            routes[order.customer_id] = response.customers[0].route;
          } else {
            routes[order.customer_id] = 'N/A';
          }
        } catch (error) {
          console.error(`Error fetching route for customer ${order.customer_id}:`, error);
          routes[order.customer_id] = 'N/A';
        }
      }
    }
    setCustomerRoutes(prev => ({ ...prev, ...routes }));
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getOrdersWithDateRange(fromDate, toDate);
      const ordersData = response?.data || [];
      
      // Show all orders without filtering
      setOrders(ordersData);
      
      // Fetch customer routes for the new orders
      await fetchCustomerRoutes(ordersData);
    } catch (error) {
      //toast.error('Failed to fetch orders. Please try again.', { duration: 2000 });
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchOrders();
    fetchRoutes();
  }, [fetchOrders, fetchRoutes]);





  const handleGenerateLoadingSlip = async (downloadOnly = true) => {
    const filteredOrders = getFilteredOrders();
    
    if (filteredOrders.length === 0) {
      toast.error("No orders available to generate loading slips.", { duration: 2000 });
      return;
    }

    // Use selected orders if any are selected, otherwise use all eligible filtered orders
    let ordersToProcess;
    if (selectedOrders.size > 0) {
      ordersToProcess = filteredOrders.filter(order => selectedOrders.has(order.id));
      
      if (ordersToProcess.length === 0) {
        toast.error("No eligible selected orders found.", { duration: 2000 });
        return;
      }
      
      toast.success(`Generating loading slips for ${ordersToProcess.length} selected orders.`, { duration: 2000 });
    } else {
      // Use all eligible filtered orders
      ordersToProcess = filteredOrders;
      
      if (ordersToProcess.length === 0) {
        toast.error("No eligible orders found.", { duration: 2000 });
        return;
      }
    }

    try {
      setBulkUpdating(true);
      const routesMap = groupOrdersByRoute(ordersToProcess, customerRoutes);
      
      const generatedSlips = [];
      
      for (const [routeName, ordersForRoute] of routesMap.entries()) {
        const loadingSlipDataForRoute = await createLoadingSlipDataForRoute(ordersForRoute);
        const excelData = await generateExcelReport(loadingSlipDataForRoute, 'Loading Slip', routeName, downloadOnly);
        
        generatedSlips.push({
          routeName,
          orders: ordersForRoute,
          data: excelData
        });

        // Update loading slip status for each order in the route
        await updateLoadingSlipStatus(ordersForRoute);
      }
      
      // Store data for display if not downloading only
      if (!downloadOnly) {
        console.log('Generated slips for display:', generatedSlips);
        setLoadingSlipData(generatedSlips);
        setShowDisplay(true);
      }
      
      toast.success(`Loading Slips generated for ${generatedSlips.length} route(s) and statuses updated.`, { duration: 2000 });
      clearSelection(); // Clear selection after successful generation
    } catch (error) {
      console.error("Error generating loading slips:", error);
      toast.error("Failed to generate loading slips.", { duration: 2000 });
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="order-management-container">
      <div className="loading-slip-header">
        <h1>Loading Slip Report</h1>
        <div className="filter-controls">
          <div className="date-filters">
            <div className="filter-group">
              <label>From Date:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>To Date:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Order Type:</label>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="AM">AM</option>
                <option value="PM + Evening">PM + Evening</option>
              </select>
            </div>
          </div>
          <div className="route-filter-section">
            <div className="filter-group">
              <label>Route Filter:</label>
              <select
                value={selectedRoute}
                onChange={(e) => {
                  setSelectedRoute(e.target.value);
                  if (e.target.value) {
                    setSelectedRoutes([e.target.value]);
                  } else {
                    setSelectedRoutes([]);
                  }
                }}
                disabled={routesLoading}
              >
                <option value="">All Routes</option>
                {routesLoading ? (
                  <option value="" disabled>Loading routes...</option>
                ) : routes.length === 0 ? (
                  <option value="" disabled>No routes available</option>
                ) : (
                  routes.map((route) => (
                    <option key={route.id} value={route.name}>
                      {route.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
        <div className="filter-note">
          <p className="text-sm text-gray-600">
            Note: Only orders with <strong>Approve Status: Accepted</strong> and <strong>Cancelled: No</strong> are shown and eligible for loading slip generation.
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      {orders.length > 0 && (
        <div className="bulk-actions-container mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedOrders.size} order(s) selected
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {getFilteredOrders().every(order => selectedOrders.has(order.id)) && getFilteredOrders().length > 0 
                  ? 'Deselect All' 
                  : 'Select All Eligible'}
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleGenerateLoadingSlip(true)}
                disabled={loading || generatingSlip || bulkUpdating || orders.length === 0 || getFilteredOrders().length === 0}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {generatingSlip || bulkUpdating ? 'Generating...' : 
                  selectedOrders.size > 0 
                    ? `Download Selected (${selectedOrders.size})` 
                    : `Download All Eligible (${getFilteredOrders().length})`}
              </button>
              <button
                onClick={() => handleGenerateLoadingSlip(false)}
                disabled={loading || generatingSlip || bulkUpdating || orders.length === 0 || getFilteredOrders().length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {generatingSlip || bulkUpdating ? 'Generating...' : 
                  selectedOrders.size > 0 
                    ? `View Selected (${selectedOrders.size})` 
                    : `View All Eligible (${getFilteredOrders().length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading orders...</div>
      ) : (
        <div className="orders-table-container">
          {orders.length > 0 ? (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={getFilteredOrders().every(order => selectedOrders.has(order.id)) && getFilteredOrders().length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Customer ID</th>
                  <th>Customer Route</th>
                  <th>Total Amount</th>
                  <th>Order Type</th>
                  <th>Placed On</th>
                  <th>Cancelled</th>
                  <th>Loading Slip</th>
                  <th>Approve Status</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredOrders().map((order) => (
                  <tr key={order.id} className="order-row">
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="font-semibold">#{order.id}</td>
                    <td>{order.customer_id || 'N/A'}</td>
                    <td>{customerRoutes[order.customer_id] || 'Loading...'}</td>
                    <td className="font-semibold text-green-600">
                      ₹{order.total_amount?.toLocaleString() || '0'}
                    </td>
                    <td>
                      <span className={`order-type-badge ${
                        order.order_type === 'AM' ? 'order-type-am' : 'order-type-pm'
                      }`}>
                        {order.order_type || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {order.placed_on ? new Date(order.placed_on * 1000).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </td>
                    <td>
                      <span className={`status-indicator ${
                        order.cancelled === 'Yes' ? 'status-yes' : 'status-no'
                      }`}>
                        {order.cancelled || 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-indicator ${
                        order.loading_slip === 'Yes' ? 'status-loading' : 'status-no'
                      }`}>
                        {order.loading_slip || 'No'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge accepted">
                        {order.approve_status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-orders">
              {fromDate || toDate ? 'No orders found for the selected date range' : 'Select date range to view orders.'}
            </div>
          )}
        </div>
      )}

      {generatingSlip && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner-large"></div>
            <p>Generating Loading Slip...</p>
          </div>
        </div>
      )}

      {/* Loading Slip Display Modal */}
      {showDisplay && loadingSlipData && (
        <div className="loading-slip-display-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Loading Slip Data</h2>
              <button 
                onClick={() => setShowDisplay(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {loadingSlipData && loadingSlipData.length > 0 ? (
                loadingSlipData.map((slip, index) => (
                  <div key={index} className="slip-section">
                    <h3>Route: {slip.routeName}</h3>
                    <div className="slip-actions">
                      <button
                        onClick={() => {
                          const blob = new Blob([slip.data.wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = slip.data.filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                        className="btn-download"
                      >
                        Download {slip.routeName}
                      </button>
                    </div>
                    <div className="slip-data">
                      <h4>Products Summary</h4>
                      {slip.data.productList && slip.data.productList.length > 0 ? (
                        <table className="slip-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Quantity (Eaches)</th>
                              <th>Base Units (Kgs/Lts)</th>
                              <th>Crates</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slip.data.productList.map((product, pIndex) => (
                              <tr key={pIndex}>
                                <td>{product.name}</td>
                                <td>{product.quantity}</td>
                                <td>{product.baseUnitQuantity}</td>
                                <td>{product.crates}</td>
                              </tr>
                            ))}
                            <tr className="totals-row">
                              <td><strong>Totals</strong></td>
                              <td><strong>{slip.data.productList.reduce((sum, product) => sum + (parseFloat(product.quantity) || 0), 0).toFixed(2)}</strong></td>
                              <td><strong>{slip.data.productList.reduce((sum, product) => sum + (parseFloat(product.baseUnitQuantity) || 0), 0).toFixed(2)}</strong></td>
                              <td><strong>{slip.data.productList.reduce((sum, product) => sum + (parseFloat(product.crates) || 0), 0)}</strong></td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <p>No products found for this route.</p>
                      )}
                      {slip.data.brandTotals && slip.data.brandTotals.length > 0 && (
                        <>
                          <h4>Brand Totals</h4>
                          <table className="slip-table">
                            <thead>
                              <tr>
                                <th>Brand</th>
                                <th>Total Crates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {slip.data.brandTotals.map((brand, bIndex) => (
                                <tr key={bIndex}>
                                  <td>{brand.brand}</td>
                                  <td>{brand.totalCrates}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  <p>No loading slip data available to display.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSlip;
