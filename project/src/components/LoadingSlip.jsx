import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getOrdersWithDateRange, getCustomerRoute, getRoutes } from '../services/api';
import { 
  createLoadingSlipDataForRoute, 
  generateExcelReport, 
  groupOrdersByRoute, 
  updateLoadingSlipStatus,
  filterOrdersByRoutes 
} from '../utils/loadingSlipHelper';
import './LoadingSlip.css';

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

  // Filter orders by selected route(s)
  const getFilteredOrders = useCallback(() => {
    const routesToFilter = selectedRoutes.length > 0 ? selectedRoutes : (selectedRoute ? [selectedRoute] : []);
    return filterOrdersByRoutes(orders, routesToFilter, customerRoutes, routes);
  }, [orders, selectedRoute, selectedRoutes, customerRoutes, routes]);

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
          if (response.message === "Route fetched successfully") {
            routes[order.customer_id] = response.route;
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





  const handleGenerateLoadingSlip = async (downloadOnly = true) => {
    if (orders.length === 0) {
      toast.error("No orders available to generate loading slips.");
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
      
      toast.success(`Generating loading slips for ${ordersToProcess.length} selected orders.`);
    } else {
      // Filter out cancelled orders - only process non-cancelled orders
      ordersToProcess = orders.filter(order => order.cancelled !== 'Yes');
      
      if (ordersToProcess.length === 0) {
        toast.error("No eligible orders found. All orders are cancelled.");
        return;
      }

      if (ordersToProcess.length < orders.length) {
        const cancelledCount = orders.length - ordersToProcess.length;
        toast.success(`${cancelledCount} cancelled orders excluded from loading slip generation.`);
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
      
      toast.success(`Loading Slips generated for ${generatedSlips.length} route(s) and statuses updated.`);
      clearSelection(); // Clear selection after successful generation
    } catch (error) {
      console.error("Error generating loading slips:", error);
      toast.error("Failed to generate loading slips.");
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="loading-slip-container">
      <div className="loading-slip-header">
        <h1>Loading Slip Report</h1>
        <div className="filter-controls">
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
            <label>Route Filter:</label>
            <div className="route-filter-container">
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
                  <option value="" disabled>No routes available - Click Retry</option>
                ) : (
                  routes.map((route) => (
                    <option key={route.id} value={route.name}>
                      {route.name}
                    </option>
                  ))
                )}
              </select>
              {selectedRoute && (
                <button
                  onClick={() => {
                    setSelectedRoute('');
                    setSelectedRoutes([]);
                  }}
                  className="btn-clear-route"
                  title="Clear route filter"
                >
                  ✕
                </button>
              )}
              {routes.length === 0 && !routesLoading && (
                <button
                  onClick={fetchRoutes}
                  className="btn-retry-routes"
                  title="Retry loading routes"
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Retry
                </button>
              )}
            </div>
            {selectedRoutes.length > 0 && (
              <div style={{marginTop: '5px', fontSize: '12px', color: '#666'}}>
                Selected Routes: {selectedRoutes.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Selection Controls */}
      {orders.length > 0 && (
        <div className="bulk-selection-controls">
          <div className="selection-info">
            <span className="selection-count">
              {selectedOrders.size} of {getFilteredOrders().filter(order => order.cancelled !== 'Yes').length} eligible orders selected
              {selectedRoute && ` (Filtered by: ${selectedRoute})`}
            </span>
          </div>
          <div className="selection-actions">
            <button
              onClick={handleSelectAll}
              className="btn-select-all"
              disabled={loading || bulkUpdating}
            >
              {getFilteredOrders().filter(order => order.cancelled !== 'Yes').every(order => selectedOrders.has(order.id)) && getFilteredOrders().filter(order => order.cancelled !== 'Yes').length > 0 
                ? 'Deselect All' 
                : 'Select All Eligible'}
            </button>
            <button
              onClick={clearSelection}
              className="btn-clear-selection"
              disabled={loading || bulkUpdating || selectedOrders.size === 0}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="loading-slip-actions">
        <button
          onClick={() => handleGenerateLoadingSlip(true)}
          disabled={loading || generatingSlip || bulkUpdating || orders.length === 0 || getFilteredOrders().filter(order => order.cancelled !== 'Yes').length === 0}
          className="btn-generate-loading-slip"
          style={{marginRight: '10px'}}
        >
          {generatingSlip || bulkUpdating ? 'Generating...' : 
            selectedOrders.size > 0 
              ? `Download Loading Slip (${selectedOrders.size} selected)` 
              : `Download Loading Slip (${getFilteredOrders().filter(order => order.cancelled !== 'Yes').length} eligible)`}
        </button>
        <button
          onClick={() => handleGenerateLoadingSlip(false)}
          disabled={loading || generatingSlip || bulkUpdating || orders.length === 0 || getFilteredOrders().filter(order => order.cancelled !== 'Yes').length === 0}
          className="btn-generate-loading-slip"
          style={{background: '#17a2b8'}}
        >
          {generatingSlip || bulkUpdating ? 'Generating...' : 
            selectedOrders.size > 0 
              ? `View Loading Slip (${selectedOrders.size} selected)` 
              : `View Loading Slip (${getFilteredOrders().filter(order => order.cancelled !== 'Yes').length} eligible)`}
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading orders...</div>
      ) : (
        <div className="orders-summary">
          <h3>Orders Summary</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Orders:</span>
              <span className="stat-value">{orders.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Filtered Orders:</span>
              <span className="stat-value">{getFilteredOrders().length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Eligible Orders:</span>
              <span className="stat-value">{getFilteredOrders().filter(order => order.cancelled !== 'Yes').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cancelled Orders:</span>
              <span className="stat-value">{getFilteredOrders().filter(order => order.cancelled === 'Yes').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Date Range:</span>
              <span className="stat-value">{fromDate} to {toDate}</span>
            </div>
            {selectedRoute && (
              <div className="stat-item">
                <span className="stat-label">Route Filter:</span>
                <span className="stat-value">{selectedRoute}</span>
              </div>
            )}
            <div className="stat-item">
              <span className="stat-label">Routes Loaded:</span>
              <span className="stat-value">{routes.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Customer Routes:</span>
              <span className="stat-value">{Object.keys(customerRoutes).length}</span>
            </div>
            <div className="stat-item">
             
             
            </div>
          </div>
          
          {orders.length > 0 && (
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={getFilteredOrders().filter(order => order.cancelled !== 'Yes').every(order => selectedOrders.has(order.id)) && getFilteredOrders().filter(order => order.cancelled !== 'Yes').length > 0}
                        onChange={handleSelectAll}
                        className="select-all-checkbox"
                      />
                    </th>
                    <th>Order ID</th>
                    <th>Customer ID</th>
                    <th>Route</th>
                    <th>Amount</th>
                    <th>Order Type</th>
                    <th>Status</th>
                    <th>Cancelled</th>
                    <th>Loading Slip</th>
                    <th>Order Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredOrders().map((order) => (
                    <tr key={order.id} className={selectedOrders.has(order.id) ? 'selected-row' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          disabled={order.cancelled === 'Yes'}
                          className="order-checkbox"
                        />
                      </td>
                      <td>#{order.id}</td>
                      <td>{order.customer_id || 'N/A'}</td>
                      <td>{customerRoutes[order.customer_id] || 'Loading...'}</td>
                      <td>₹{order.total_amount?.toLocaleString() || '0'}</td>
                      <td>
                        <span className={`order-type-badge ${
                          order.order_type === 'AM' ? 'order-type-am' : 'order-type-pm'
                        }`}>
                          {order.order_type || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge accepted">
                          {order.approve_status || 'N/A'}
                        </span>
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
                        {order.placed_on ? new Date(order.placed_on * 1000).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
