import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchMostRecentOrderApi, placeAdminOrder, getUsers } from '../services/api';
import './AutoOrderPage.css';

const AutoOrderPage = () => {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState({});
  const [placingOrder, setPlacingOrder] = useState({});
  const [placementError, setPlacementError] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('all');
  
  // Hardcoded routes from 55 to 63
  const routes = ['all', '55', '56', '57', '58', '59', '60', '61', '62', '63'];

  useEffect(() => {
    const fetchData = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        // Fetch users
        const users = await getUsers();
        setAssignedUsers(users);
        setFilteredUsers(users);

        // Fetch all order statuses in parallel
        const customerIds = users.map(user => user.customer_id);
        const amPromises = customerIds.map(id => fetchMostRecentOrderApi(id, 'AM').catch(err => ({ error: err })));
        const pmPromises = customerIds.map(id => fetchMostRecentOrderApi(id, 'PM').catch(err => ({ error: err })));

        const [amResponses, pmResponses] = await Promise.all([
          Promise.all(amPromises),
          Promise.all(pmPromises),
        ]);

        // Process responses into orderStatuses
        const newOrderStatuses = {};
        customerIds.forEach((customerId, index) => {
          newOrderStatuses[customerId] = {
            am: amResponses[index].error ? null : (amResponses[index].order || null),
            pm: pmResponses[index].error ? null : (pmResponses[index].order || null),
          };
        });

        setOrderStatuses(newOrderStatuses);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch users or orders.');
        toast.error('Failed to fetch users or orders.');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRoute === 'all') {
      setFilteredUsers(assignedUsers);
    } else {
      const filtered = assignedUsers.filter(user => user.route === selectedRoute);
      setFilteredUsers(filtered);
    }
    // Reset selection when route changes
    setSelectedUsers([]);
    setSelectAll(false);
  }, [selectedRoute, assignedUsers]);

  const handleSelectAllCheckbox = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      const allUserIds = filteredUsers.map(user => user.customer_id);
      setSelectedUsers(allUserIds);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleCheckboxChange = (customerId) => {
    setSelectedUsers(prev =>
      prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
    );
  };

  const handleBulkPlaceOrder = async (orderType) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to place orders for.');
      return;
    }

    setPlacingOrder(prev => ({ ...prev, [orderType]: true }));
    setPlacementError(prev => ({ ...prev, [orderType]: null }));

    let bulkOrderSuccess = true;
    const orderPromises = selectedUsers.map(async (customerId) => {
      try {
        const recentOrder = await fetchMostRecentOrderApi(customerId, orderType);
        const referenceOrderId = recentOrder.order ? recentOrder.order.id : null;

        if (referenceOrderId) {
          await placeAdminOrder(customerId, orderType, referenceOrderId);
          const updatedAm = orderType === 'AM' ? (await fetchMostRecentOrderApi(customerId, 'AM')).order : orderStatuses[customerId].am;
          const updatedPm = orderType === 'PM' ? (await fetchMostRecentOrderApi(customerId, 'PM')).order : orderStatuses[customerId].pm;
          setOrderStatuses(prev => ({
            ...prev,
            [customerId]: { am: updatedAm || null, pm: updatedPm || null },
          }));
        } else {
          toast.error(`No recent ${orderType} order for Customer ID: ${customerId}`);
          bulkOrderSuccess = false;
        }
      } catch (err) {
        console.error(`Error placing ${orderType} order for ${customerId}:`, err);
        toast.error(`Failed to place ${orderType} order for ${customerId}`);
        bulkOrderSuccess = false;
      }
    });

    await Promise.all(orderPromises);

    setSelectedUsers([]);
    setSelectAll(false);
    setPlacingOrder(prev => ({ ...prev, [orderType]: false }));

    if (bulkOrderSuccess) {
      toast.success(`Successfully placed ${orderType} orders for selected users.`);
      setSuccessMessage(`Successfully placed ${orderType} orders for selected users.`);
    } else {
      setError(`Failed to place all ${orderType} orders. Check individual user statuses.`);
      toast.error(`Failed to place all ${orderType} orders.`);
    }
  };

  const getOrderStatusDisplay = (order) => {
    if (order && order.placed_on != null) {
      const date = new Date(order.placed_on * 1000);
      const placedDate = date.toLocaleDateString('en-GB');
      return `Placed on: ${placedDate}`;
    }
    return 'No Order Placed';
  };

  const getHasOrderTodayDisplay = (order, orderType) => {
    const today = new Date();
    const isSameDay = (date1, date2) =>
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();

    if (order && order.placed_on != null) {
      const orderDate = new Date(order.placed_on * 1000);
      if ((orderType === 'AM' || orderType === 'PM') && isSameDay(orderDate, today)) {
        return 'Yes';
      }
    }
    return 'No';
  };

  if (loadingUsers) {
    return <div>Loading users and orders...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="auto-order-page">
      <h2 className="page-title">Order Management Dashboard</h2>

      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="filter-container">
        <label htmlFor="route-filter">Filter by Route:</label>
        <select
          id="route-filter"
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
          className="route-filter-select"
        >
          {routes.map(route => (
            <option key={route} value={route}>
              {route === 'all' ? 'All Routes' : `Route ${route}`}
            </option>
          ))}
        </select>
      </div>

      <div className="actions-container">
        <div className="select-all-container">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={handleSelectAllCheckbox}
            disabled={filteredUsers.length === 0}
          />
          <label className="select-all-label">Select All</label>
        </div>
        <div className="bulk-actions-container">
          <button
            onClick={() => handleBulkPlaceOrder('AM')}
            disabled={selectedUsers.length === 0 || placingOrder['AM']}
            className={placingOrder['AM'] ? 'bulk-action-button loading' : 'bulk-action-button'}
          >
            Place AM Orders
          </button>
          <button
            onClick={() => handleBulkPlaceOrder('PM')}
            disabled={selectedUsers.length === 0 || placingOrder['PM']}
            className={placingOrder['PM'] ? 'bulk-action-button loading' : 'bulk-action-button'}
          >
            Place PM Orders
          </button>
        </div>
      </div>

      <div className="users-list">
        {filteredUsers.map(user => (
          <div key={user.customer_id} className="user-card">
            <div className="card-header">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.customer_id)}
                onChange={() => handleCheckboxChange(user.customer_id)}
              />
              <h3 className="customer-id">Customer ID: {user.customer_id}</h3>
              <h3 className="customer-id">Customer Route: {user.route}</h3>
              <h3 className="customer-id">AO: {user.auto_am_order}</h3>
              <h3 className="customer-id">AO: {user.auto_pm_order}</h3>
            </div>

            <div className="order-info">
              <div className="order-section">
                <h4 className="order-type">AM Order</h4>
                <p className="order-status">
                  {placementError[user.customer_id] || getOrderStatusDisplay(orderStatuses[user.customer_id]?.am)}
                </p>
                <p className={getHasOrderTodayDisplay(orderStatuses[user.customer_id]?.am, 'AM') === 'Yes' ? 'status success' : 'status error'}>
                  Today: {getHasOrderTodayDisplay(orderStatuses[user.customer_id]?.am, 'AM')}
                </p>
              </div>

              <div className="order-section">
                <h4 className="order-type">PM Order</h4>
                <p className="order-status">
                  {placementError[user.customer_id] || getOrderStatusDisplay(orderStatuses[user.customer_id]?.pm)}
                </p>
                <p className={getHasOrderTodayDisplay(orderStatuses[user.customer_id]?.pm, 'PM') === 'Yes' ? 'status success' : 'status error'}>
                  Today: {getHasOrderTodayDisplay(orderStatuses[user.customer_id]?.pm, 'PM')}
                </p>
              </div>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && !error && (
          <p className="empty-message">No users found for the selected route.</p>
        )}
      </div>
    </div>
  );
};

export default AutoOrderPage;