import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getOrdersWithDateRange, updateOrderStatus, getCustomerRoute } from '../services/api';
import './OrderManagement.css';

const OrderAcceptance = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [customerRoutes, setCustomerRoutes] = useState({});
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Set default date range to today and auto-fetch orders
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    console.log('OrderAcceptance - Setting default dates:', { fromDate: today, toDate: today });
    
    // Auto-fetch today's orders after setting default dates
    const autoFetchOrders = async () => {
      try {
        setLoading(true);
        const response = await getOrdersWithDateRange(today, today);
        console.log('OrderAcceptance - API Response:', response);
        
        if (response.data) {
          const ordersList = response.data || [];
          console.log('OrderAcceptance - Orders List:', ordersList);
          setOrders(ordersList);
          
          // Fetch customer routes for the new orders
          await fetchCustomerRoutes(ordersList);
          
          if (ordersList.length === 0) {
            toast.info('No orders found for today');
          }
        } else {
          toast.error('Failed to fetch today\'s orders');
        }
      } catch (error) {
        toast.error('Failed to fetch today\'s orders. Please try again.');
        console.error('Error fetching today\'s orders:', error);
      } finally {
        setLoading(false);
      }
    };

    // Call the auto-fetch function
    autoFetchOrders();
  }, []); // Only run once on mount

  // Fetch customer routes for all orders
  const fetchCustomerRoutes = async (ordersList) => {
    const routes = {};
    for (const order of ordersList) {
      if (order.customer_id && !customerRoutes[order.customer_id]) {
        try {
          const response = await getCustomerRoute(order.customer_id);
          if (response.message === "Route fetched successfully") {
            routes[order.customer_id] = response.route;
          }
        } catch (error) {
          console.error(`Error fetching route for customer ${order.customer_id}:`, error);
          routes[order.customer_id] = 'N/A';
        }
      }
    }
    setCustomerRoutes(prev => ({ ...prev, ...routes }));
  };

  const fetchOrders = async () => {
    if (!fromDate && !toDate) {
      toast.error('Please select at least one date');
      return;
    }

    try {
      setLoading(true);
      const response = await getOrdersWithDateRange(fromDate, toDate);
      console.log('OrderAcceptance - Manual fetch response:', response);
      
      if (response.data) {
        const ordersList = response.data || [];
        console.log('OrderAcceptance - Manual fetch orders:', ordersList);
        setOrders(ordersList);
        
        // Fetch customer routes for the new orders
        await fetchCustomerRoutes(ordersList);
        
        if (ordersList.length === 0) {
          toast.info('No orders found for the selected date range');
        }
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (error) {
      toast.error('Failed to fetch orders. Please try again.');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const eligibleOrders = orders.filter(order => 
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
      <div className="order-management-header">
        <h1>Order Acceptance Management</h1>
        <div className="filter-controls">
          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="filter-group">
            <label>To Date:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition-colors"
          >
            {loading ? 'Fetching...' : 'Refresh Orders'}
          </button>
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
                {selectedOrders.size === orders.filter(order => 
                  order.approve_status !== 'Accepted' && 
                  order.approve_status !== 'Rejected' && 
                  order.cancelled !== 'Yes'
                ).length ? 'Deselect All' : 'Select All Eligible'}
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
                      checked={selectedOrders.size === orders.filter(order => 
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
                {orders.map((order) => (
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
              {fromDate || toDate ? 'No orders found for the selected date range' : 'Today\'s orders are automatically loaded. Change dates above to view different ranges.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderAcceptance;
