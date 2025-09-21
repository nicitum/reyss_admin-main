import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getUsers, updateCanOrder, updateCanOrderBulk, getRoutes } from '../services/api';
import './OrderManagement.css';
import './LoadingSlip.css';

const OrderControl = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUsers, setUpdatingUsers] = useState({});
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');

  // Fetch all users and routes on component mount
  useEffect(() => {
    fetchUsers();
    fetchRoutes();
  }, []);

  // Fetch routes
  const fetchRoutes = async () => {
    try {
      const routesData = await getRoutes();
      if (routesData && Array.isArray(routesData)) {
        setRoutes(routesData);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to fetch routes');
    }
  };

  // Filter users based on search term and selected route
  useEffect(() => {
    let filtered = users;
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.customer_id?.toString().includes(searchTerm) ||
        user.phone?.includes(searchTerm) ||
        user.route?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply route filter
    if (selectedRoute !== '') {
      filtered = filtered.filter(user => user.route === selectedRoute);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRoute]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      if (Array.isArray(response)) {
        setUsers(response);
      } else {
        toast.error('Failed to fetch users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCanOrderUpdate = async (customerId, newValue) => {
    try {
      setUpdatingUsers(prev => ({ ...prev, [customerId]: true }));
      
      // Send "Yes" or "No" to backend as requested
      const canOrderText = newValue === "Yes" ? "Yes" : "No";
      const response = await updateCanOrder(customerId, canOrderText);
      
      if (response.success) {
        toast.success(response.message || 'Can order status updated successfully!');
        
        // Update the local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.customer_id === customerId 
              ? { ...user, can_order: newValue }
              : user
          )
        );
      } else {
        toast.error(response.message || 'Failed to update can order status');
      }
    } catch (error) {
      console.error('Error updating can order status:', error);
      toast.error('Failed to update can order status. Please try again.');
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const getCanOrderColor = (canOrder) => {
    return canOrder === "Yes" ? '#10b981' : '#ef4444'; // Green for Yes, Red for No
  };

  const getCanOrderText = (canOrder) => {
    return canOrder === "Yes" ? 'Yes' : 'No';
  };

  // Bulk selection functions
  const handleSelectUser = (customerId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allSelected = filteredUsers.every(user => selectedUsers.has(user.customer_id));
    
    if (allSelected) {
      // Deselect all
      setSelectedUsers(new Set());
    } else {
      // Select all users
      const allUserIds = filteredUsers.map(user => user.customer_id);
      setSelectedUsers(new Set(allUserIds));
    }
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  // Bulk update functions
  const handleBulkCanOrderUpdate = async (newValue) => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    try {
      setBulkUpdating(true);
      
      // Prepare bulk update payload
      const customerUpdates = Array.from(selectedUsers).map(customerId => ({
        customer_id: customerId,
        can_order_value: newValue
      }));
      
      const response = await updateCanOrderBulk(customerUpdates);
      
      if (response.success) {
        const { successful, failed, total } = response.data.summary;
        
        if (successful > 0) {
          toast.success(`${successful} out of ${total} user(s) updated to "${newValue}" successfully!`);
          
          // Update the local state for successful updates only
          const successfulCustomerIds = response.data.successful_updates.map(update => update.customer_id);
          setUsers(prevUsers => 
            prevUsers.map(user => 
              successfulCustomerIds.includes(user.customer_id)
                ? { ...user, can_order: newValue }
                : user
            )
          );
          
          setSelectedUsers(new Set());
        }
        
        if (failed > 0) {
          toast.error(`${failed} user(s) failed to update`);
          // Log failed updates for debugging
          console.log('Failed updates:', response.data.failed_updates);
        }
      } else {
        toast.error(response.message || 'Failed to update users');
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error('Failed to update users. Please try again.');
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="loading-slip-container">
      <div className="loading-slip-header">
        <h1>Order Control Management</h1>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Search Users:</label>
            <input
              type="text"
              placeholder="Search by name, customer ID, phone, or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '300px' }}
            />
          </div>
          <div className="filter-group">
            <label>Filter by Route:</label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.name}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? 'Refreshing...' : 'Refresh Users'}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {filteredUsers.length > 0 && (
        <div className="bulk-actions-container mb-4 p-4 bg-gray-50 rounded-lg border" style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px', 
          border: '1px solid #e9ecef' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
                {selectedUsers.size} user(s) selected
              </span>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {filteredUsers.every(user => selectedUsers.has(user.customer_id)) ? 'Deselect All' : 'Select All'}
              </button>
              {selectedUsers.size > 0 && (
                <button
                  onClick={clearSelection}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>
            {selectedUsers.size > 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleBulkCanOrderUpdate('Yes')}
                  disabled={bulkUpdating}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                    opacity: bulkUpdating ? 0.6 : 1
                  }}
                >
                  {bulkUpdating ? 'Updating...' : 'Set to Yes'}
                </button>
                <button
                  onClick={() => handleBulkCanOrderUpdate('No')}
                  disabled={bulkUpdating}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                    opacity: bulkUpdating ? 0.6 : 1
                  }}
                >
                  {bulkUpdating ? 'Updating...' : 'Set to No'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b35' }}>
            {filteredUsers.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Total Users</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {filteredUsers.filter(user => user.can_order === "Yes").length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Can Order</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {filteredUsers.filter(user => user.can_order === "No").length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Cannot Order</div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="loading-spinner">
          <div style={{ fontSize: '18px', color: '#666' }}>Loading users...</div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="no-orders">
          <div style={{ fontSize: '18px', color: '#666' }}>
            {searchTerm ? 'No users found matching your search criteria' : 'No users found'}
          </div>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', color: 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)', width: '50px' }}>
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && filteredUsers.every(user => selectedUsers.has(user.customer_id))}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', color: 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Customer ID
                </th>
                <th style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', color: 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Name
                </th>
                <th style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', color: 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Route
                </th>
                <th style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', color: 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Can Order
                </th>
                <th style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', color: 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.customer_id} className="order-row">
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.customer_id)}
                      onChange={() => handleSelectUser(user.customer_id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ fontWeight: '600', color: '#2c3e50' }}>
                    {user.customer_id}
                  </td>
                  <td style={{ fontWeight: '500' }}>
                    {user.name || 'N/A'}
                  </td>
                  <td style={{ fontWeight: '500', color: '#2c3e50' }}>
                    {user.route || 'N/A'}
                  </td>
                  <td>
                    <span 
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: getCanOrderColor(user.can_order),
                        color: 'white',
                        display: 'inline-block',
                        minWidth: '50px',
                        textAlign: 'center'
                      }}
                    >
                      {getCanOrderText(user.can_order)}
                    </span>
                  </td>
                  <td>
                    <select
                      value={user.can_order}
                      onChange={(e) => handleCanOrderUpdate(user.customer_id, e.target.value)}
                      disabled={updatingUsers[user.customer_id]}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid #ff6b35',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        color: '#333',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: updatingUsers[user.customer_id] ? 'not-allowed' : 'pointer',
                        opacity: updatingUsers[user.customer_id] ? 0.6 : 1,
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f7931e';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#ff6b35';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {updatingUsers[user.customer_id] && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '12px', 
                        color: '#ff6b35',
                        fontWeight: '500'
                      }}>
                        Updating...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#856404'
      }}>
        <strong>Note:</strong> 
        <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li>Setting "Can Order" to <strong style={{ color: '#10b981' }}>Yes</strong> allows the customer to place orders</li>
          <li>Setting "Can Order" to <strong style={{ color: '#ef4444' }}>No</strong> prevents the customer from placing orders</li>
          <li>Changes are applied immediately and will affect the customer's next login session</li>
        </ul>
      </div>
    </div>
  );
};

export default OrderControl;