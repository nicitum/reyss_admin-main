import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getOrdersWithDateRange, updateOrderStatus, getCustomerRoute, getRoutes, cancelOrder } from '../../../services/api';
import { filterOrdersByRoutes } from '../../../utils/deliverySlipHelper';
import '../../CSS/OrderManagement.css';

const OrderAcceptance = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [customerRoutes, setCustomerRoutes] = useState({});
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState('All');

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

  // Filter orders by selected route(s) and order type
  const getFilteredOrders = useCallback(() => {
    // Start with all orders
    let filteredOrders = [...orders];
    
    // Apply route filtering only if a route is selected
    if (selectedRoute || (selectedRoutes && selectedRoutes.length > 0)) {
      const routesToFilter = selectedRoutes.length > 0 ? selectedRoutes : (selectedRoute ? [selectedRoute] : []);
      filteredOrders = filterOrdersByRoutes(orders, routesToFilter, customerRoutes, routes);
    }
    
    // Apply order type filter
    if (orderTypeFilter === 'AM') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'AM');
    } else if (orderTypeFilter === 'PM + Evening') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'PM' || order.order_type === 'Evening');
    }
    // If orderTypeFilter is 'All', no additional filtering is applied
    
    return filteredOrders;
  }, [orders, selectedRoute, selectedRoutes, customerRoutes, routes, orderTypeFilter]);

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
    if (!fromDate && !toDate) {
      toast.error('Please select at least one date');
      return;
    }

    try {
      setLoading(true);
      const response = await getOrdersWithDateRange(fromDate, toDate);
      
      if (response.data) {
        const ordersList = response.data || [];
        setOrders(ordersList);
        
        // Fetch customer routes for the new orders
        await fetchCustomerRoutes(ordersList);
        
      } else {
        toast.error('No orders found for the selected date range');
      }
    } catch (error) {
      //toast.error('Failed to fetch orders. Please try again.');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  // Set default date range to today and auto-fetch orders when dates change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    
    // Only fetch routes, not orders
    fetchRoutes();
  }, [fetchRoutes]);

  // Auto-fetch orders when date range changes
  useEffect(() => {
    if (fromDate && toDate) {
      fetchOrders();
    }
  }, [fromDate, toDate, fetchOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
      
      console.log('Frontend - Updating order status:', { id: orderId, approve_status: newStatus });
      
      const response = await updateOrderStatus(orderId, newStatus);
      
      console.log('Frontend - Response received:', response);
      
      if (response && response.status === 200) {
        toast.success(`Order ${orderId} ${newStatus.toLowerCase()} successfully!`);
        // Refresh the orders list
        await fetchOrders();
      } else {
        console.error('Unexpected response:', response);
        toast.error(response?.data?.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Frontend - Error updating order status:', error);
      toast.error('Failed to update order status. Please try again.');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Bulk operations functions
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
    const eligibleOrders = filteredOrders.filter(order => 
      order.approve_status !== 'Accepted' && 
      order.approve_status !== 'Rejected' && 
      order.cancelled !== 'Yes'
    );
    
    if (selectedOrders.size === eligibleOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(eligibleOrders.map(order => order.id)));
    }
  };

  const handleBulkAccept = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      setBulkUpdating(true);
      const promises = Array.from(selectedOrders).map(orderId => 
        updateOrderStatus(orderId, 'Accepted')
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      if (successful > 0) {
        toast.success(`${successful} order(s) accepted successfully!`);
        await fetchOrders();
        setSelectedOrders(new Set());
      }
      
      if (failed > 0) {
        toast.error(`${failed} order(s) failed to update`);
      }
    } catch (error) {
      console.error('Error in bulk accept:', error);
      toast.error('Failed to accept orders. Please try again.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      setBulkUpdating(true);
      const promises = Array.from(selectedOrders).map(orderId => 
        updateOrderStatus(orderId, 'Rejected')
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      if (successful > 0) {
        toast.success(`${successful} order(s) rejected successfully!`);
        await fetchOrders();
        setSelectedOrders(new Set());
      }
      
      if (failed > 0) {
        toast.error(`${failed} order(s) failed to update`);
      }
    } catch (error) {
      console.error('Error in bulk reject:', error);
      toast.error('Failed to reject orders. Please try again.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order to cancel');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to cancel ${selectedOrders.size} order(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setBulkUpdating(true);
      const orderIds = Array.from(selectedOrders);
      
      const response = await cancelOrder(orderIds);
      
      if (response.success) {
        toast.success(`Successfully cancelled ${response.cancelledOrders} order(s)!`);
        await fetchOrders();
        setSelectedOrders(new Set());
      } else {
        toast.error(response.message || 'Failed to cancel orders');
      }
    } catch (error) {
      console.error('Error cancelling orders:', error);
      toast.error('Failed to cancel orders. Please try again.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'orange',
      'Accepted': 'green',
      'Rejected': 'red'
    };
    return colors[status] || 'gray';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="order-management-container">
      <div className="loading-slip-header">
        <h1>Order Acceptance Management</h1>
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
                {selectedOrders.size === getFilteredOrders().filter(order => 
                  order.approve_status !== 'Accepted' && 
                  order.approve_status !== 'Rejected' && 
                  order.cancelled !== 'Yes'
                ).length && selectedOrders.size > 0 ? 'Deselect All' : 'Select All Eligible'}
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBulkAccept}
                disabled={bulkUpdating || selectedOrders.size === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {bulkUpdating ? 'Processing...' : `Accept Selected (${selectedOrders.size})`}
              </button>
              <button
                onClick={handleBulkReject}
                disabled={bulkUpdating || selectedOrders.size === 0}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {bulkUpdating ? 'Processing...' : `Reject Selected (${selectedOrders.size})`}
              </button>
              <button
                onClick={handleBulkCancel}
                disabled={bulkUpdating || selectedOrders.size === 0}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {bulkUpdating ? 'Processing...' : `Cancel Selected (${selectedOrders.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Fetching orders...</div>
      ) : (
        <div className="orders-table-container">
          {orders.length > 0 ? (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === getFilteredOrders().filter(order => 
                        order.approve_status !== 'Accepted' && 
                        order.approve_status !== 'Rejected' && 
                        order.cancelled !== 'Yes'
                      ).length && selectedOrders.size > 0}
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
                  <th>Actions</th>
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
                        disabled={order.approve_status === 'Accepted' || order.approve_status === 'Rejected' || order.cancelled === 'Yes'}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="font-semibold">#{order.id}</td>
                    <td>{order.customer_id || 'N/A'}</td>
                    <td>{customerRoutes[order.customer_id] || 'Loading...'}</td>
                    <td className="font-semibold text-green-600">
                      {formatAmount(order.total_amount)}
                    </td>
                    <td>
                      <span className={`order-type-badge ${
                        order.order_type === 'AM' ? 'order-type-am' : 'order-type-pm'
                      }`}>
                        {order.order_type || 'N/A'}
                      </span>
                    </td>
                    <td>{formatDate(order.placed_on)}</td>
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
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: `${getStatusColor(order.approve_status)}20`,
                          color: getStatusColor(order.approve_status)
                        }}
                      >
                        {order.approve_status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="order-acceptance-actions">
                        {order.cancelled === 'Yes' ? (
                          <span className="text-gray-500 text-sm italic font-medium">Order Cancelled</span>
                        ) : order.approve_status === 'Accepted' ? (
                          <span className="text-green-600 text-sm font-medium">Already Accepted</span>
                        ) : order.approve_status === 'Rejected' ? (
                          <span className="text-red-600 text-sm font-medium">Already Rejected</span>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'Accepted')}
                              disabled={updatingStatus[order.id]}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              {updatingStatus[order.id] ? 'Updating...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'Rejected')}
                              disabled={updatingStatus[order.id]}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              {updatingStatus[order.id] ? 'Updating...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-orders">
              {orders.length === 0 ? 'No orders found for the selected date range.' : 'No orders match the selected filters. Try changing the filters above.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderAcceptance;
