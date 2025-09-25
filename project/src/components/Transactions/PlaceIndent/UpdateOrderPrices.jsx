import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, Calendar, Package, ShoppingCart, IndianRupee, Edit3, Trash2, 
  Save, X, ChevronDown, ChevronUp, Clock, Filter, User
} from 'lucide-react';
import { 
  getOrderProducts, updateOrderPrice, getProducts, getOrdersWithDateRange, 
  updateOrder, deleteOrderProduct, cancelOrder 
} from '../../../services/api';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [productsLoading, setProductsLoading] = useState({});
  const [orderProducts, setOrderProducts] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [editedPrices, setEditedPrices] = useState({});
  const [editedQuantities, setEditedQuantities] = useState({});
  const [productsMaster, setProductsMaster] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // CORRECTED GST Calculation: API returns base price, not GST-inclusive price
  const calculateFinalPrice = (basePrice, gstRate) => {
    const base = parseFloat(basePrice) || 0;
    return base + (base * (gstRate / 100));
  };

  const calculateGSTAmount = (basePrice, gstRate) => {
    const base = parseFloat(basePrice) || 0;
    return base * (gstRate / 100);
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getOrdersWithDateRange(fromDate, toDate);
      setOrders(response?.data || []);
    } catch (error) {
      //toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const fetchProductsMaster = async () => {
    try {
      const data = await getProducts();
      setProductsMaster(Array.isArray(data?.data) ? data.data : data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrderProducts = async (orderId) => {
    try {
      setProductsLoading(prev => ({ ...prev, [orderId]: true }));
      const products = await getOrderProducts(orderId);
      setOrderProducts(prev => ({ ...prev, [orderId]: products }));
    } catch (error) {
      toast.error(`Failed to fetch products for order ${orderId}`);
    } finally {
      setProductsLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleOrderExpansion = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setEditingProductId(null);
    } else {
      setExpandedOrderId(orderId);
      setEditingProductId(null);
      if (!orderProducts[orderId]) {
        await fetchOrderProducts(orderId);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchProductsMaster();
  }, []);

  const statusColors = {
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    Accepted: { bg: 'bg-green-100', text: 'text-green-800' },
    Rejected: { bg: 'bg-red-100', text: 'text-red-800' },
    Shipped: { bg: 'bg-blue-100', text: 'text-blue-800' },
    Delivered: { bg: 'bg-purple-100', text: 'text-purple-800' }
  };

  const handleEditProduct = (productId, price, quantity) => {
    setEditingProductId(productId);
    // Keep current price as default, user can change if needed
    setEditedPrices(prev => ({ ...prev, [productId]: price.toFixed(2) }));
    setEditedQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const handleSaveProductChanges = async (orderId, productId) => {
    const currentEditedPrice = editedPrices[productId];
    const currentEditedQuantity = editedQuantities[productId];
    
    // Get current product details
    const productDetails = orderProducts[orderId]?.find(p => p.product_id === productId);
    if (!productDetails) {
      toast.error('Product details not found.');
      return;
    }

    // Use edited values or fall back to current values
    const finalPrice = currentEditedPrice ? parseFloat(currentEditedPrice) : parseFloat(productDetails.price);
    const finalQuantity = currentEditedQuantity !== undefined ? currentEditedQuantity : productDetails.quantity;
    
    if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
      toast.error('Please enter a valid price.');
      return;
    }

    if (!finalQuantity || finalQuantity < 0) {
      toast.error('Please enter a valid quantity.');
      return;
    }

    try {
      // Calculate final price with GST
      const finalPriceWithGST = calculateFinalPrice(finalPrice, productDetails.gst_rate);

      // Update the product price
      const priceResponse = await updateOrderPrice(orderId, productId, finalPriceWithGST);
      
      if (priceResponse?.status === 200 || priceResponse?.success) {
        // If quantity was also changed, update the entire order
        if (currentEditedQuantity !== undefined && currentEditedQuantity !== productDetails.quantity) {
          const updatedProducts = orderProducts[orderId].map(product => {
            if (product.product_id === productId) {
              return {
                ...product,
                price: finalPriceWithGST,
                quantity: finalQuantity
              };
            }
            return product;
          });

          // Calculate new total amount
          const totalAmount = updatedProducts.reduce((sum, product) => {
            return sum + (parseFloat(product.price) * product.quantity);
          }, 0);

          // Update the entire order
          const orderResponse = await updateOrder(orderId, updatedProducts, totalAmount);
          
          if (orderResponse?.success) {
            toast.success('Product updated successfully!');
          } else {
            toast.error('Price updated but quantity update failed.');
          }
        } else {
          toast.success('Price updated successfully!');
        }
        
        // Immediately refresh the data to show updated changes
        await Promise.all([
          fetchOrderProducts(orderId),
          fetchOrders()
        ]);
        
        // Reset editing state
        setEditingProductId(null);
        setEditedPrices(prev => {
          const newState = { ...prev };
          delete newState[productId];
          return newState;
        });
        setEditedQuantities(prev => {
          const newState = { ...prev };
          delete newState[productId];
          return newState;
        });
      } else {
        toast.error('Failed to update product');
      }
    } catch (error) {
      toast.error('Failed to update product');
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteItem = async (orderId, productId, productName) => {
    if (!window.confirm(`Delete "${productName}"?`)) return;

    try {
      const response = await deleteOrderProduct(productId);
      if (response.success) {
        toast.success('Item deleted successfully!');
        await fetchOrderProducts(orderId);
        await fetchOrders();
        if (editingProductId === productId) {
          setEditingProductId(null);
        }
      }
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Cancel order #${orderId}?`)) return;

    try {
      const response = await cancelOrder(orderId);
      if (response.success) {
        toast.success('Order cancelled successfully!');
        await fetchOrders();
      }
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  // Remove separate quantity editing - now handled in handleEditProduct

  const handleQuantityChange = (e, productId) => {
    setEditedQuantities(prev => ({ ...prev, [productId]: parseInt(e.target.value) || 0 }));
  };

  const handleSaveOrderChanges = async (orderId) => {
    try {
      const currentProducts = orderProducts[orderId] || [];
      
      if (currentProducts.length === 0) {
        toast.error('Please add at least one item to the order before saving.');
        return;
      }

      const updatedProducts = [];
      let totalAmount = 0;

      for (const product of currentProducts) {
        const productId = product.product_id;
        const editedPrice = editedPrices[productId];
        const editedQuantity = editedQuantities[productId];

        let finalPrice = parseFloat(product.price) || 0;
        let finalQuantity = product.quantity;

        if (editedPrice !== undefined) {
          const basePrice = parseFloat(editedPrice);
          finalPrice = calculateFinalPrice(basePrice, product.gst_rate);
        }

        if (editedQuantity !== undefined) {
          finalQuantity = editedQuantity;
        }

        updatedProducts.push({
          order_id: orderId,
          product_id: productId,
          quantity: finalQuantity,
          price: finalPrice,
          gst_rate: product.gst_rate,
          name: product.name,
          category: product.category,
          is_new: false
        });

        totalAmount += finalPrice * finalQuantity;
      }

      const response = await updateOrder(orderId, updatedProducts, totalAmount);
      
      if (response.success) {
        toast.success(`Order updated successfully! ${updatedProducts.length} items saved.`);
        await fetchOrderProducts(orderId);
        await fetchOrders();
        setEditedPrices({});
        setEditedQuantities({});
        setEditingProductId(null);
      } else {
        toast.error(response.message || 'Failed to update order');
      }
    } catch (error) {
      toast.error('Failed to update order. Please try again.');
      console.error('Error updating order:', error);
    }
  };

  const getTierPricesForProduct = (productId) => {
    const p = productsMaster.find(pm => pm.id === productId || pm.product_id === productId);
    if (!p) return [];
    return [p.price_p1, p.price_p2, p.price_p3, p.price_p4, p.price_p5]
      .map((v, idx) => ({ key: `P${idx+1}`, value: v }))
      .filter(t => t.value && !isNaN(Number(t.value)))
      .map(t => ({ key: t.key, value: Number(t.value) }));
  };

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(query) ||
      order.customer_id.toLowerCase().includes(query) ||
      order.approve_status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management System</h1>
              <p className="text-gray-600 text-lg">Manage orders, update prices, and track inventory</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          {/* Professional Filters */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Filters & Search</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-2">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
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
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-2">Search Orders</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Order ID, Customer, Status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={fetchOrders}
                  disabled={loading}
                  className="w-full bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Refresh Orders'}
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-orange-400">
              <div className="text-sm text-orange-100">
                Showing <span className="font-semibold text-white">{filteredOrders.length}</span> of&nbsp;
                <span className="font-semibold text-white">{orders.length}</span> orders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading orders...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const isCancelled = order.cancelled === 'Yes';
                const statusStyle = statusColors[order.approve_status] || statusColors.Pending;

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
                                {new Date(order.placed_on * 1000).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })}
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
                            <div className="bg-green-100 rounded-full p-2">
                              <IndianRupee className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xl font-bold text-gray-900">₹{order.total_amount?.toLocaleString()}</p>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                            disabled={isCancelled}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isCancelled 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {isCancelled ? 'Cancelled' : 'Cancel Order'}
                          </button>

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

                    {/* Expanded Products */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        {productsLoading[order.id] ? (
                          <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading products...</p>
                          </div>
                        ) : (
                          <div className="p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                              Order Products ({orderProducts[order.id]?.length || 0} items)
                            </h4>



                            {orderProducts[order.id]?.length > 0 ? (
                              <div className="space-y-4">
                                {orderProducts[order.id].map((product) => {
                                  const isEditing = editingProductId === product.product_id;
                                  // CORRECTED: API price IS base price
                                  const basePrice = parseFloat(product.price) || 0;
                                  const gstAmount = calculateGSTAmount(basePrice, product.gst_rate);
                                  const finalPrice = calculateFinalPrice(basePrice, product.gst_rate);

                                  return (
                                    <div key={product.product_id} className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-start space-x-4">
                                            <div className="bg-blue-100 rounded-lg p-3">
                                              <Package className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                              <h5 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h5>
                                              <p className="text-sm text-gray-500 mb-4">{product.category}</p>
                                              
                                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Quantity */}
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                                  {isEditing && !isCancelled ? (
                                                    <div className="flex items-center space-x-2">
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={editedQuantities[product.product_id] !== undefined ? editedQuantities[product.product_id] : product.quantity}
                                                        onChange={(e) => handleQuantityChange(e, product.product_id)}
                                                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                      />
                                                      <span className="text-gray-500">units</span>
                                                    </div>
                                                  ) : (
                                                    <div 
                                                      className={`inline-flex items-center px-3 py-2 rounded-lg text-lg font-semibold cursor-pointer transition-colors ${
                                                        isCancelled ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                      }`}
                                                      onClick={() => !isCancelled && handleEditProduct(product.product_id, basePrice, product.quantity)}
                                                      title={isCancelled ? 'Cannot edit cancelled order' : 'Click to edit product'}
                                                    >
                                                      {editedQuantities[product.product_id] !== undefined ? editedQuantities[product.product_id] : product.quantity} units
                                                      {!isCancelled && <Edit3 className="h-4 w-4 ml-2" />}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Price Details */}
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Details</label>
                                                  {isEditing && !isCancelled ? (
                                                    <div className="space-y-3">
                                                      {/* Tier Prices */}
                                                      <div className="flex flex-wrap gap-2">
                                                        {getTierPricesForProduct(product.product_id).map(t => (
                                                          <button
                                                            key={t.key}
                                                            className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
                                                            onClick={() => setEditedPrices(prev => ({ ...prev, [product.product_id]: t.value.toFixed(2) }))}
                                                          >
                                                            {t.key}: ₹{t.value.toFixed(2)}
                                                          </button>
                                                        ))}
                                                      </div>
                                                      
                                                      {/* Price Input */}
                                                      <div>
                                                        <input
                                                          type="number"
                                                          step="0.01"
                                                          value={editedPrices[product.product_id] || ''}
                                                          onChange={(e) => setEditedPrices(prev => ({ ...prev, [product.product_id]: e.target.value }))}
                                                          placeholder="Base Price"
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <div className="mt-2 text-sm text-gray-600">
                                                          <div>GST ({product.gst_rate}%): ₹{calculateGSTAmount(editedPrices[product.product_id] || 0, product.gst_rate).toFixed(2)}</div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-1 text-sm">
                                                      <div>Base: ₹{basePrice.toFixed(2)}</div>
                                                      <div>GST ({product.gst_rate}%): ₹{gstAmount.toFixed(2)}</div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Right Corner: Final Price and Actions */}
                                        <div className="flex flex-col items-end space-y-4 ml-6">
                                          {/* Total and Final Price - Prominent Right Corner */}
                                          <div className="text-right">
                                            <div className="text-sm font-medium text-gray-600 mb-1">Total</div>
                                            <div className="text-2xl font-bold text-green-600 mb-3">
                                              ₹{(
                                                (isEditing && !isCancelled ? 
                                                  calculateFinalPrice(editedPrices[product.product_id] || basePrice, product.gst_rate) : 
                                                  finalPrice
                                                ) * 
                                                (isEditing && editedQuantities[product.product_id] !== undefined ? 
                                                  editedQuantities[product.product_id] : 
                                                  product.quantity
                                                )
                                              ).toLocaleString()}
                                            </div>
                                            <div className="text-sm font-medium text-gray-600 mb-1">Final Price</div>
                                            <div className="text-xl font-normal text-gray-800">
                                              {isEditing && !isCancelled ? (
                                                <span>₹{calculateFinalPrice(editedPrices[product.product_id] || basePrice, product.gst_rate).toFixed(2)}</span>
                                              ) : (
                                                <span>₹{finalPrice.toFixed(2)}</span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Actions */}
                                          <div className="flex items-center space-x-2">
                                            {isEditing && !isCancelled ? (
                                              <>
                                                <button
                                                  onClick={() => handleSaveProductChanges(order.id, product.product_id)}
                                                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                  <Save className="h-4 w-4 mr-1" />
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingProductId(null);
                                                    // Reset to original values
                                                    setEditedPrices(prev => {
                                                      const newState = { ...prev };
                                                      delete newState[product.product_id];
                                                      return newState;
                                                    });
                                                    setEditedQuantities(prev => {
                                                      const newState = { ...prev };
                                                      delete newState[product.product_id];
                                                      return newState;
                                                    });
                                                  }}
                                                  className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                                >
                                                  <X className="h-4 w-4 mr-1" />
                                                  Cancel
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={() => !isCancelled && handleEditProduct(product.product_id, basePrice, product.quantity)}
                                                  disabled={isCancelled}
                                                  className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${
                                                    isCancelled 
                                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                                  }`}
                                                >
                                                  <Edit3 className="h-4 w-4 mr-1" />
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => !isCancelled && handleDeleteItem(order.id, product.product_id, product.name)}
                                                  disabled={isCancelled}
                                                  className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${
                                                    isCancelled 
                                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                      : 'bg-red-600 text-white hover:bg-red-700'
                                                  }`}
                                                >
                                                  <Trash2 className="h-4 w-4 mr-1" />
                                                  Delete
                                                </button>
                                              </>
                                            )}
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
                                <p className="text-gray-500">No items in this order</p>
                              </div>
                            )}
                          </div>
                        )}
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
                  {searchTerm ? 'Try adjusting your search criteria' : 'No orders found for the selected date range'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;