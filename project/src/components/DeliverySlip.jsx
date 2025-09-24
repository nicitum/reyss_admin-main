import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getOrdersWithDateRange, getCustomerRoute, getRoutes } from '../services/api';
import { 
  createDeliverySlipDataForRoute, 
  generateDeliveryExcelReport, 
  groupOrdersByRoute, 
  filterOrdersByRoutes 
} from '../utils/deliverySlipHelper';
import './DeliverySlip.css';

const DeliverySlip = () => {
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
  const [deliverySlipData, setDeliverySlipData] = useState(null);
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
    const eligibleOrders = filteredOrders.filter(order => order.cancelled !== 'Yes');
    const allEligibleSelected = eligibleOrders.every(order => selectedOrders.has(order.id));
    
    if (allEligibleSelected) {
      // Deselect all
      setSelectedOrders(new Set());
    } else {
      // Select all eligible orders
      const eligibleOrderIds = eligibleOrders.map(order => order.id);
      setSelectedOrders(new Set(eligibleOrderIds));
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
        toast.error('No routes found');
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to fetch routes: ' + error.message);
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
      toast.error('Failed to fetch orders. Please try again.');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchOrders();
    fetchRoutes();
  }, [fetchOrders, fetchRoutes]);

  const handleGenerateDeliverySlip = async (downloadOnly = true) => {
    if (orders.length === 0) {
      toast.error("No orders available to generate delivery slips.");
      return;
    }

    // Use selected orders if any are selected, otherwise use all eligible orders
    let ordersToProcess;
    if (selectedOrders.size > 0) {
      ordersToProcess = orders.filter(order => selectedOrders.has(order.id) && order.cancelled !== 'Yes');
      
      if (ordersToProcess.length === 0) {
        toast.error("No eligible selected orders found. Please select non-cancelled orders.");
        return;
      }
      
      toast.success(`Generating delivery slips for ${ordersToProcess.length} selected orders.`);
    } else {
      // Filter out cancelled orders - only process non-cancelled orders
      ordersToProcess = orders.filter(order => order.cancelled !== 'Yes');
      
      if (ordersToProcess.length === 0) {
        toast.error("No eligible orders found. All orders are cancelled.");
        return;
      }

      if (ordersToProcess.length < orders.length) {
        const cancelledCount = orders.length - ordersToProcess.length;
        toast.success(`${cancelledCount} cancelled orders excluded from delivery slip generation.`);
      }
    }

    try {
      setBulkUpdating(true);
      const routesMap = groupOrdersByRoute(ordersToProcess, customerRoutes);
      
      const generatedSlips = [];
      
      for (const [routeName, ordersForRoute] of routesMap.entries()) {
        const deliverySlipDataForRoute = await createDeliverySlipDataForRoute(ordersForRoute, routeName);
        const excelData = await generateDeliveryExcelReport(deliverySlipDataForRoute, 'Delivery Slip', routeName, downloadOnly);
        
        generatedSlips.push({
          routeName,
          orders: ordersForRoute,
          data: excelData
        });
      }
      
      // Store data for display if not downloading only
      if (!downloadOnly) {
        console.log('Generated delivery slips for display:', generatedSlips);
        setDeliverySlipData(generatedSlips);
        setShowDisplay(true);
      }
      
      toast.success(`Delivery Slips generated for ${generatedSlips.length} route(s).`);
      clearSelection(); // Clear selection after successful generation
    } catch (error) {
      console.error("Error generating delivery slips:", error);
      toast.error("Failed to generate delivery slips.");
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="loading-slip-container">
      <div className="loading-slip-header">
        <h1>Delivery Slip Report</h1>
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
                {getFilteredOrders().filter(order => order.cancelled !== 'Yes').every(order => selectedOrders.has(order.id)) && getFilteredOrders().filter(order => order.cancelled !== 'Yes').length > 0 
                  ? 'Deselect All' 
                  : 'Select All Eligible'}
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleGenerateDeliverySlip(true)}
                disabled={loading || generatingSlip || bulkUpdating || orders.length === 0 || getFilteredOrders().filter(order => order.cancelled !== 'Yes').length === 0}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {generatingSlip || bulkUpdating ? 'Generating...' : 
                  selectedOrders.size > 0 
                    ? `Download Selected (${selectedOrders.size})` 
                    : `Download All Eligible (${getFilteredOrders().filter(order => order.cancelled !== 'Yes').length})`}
              </button>
              <button
                onClick={() => handleGenerateDeliverySlip(false)}
                disabled={loading || generatingSlip || bulkUpdating || orders.length === 0 || getFilteredOrders().filter(order => order.cancelled !== 'Yes').length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {generatingSlip || bulkUpdating ? 'Generating...' : 
                  selectedOrders.size > 0 
                    ? `View Selected (${selectedOrders.size})` 
                    : `View All Eligible (${getFilteredOrders().filter(order => order.cancelled !== 'Yes').length})`}
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
                      checked={getFilteredOrders().filter(order => order.cancelled !== 'Yes').every(order => selectedOrders.has(order.id)) && getFilteredOrders().filter(order => order.cancelled !== 'Yes').length > 0}
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
                        disabled={order.cancelled === 'Yes'}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
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
            <p>Generating Delivery Slip...</p>
          </div>
        </div>
      )}

      {/* Delivery Slip Display Modal */}
      {showDisplay && deliverySlipData && (
        <div className="delivery-slip-display-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delivery Slip Data</h2>
              <button 
                onClick={() => setShowDisplay(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {deliverySlipData && deliverySlipData.length > 0 ? (
                deliverySlipData.map((slip, index) => (
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
                      <h4>Delivery Summary</h4>
                      {slip.data.deliveryData && slip.data.deliveryData.length > 0 ? (
                        <div className="delivery-table-container">
                          <table className="delivery-table">
                            <thead>
                              <tr>
                                <th>Items</th>
                                {slip.data.customerNames && slip.data.customerNames.map((name, idx) => (
                                  <th key={idx} className="horizontal-header">{name}</th>
                                ))}
                                <th>Total Crates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {slip.data.deliveryData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p>No delivery data found for this route.</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  <p>No delivery slip data available to display.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliverySlip;