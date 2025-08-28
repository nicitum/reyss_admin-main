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

  // Set default date range to today and auto-fetch orders
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    
    // Auto-fetch today's orders after setting default dates
    const autoFetchOrders = async () => {
      try {
        setLoading(true);
        const response = await getOrdersWithDateRange(today, today);
        
        if (response.status) {
          const ordersList = response.orders || [];
          setOrders(ordersList);
          
          // Fetch customer routes for the new orders
          await fetchCustomerRoutes(ordersList);
          
          if (ordersList.length === 0) {
            toast.info('No orders found for today');
          }
        } else {
          toast.error(response.message || 'Failed to fetch today\'s orders');
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
      
      if (response.status) {
        const ordersList = response.orders || [];
        setOrders(ordersList);
        
        // Fetch customer routes for the new orders
        await fetchCustomerRoutes(ordersList);
        
        if (ordersList.length === 0) {
          toast.info('No orders found for the selected date range');
        }
      } else {
        toast.error(response.message || 'Failed to fetch orders');
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

      {loading ? (
        <div className="loading-spinner">Fetching orders...</div>
      ) : (
        <div className="orders-table-container">
          {orders.length > 0 ? (
            <table className="orders-table">
              <thead>
                <tr>
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
                        {order.approve_status !== 'Accepted' && order.cancelled !== 'Yes' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Accepted')}
                            disabled={updatingStatus[order.id]}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            {updatingStatus[order.id] ? 'Updating...' : 'Accept'}
                          </button>
                        )}
                        {order.approve_status !== 'Rejected' && order.cancelled !== 'Yes' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Rejected')}
                            disabled={updatingStatus[order.id]}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            {updatingStatus[order.id] ? 'Updating...' : 'Reject'}
                          </button>
                        )}
                        {order.cancelled === 'Yes' && (
                          <span className="text-gray-500 text-sm italic">Order Cancelled</span>
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
