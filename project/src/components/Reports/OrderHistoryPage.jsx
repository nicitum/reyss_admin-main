import React, { useState, useEffect, useRef } from 'react';
import { getUsers, getCustomerOrders, getOrderProducts } from '../../services/api';
import { Package, IndianRupee, Calendar, User, Search, Filter, ShoppingCart, Clock } from 'lucide-react';

const OrderHistoryPage = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderProducts, setOrderProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });

  // Refs for auto-scrolling
  const ordersSectionRef = useRef(null);
  const detailsSectionRef = useRef(null);

  // Fetch all customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        setCustomers(data);
      } catch (err) {
        setError('Failed to fetch customers');
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Handle customer selection
  const handleCustomerSelect = async (customer) => {
    setSelectedCustomer(customer);
    setSelectedOrder(null);
    setOrderProducts([]);
    setError('');
    
    try {
      setLoading(true);
      console.log('Fetching orders for customer:', customer.customer_id);
      console.log('Date range:', dateRange);
      
      const response = await getCustomerOrders(
        customer.customer_id, 
        dateRange.fromDate, 
        dateRange.toDate
      );
      
      console.log('Fetched orders response:', response);
      
      // Extract orders from the response
      const orders = response.orders || response.data || [];
      setCustomerOrders(orders);
      
      // Auto-scroll to orders section
      setTimeout(() => {
        ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError('Failed to fetch customer orders');
      console.error('Error fetching customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Refresh orders when date range changes
  const handleDateRefresh = async () => {
    if (selectedCustomer) {
      await handleCustomerSelect(selectedCustomer);
    }
  };

  // Handle order selection
  const handleOrderSelect = async (order) => {
    setSelectedOrder(order);
    setError('');
    
    try {
      setProductsLoading(true);
      console.log('Fetching products for order:', order.id);
      const response = await getOrderProducts(order.id);
      console.log('Fetched products:', response);
      // Extract products from the response (could be in data or directly in response)
      const products = response.data || response || [];
      setOrderProducts(products);
      
      // Auto-scroll to details section
      setTimeout(() => {
        detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError('Failed to fetch order products');
      console.error('Error fetching order products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  // Calculate GST amount
  const calculateGSTAmount = (basePrice, gstRate) => {
    const base = parseFloat(basePrice) || 0;
    return base * (gstRate / 100);
  };

  // Calculate final price with GST
  const calculateFinalPrice = (basePrice, gstRate) => {
    const base = parseFloat(basePrice) || 0;
    return base + (base * (gstRate / 100));
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      customer.customer_id.toLowerCase().includes(term)
    );
  });

  // Status colors matching OrderAcceptance theme
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
              <p className="text-gray-600">View and manage customer order history</p>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-2">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    name="fromDate"
                    value={dateRange.fromDate}
                    onChange={handleDateChange}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-2">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    name="toDate"
                    value={dateRange.toDate}
                    onChange={handleDateChange}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-2">Search Customers</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Customer name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleDateRefresh}
                  disabled={loading}
                  className="w-full bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Refresh Orders'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Main Content - Vertical Layout for Better UX */}
        <div className="space-y-6">
          {/* Customer Selection Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-orange-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Select Customer</h2>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading customers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.customer_id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                      selectedCustomer?.customer_id === customer.customer_id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    <p className="text-sm text-gray-600">{customer.customer_id}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Click to view orders
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders Section */}
          <div ref={ordersSectionRef}>
            {selectedCustomer && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <ShoppingCart className="h-5 w-5 text-orange-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedCustomer.name}'s Orders
                    </h2>
                  </div>
                  <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                    {customerOrders.length} orders
                  </span>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading orders...</p>
                  </div>
                ) : customerOrders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customerOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                          selectedOrder?.id === order.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                        onClick={() => handleOrderSelect(order)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(order.placed_on * 1000).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusStyle(order.approve_status)}`}>
                            {order.approve_status || 'Pending'}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-sm text-gray-600">{order.order_type}</span>
                          <span className="font-semibold text-gray-900">₹{order.total_amount?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-600">No orders found for this customer in the selected date range</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Details Section */}
          <div ref={detailsSectionRef}>
            {selectedOrder && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-orange-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      Order #{selectedOrder.id} Details
                    </h2>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusStyle(selectedOrder.approve_status)}`}>
                    {selectedOrder.approve_status || 'Pending'}
                  </span>
                </div>

                {/* Order Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-orange-50 rounded-xl p-4">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-orange-600 mr-2" />
                      <div>
                        <p className="text-sm text-orange-800">Customer</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.customer_id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-red-600 mr-2" />
                      <div>
                        <p className="text-sm text-red-800">Order Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedOrder.placed_on * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center">
                      <IndianRupee className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm text-green-800">Total Amount</p>
                        <p className="font-semibold text-gray-900">₹{selectedOrder.total_amount?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-purple-600 mr-2" />
                      <div>
                        <p className="text-sm text-purple-800">Order Type</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.order_type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                  
                  {productsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading order items...</p>
                    </div>
                  ) : orderProducts.length > 0 ? (
                    <div className="space-y-4">
                      {orderProducts.map((product, index) => {
                        // Calculate pricing details
                        const basePrice = parseFloat(product.price) || 0;
                        const gstRate = parseFloat(product.gst_rate) || 0;
                        const quantity = parseInt(product.quantity) || 0;
                        const gstAmount = calculateGSTAmount(basePrice, gstRate);
                        const finalPrice = calculateFinalPrice(basePrice, gstRate);
                        const total = finalPrice * quantity;
                        
                        return (
                          <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start">
                              <div className="bg-orange-100 p-3 rounded-lg mr-4">
                                <Package className="h-6 w-6 text-orange-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{product.name || product.product_name}</h4>
                                    <p className="text-sm text-gray-600">{product.category}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-gray-900">₹{total.toFixed(2)}</p>
                                    <p className="text-sm text-gray-600">{quantity} × ₹{finalPrice.toFixed(2)}</p>
                                  </div>
                                </div>
                                
                                <div className="mt-3 grid grid-cols-3 gap-3">
                                  <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-xs text-gray-500">Quantity</p>
                                    <p className="font-medium">{quantity}</p>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-xs text-gray-500">Price</p>
                                    <p className="font-medium">₹{basePrice.toFixed(2)}</p>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-xs text-gray-500">GST</p>
                                    <p className="font-medium">{gstRate}%</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-600">No items found for this order</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryPage;