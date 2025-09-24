import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, Calendar, Package, ShoppingCart, IndianRupee, 
  ChevronDown, ChevronUp, Clock, Filter, User, MapPin,
  BarChart2, DollarSign, CheckCircle, XCircle, PauseCircle
} from 'lucide-react';
import { getOrdersWithDateRange, getCustomerRoute, getRoutes } from '../services/api';
import { filterOrdersByRoutes } from '../utils/deliverySlipHelper';

const OrderSummaryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [customerRoutes, setCustomerRoutes] = useState({});
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch routes
  const fetchRoutes = useCallback(async () => {
    try {
      setRoutesLoading(true);
      const routesData = await getRoutes();
      if (Array.isArray(routesData) && routesData.length > 0) {
        setRoutes(routesData);
      } else {
        setRoutes([]);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  // Fetch customer routes
  const fetchCustomerRoutes = async (ordersList) => {
    const routesData = {};
    for (const order of ordersList) {
      if (order.customer_id && !customerRoutes[order.customer_id]) {
        try {
          const response = await getCustomerRoute(order.customer_id);
          if (response.message === "User routes fetched successfully" && response.customers && response.customers.length > 0) {
            routesData[order.customer_id] = response.customers[0].route;
          } else {
            routesData[order.customer_id] = 'N/A';
          }
        } catch (error) {
          console.error(`Error fetching route for customer ${order.customer_id}:`, error);
          routesData[order.customer_id] = 'N/A';
        }
      }
    }
    setCustomerRoutes(prev => ({ ...prev, ...routesData }));
  };

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getOrdersWithDateRange(fromDate, toDate);
      const ordersData = response?.data || [];
      setOrders(ordersData);
      
      // Fetch customer routes for the new orders
      await fetchCustomerRoutes(ordersData);
    } catch (error) {
      toast.error('Failed to fetch orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  // Toggle order expansion
  const toggleOrderExpansion = (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  // Filter orders by route and order type
  const getFilteredOrders = useCallback(() => {
    let filteredOrders = [...orders];
    
    // Apply route filtering
    if (selectedRoute) {
      filteredOrders = filterOrdersByRoutes(orders, [selectedRoute], customerRoutes, routes);
    }
    
    // Apply order type filter
    if (orderTypeFilter === 'AM') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'AM');
    } else if (orderTypeFilter === 'PM + Evening') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'PM' || order.order_type === 'Evening');
    }
    
    // Apply search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.id.toString().includes(query) ||
        order.customer_id.toLowerCase().includes(query) ||
        (customerRoutes[order.customer_id] && customerRoutes[order.customer_id].toLowerCase().includes(query)) ||
        order.approve_status.toLowerCase().includes(query)
      );
    }
    
    return filteredOrders;
  }, [orders, selectedRoute, customerRoutes, routes, orderTypeFilter, searchTerm]);

  // Status colors
  const statusColors = {
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    Accepted: { bg: 'bg-green-100', text: 'text-green-800' },
    Rejected: { bg: 'bg-red-100', text: 'text-red-800' },
    Shipped: { bg: 'bg-blue-100', text: 'text-blue-800' },
    Delivered: { bg: 'bg-purple-100', text: 'text-purple-800' }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Format amount
  const formatAmount = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const filtered = getFilteredOrders();
    const totalOrders = filtered.length;
    const totalAmount = filtered.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
    const acceptedOrders = filtered.filter(order => order.approve_status === 'Accepted').length;
    const rejectedOrders = filtered.filter(order => order.approve_status === 'Rejected').length;
    const pendingOrders = filtered.filter(order => order.approve_status === 'Pending' || !order.approve_status).length;
    
    return {
      totalOrders,
      totalAmount,
      acceptedOrders,
      rejectedOrders,
      pendingOrders
    };
  };

  const summary = calculateSummary();

  // Initialize
  useEffect(() => {
    fetchOrders();
    fetchRoutes();
  }, [fetchOrders, fetchRoutes]);

  // Refresh when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchOrders();
    }
  }, [fromDate, toDate, fetchOrders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Summary</h1>
              <p className="text-gray-600 text-lg">View and analyze order statistics and summaries</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <BarChart2 className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          {/* Professional Filters */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
            <div className="flex items-center mb-3">
              <Filter className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Filters & Search</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Route Filter</label>
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  disabled={routesLoading}
                  className="w-full px-3 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
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
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Order Type</label>
                <select
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                >
                  <option value="All">All</option>
                  <option value="AM">AM</option>
                  <option value="PM + Evening">PM + Evening</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Search Orders</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Order ID, Customer, Status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-orange-400">
              <div className="text-sm text-orange-100">
                Showing <span className="font-semibold text-white">{getFilteredOrders().length}</span> of&nbsp;
                <span className="font-semibold text-white">{orders.length}</span> orders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(summary.totalAmount)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Accepted</p>
                <p className="text-2xl font-bold text-gray-900">{summary.acceptedOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-lg mr-4">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{summary.rejectedOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-lg mr-4">
                <PauseCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{summary.pendingOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading orders...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {getFilteredOrders().length > 0 ? (
              getFilteredOrders().map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const isCancelled = order.cancelled === 'Yes';
                const statusStyle = statusColors[order.approve_status] || statusColors.Pending;
                const customerRoute = customerRoutes[order.customer_id] || 'Loading...';

                return (
                  <div key={order.id} className="bg-white rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow">
                    {/* Order Header */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleOrderExpansion(order.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 rounded-full p-2">
                              <ShoppingCart className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                              <p className="text-sm text-gray-500">
                                {formatDate(order.placed_on)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="bg-gray-100 rounded-full p-2">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{order.customer_id}</p>
                              <p className="text-sm text-gray-500">Customer</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="bg-purple-100 rounded-full p-2">
                              <MapPin className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{customerRoute}</p>
                              <p className="text-sm text-gray-500">Route</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="bg-green-100 rounded-full p-2">
                              <IndianRupee className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xl font-bold text-gray-900">{formatAmount(order.total_amount)}</p>
                              <p className="text-sm text-gray-500">Total Amount</p>
                            </div>
                          </div>

                          <div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              <Clock className="w-4 h-4 mr-1" />
                              {order.approve_status}
                            </span>
                            {isCancelled && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                CANCELLED
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.order_type === 'AM' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {order.order_type || 'N/A'}
                            </span>
                          </div>

                          <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white rounded-xl p-4 shadow">
                            <h4 className="font-semibold text-gray-900 mb-2">Order Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Order ID:</span>
                                <span className="font-medium">#{order.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Placed On:</span>
                                <span className="font-medium">{formatDate(order.placed_on)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Order Type:</span>
                                <span className="font-medium">{order.order_type || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 shadow">
                            <h4 className="font-semibold text-gray-900 mb-2">Customer Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Customer ID:</span>
                                <span className="font-medium">{order.customer_id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Route:</span>
                                <span className="font-medium">{customerRoute}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Cancelled:</span>
                                <span className="font-medium">{order.cancelled || 'No'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 shadow">
                            <h4 className="font-semibold text-gray-900 mb-2">Status Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Approval Status:</span>
                                <span className={`font-medium px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                                  {order.approve_status || 'Pending'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Loading Slip:</span>
                                <span className="font-medium">{order.loading_slip || 'No'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Total Amount:</span>
                                <span className="font-medium text-green-600">{formatAmount(order.total_amount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria' : 'No orders found for the selected filters'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSummaryPage;