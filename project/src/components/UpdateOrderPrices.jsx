import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getOrderProducts, updateOrderPrice, getProducts, getOrdersWithDateRange, updateOrder, deleteOrderProduct, cancelOrder } from '../services/api';
import './OrderManagement.css';

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
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getOrdersWithDateRange(fromDate, toDate);
      const ordersData = response?.data || [];
      setOrders(ordersData);
    } catch (error) {
      toast.error('Failed to fetch orders. Please try again.');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const fetchProductsMaster = async () => {
    try {
      const data = await getProducts();
      const list = Array.isArray(data?.data) ? data.data : data;
      setProductsMaster(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching products master:', error);
    }
  };

  const fetchOrderProducts = async (orderId) => {
    try {
      setProductsLoading(prev => ({ ...prev, [orderId]: true }));
      const products = await getOrderProducts(orderId);
      setOrderProducts(prev => ({ ...prev, [orderId]: products }));
    } catch (error) {
      toast.error(`Failed to fetch products for order ${orderId}`);
      console.error('Error fetching order products:', error);
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

  // Auto-fetch today's orders when component gains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only auto-fetch if dates are set to today
      const today = new Date().toISOString().split('T')[0];
      if (fromDate === today && toDate === today) {
        fetchOrders();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchOrders, fromDate, toDate]);

  useEffect(() => {
    fetchProductsMaster();
  }, []);

  const statusColors = {
    Pending: 'orange',
    Accepted: 'green',
    Rejected: 'red',
    Shipped: 'blue',
    Delivered: 'purple'
  };

  const handleEditPrice = (productId, price, gstRate) => {
    setEditingProductId(productId);
    // The price parameter is already the final price (base + GST)
    // So we need to calculate the base price by removing GST
    const basePrice = price / (1 + (gstRate / 100));
    setEditedPrices(prev => ({ ...prev, [productId]: basePrice.toFixed(2) }));
  };

  const handleEditQuantity = (productId, currentQuantity) => {
    setEditingProductId(productId);
    setEditedQuantities(prev => ({ ...prev, [productId]: currentQuantity }));
  };

  const handleQuantityChange = (e, productId) => {
    setEditedQuantities(prev => ({ ...prev, [productId]: parseInt(e.target.value) || 0 }));
  };

  const updateOrderTotal = (orderId) => {
    const currentProducts = orderProducts[orderId] || [];
    let newTotal = 0;

    // Calculate new total based on current products and any edited quantities
    for (const product of currentProducts) {
      const productId = product.product_id;
      const editedQuantity = editedQuantities[productId];
      const editedPrice = editedPrices[productId];

      let finalPrice = product.price;
      let finalQuantity = product.quantity;

      // Use edited price if available
      if (editedPrice !== undefined) {
        const basePrice = parseFloat(editedPrice);
        finalPrice = basePrice + (basePrice * (product.gst_rate / 100));
      }

      // Use edited quantity if available
      if (editedQuantity !== undefined) {
        finalQuantity = editedQuantity;
      }

      newTotal += finalPrice * finalQuantity;
    }

    // Update the orders list with the new total
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, total_amount: newTotal }
        : order
    ));
  };

  const handleCancelOrder = async (orderId, customerId) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderId} for customer ${customerId}?`)) {
      return;
    }

    try {
      const response = await cancelOrder(orderId);
      
      if (response.success) {
        toast.success(`Order #${orderId} cancelled successfully!`);
        
        // Refresh the orders list to show updated status
        await fetchOrders();
      } else {
        toast.error(response.message || 'Failed to cancel order');
      }
    } catch (error) {
      toast.error('Failed to cancel order. Please try again.');
      console.error('Error cancelling order:', error);
    }
  };

  const handleAddProduct = (orderId) => {
    setSelectedOrderId(orderId);
    setShowAddProductModal(true);
    // Filter out products that are already in the order
    const currentOrderProducts = orderProducts[orderId] || [];
    const currentProductIds = currentOrderProducts.map(p => p.product_id);
    const available = productsMaster.filter(p => !currentProductIds.includes(p.id || p.product_id || p._id));
    setAvailableProducts(available);
  };

  const getTierPricesForProduct = (productId) => {
    const p = productsMaster.find(pm => pm.id === productId || pm.product_id === productId || pm._id === productId);
    if (!p) return [];
    const raw = [p.price_p1, p.price_p2, p.price_p3, p.price_p4, p.price_p5];
    return raw
      .map((v, idx) => ({ key: `P${idx+1}`, value: v }))
      .filter(t => t.value !== undefined && t.value !== null && t.value !== '' && !Number.isNaN(Number(t.value)))
      .map(t => ({ key: t.key, value: Number(t.value) }));
  };

  const handleSelectTierPrice = (productId, gstRate, tierPrice) => {
    // tierPrice is the BASE PRICE, not the final price
    // So we use it directly as the base price
    setEditedPrices(prev => ({ ...prev, [productId]: Number(tierPrice).toFixed(2) }));
  };

  const handlePriceChange = (e, productId) => {
    setEditedPrices(prev => ({ ...prev, [productId]: e.target.value }));
  };

  const handleSavePrice = async (orderId, productId) => {
    const currentEditedPrice = editedPrices[productId];
    if (!currentEditedPrice || isNaN(parseFloat(currentEditedPrice))) {
      toast.error('Please enter a valid price.');
      return;
    }

    try {
      const productDetails = orderProducts[orderId]?.find(p => p.product_id === productId);

      if (!productDetails?.gst_rate) {
        toast.error('GST rate not found for this product.');
        return;
      }

      const gstRate = productDetails.gst_rate;
      const basePrice = parseFloat(currentEditedPrice);
      // Final Price = Base Price + GST
      const finalPrice = basePrice + (basePrice * (gstRate / 100));

      const orderPriceResponse = await updateOrderPrice(orderId, productId, finalPrice);
      if (orderPriceResponse && orderPriceResponse.status === 200) {
        toast.success('Price updated successfully!');
        
        // Update the order total immediately
        updateOrderTotal(orderId);
        
        // Refresh order products immediately
        await fetchOrderProducts(orderId);
        
        // Refresh the orders list to show updated total amounts
        await fetchOrders();
        
        setEditingProductId(null);
        setEditedPrices(prev => {
          const newState = { ...prev };
          delete newState[productId];
          return newState;
        });
      } else {
        toast.error(`Failed to update price: ${orderPriceResponse?.data?.message || 'Something went wrong'}`);
      }
    } catch (error) {
      toast.error('Failed to update price. Please try again.');
      console.error('Error updating order price:', error);
    }
  };

  const handleDeleteItem = async (orderId, productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}" from this order?`)) {
      return;
    }

    try {
      // Call the delete API
      const response = await deleteOrderProduct(productId);
      
      if (response.success) {
        toast.success('Item deleted successfully!');
        
        // Update the order total immediately
        updateOrderTotal(orderId);
        
        // Refresh the order products immediately
        await fetchOrderProducts(orderId);
        
        // Refresh the orders list to show updated total amounts
        await fetchOrders();
        
        // Clear any edited values for this product
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
        
        // Exit edit mode if this product was being edited
        if (editingProductId === productId) {
          setEditingProductId(null);
        }
      } else {
        toast.error(response.message || 'Failed to delete item');
      }
    } catch (error) {
      toast.error('Failed to delete item. Please try again.');
      console.error('Error deleting item:', error);
    }
  };

  const handleSaveOrderChanges = async (orderId) => {
    try {
      const currentProducts = orderProducts[orderId] || [];
      
      // Check if there are any products left in the order
      if (currentProducts.length === 0) {
        toast.error('Please add at least one item to the order before saving.');
        return;
      }

      const updatedProducts = [];
      let totalAmount = 0;

      // Process only the products that are currently in the frontend state
      for (const product of currentProducts) {
        const productId = product.product_id;
        const editedPrice = editedPrices[productId];
        const editedQuantity = editedQuantities[productId];

        let finalPrice = product.price;
        let finalQuantity = product.quantity;

        if (editedPrice !== undefined) {
          const basePrice = parseFloat(editedPrice);
          // Final Price = Base Price + GST
          finalPrice = basePrice + (basePrice * (product.gst_rate / 100));
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

      // Call the order update API with only the current frontend items
      const response = await updateOrder(orderId, updatedProducts, totalAmount);
      
      if (response.success) {
        toast.success(`Order updated successfully! ${updatedProducts.length} items saved.`);
        
        // Refresh the order products immediately
        await fetchOrderProducts(orderId);
        
        // Refresh the orders list to show updated total amounts
        await fetchOrders();
        
        // Clear edited values
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

  return (
    <div className="order-management-container">
      <div className="order-management-header">
        <h1>Order Management</h1>
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
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading orders...</div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Order Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr
                      onClick={() => toggleOrderExpansion(order.id)}
                      className="order-row"
                    >
                      <td>#{order.id}</td>
                      <td>{order.customer_id}</td>
                      <td>₹{order.total_amount?.toLocaleString()}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: `${statusColors[order.approve_status]}20`,
                            color: statusColors[order.approve_status]
                          }}
                        >
                          {order.approve_status}
                        </span>
                      </td>
                      <td>
                        {new Date(order.placed_on * 1000).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        <button
                          onClick={() => handleCancelOrder(order.id, order.customer_id)}
                          className="btn-cancel-order"
                          disabled={order.cancelled === 'Yes'}
                          title={order.cancelled === 'Yes' ? 'Order already cancelled' : `Cancel order #${order.id}`}
                        >
                          {order.cancelled === 'Yes' ? 'Cancelled' : 'Cancel Order'}
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="product-details-row">
                        <td colSpan="6">
                          {productsLoading[order.id] ? (
                            <div className="loading-products">Loading products...</div>
                          ) : (
                            <div className="products-container">
                              <div className="products-header">
                                <h4>Order Products {order.cancelled === 'Yes' && <span className="cancelled-badge">(CANCELLED)</span>}</h4>
                                <div className="products-actions">
                                  <button 
                                    onClick={() => handleAddProduct(order.id)}
                                    className="btn-add-product"
                                    disabled={order.cancelled === 'Yes'}
                                    title={order.cancelled === 'Yes' ? 'Cannot add products to cancelled order' : 'Add Product'}
                                  >
                                    Add Product
                                  </button>
                                  <button 
                                    onClick={() => handleSaveOrderChanges(order.id)}
                                    className="btn-save-changes"
                                    disabled={order.cancelled === 'Yes' || !orderProducts[order.id] || orderProducts[order.id].length === 0}
                                    title={order.cancelled === 'Yes' ? 'Cannot save changes to cancelled order' : (!orderProducts[order.id] || orderProducts[order.id].length === 0 ? "Add at least one item to save" : `Save ${orderProducts[order.id]?.length || 0} items`)}
                                  >
                                    Save All Changes {orderProducts[order.id]?.length > 0 && `(${orderProducts[order.id].length} items)`}
                                  </button>
                                </div>
                              </div>
                              {orderProducts[order.id]?.length > 0 ? (
                                <table className="products-table-detail">
                                  <thead>
                                    <tr className="products-table-header-row">
                                      <th className="product-col">Product</th>
                                      <th className="category-col">Category</th>
                                      <th className="quantity-col">Quantity</th>
                                      <th className="price-col">Price</th>
                                      <th className="gst-rate-col">GST Rate</th>
                                      <th className="total-col">Total</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {orderProducts[order.id].map((product) => (
                                      <tr key={`${order.id}-${product.product_id}`} className="products-table-data-row">
                                        <td className="product-col">{product.name}</td>
                                        <td className="category-col">{product.category}</td>
                                        <td className="quantity-col">
                                          {editingProductId === product.product_id && order.cancelled !== 'Yes' ? (
                                            <div className="quantity-edit-container">
                                              <input
                                                type="number"
                                                min="0"
                                                value={editedQuantities[product.product_id] !== undefined ? editedQuantities[product.product_id] : product.quantity}
                                                onChange={(e) => handleQuantityChange(e, product.product_id)}
                                                className="quantity-input"
                                              />
                                              <div className="quantity-edit-buttons">
                                                <button 
                                                  className="btn-save-quantity"
                                                  onClick={() => {
                                                    setEditingProductId(null);
                                                    // Update the order total immediately when quantity is saved
                                                    updateOrderTotal(order.id);
                                                  }}
                                                >
                                                  ✓
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div 
                                              className={`quantity-display ${order.cancelled === 'Yes' ? 'disabled' : ''}`}
                                              onClick={() => order.cancelled !== 'Yes' && handleEditQuantity(product.product_id, product.quantity)}
                                              title={order.cancelled === 'Yes' ? 'Cannot edit cancelled order' : "Click to edit quantity"}
                                            >
                                              {product.quantity}
                                              {order.cancelled !== 'Yes' && <span className="edit-icon">✏️</span>}
                                            </div>
                                          )}
                                        </td>
                                        <td className="price-col">
                                          {editingProductId === product.product_id && order.cancelled !== 'Yes' ? (
                                            <div className="edit-price-container">
                                              <div className="price-edit-compact">
                                                {/* Horizontal tier selection */}
                                                <div className="tier-selection-horizontal">
                                                  <div className="tier-buttons-row">
                                                    {getTierPricesForProduct(product.product_id).map(t => {
                                                      const currentBase = parseFloat(editedPrices[product.product_id] || 0);
                                                      const isActive = editedPrices[product.product_id] && Math.abs(Number(t.value) - currentBase) < 0.01;
                                                      
                                                      return (
                                                        <button
                                                          key={t.key}
                                                          className={`tier-btn ${isActive ? 'active' : ''}`}
                                                          onClick={() => handleSelectTierPrice(product.product_id, product.gst_rate, Number(t.value))}
                                                          title={`${t.key}: Base ₹${t.value.toFixed(2)} (Final: ₹${(Number(t.value) + (Number(t.value) * (product.gst_rate / 100))).toFixed(2)})`}
                                                        >
                                                          <span className="tier-short">{t.key}</span>
                                                          <span className="tier-amount">₹{t.value.toFixed(2)}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </div>

                                                {/* Compact price input and summary */}
                                                <div className="price-input-compact">
                                                  <div className="input-row">
                                                    <label className="compact-label">Base:</label>
                                                <input
                                                  type="number"
                                                      step="0.01"
                                                      min="0"
                                                  value={editedPrices[product.product_id] || ''}
                                                  onChange={(e) => handlePriceChange(e, product.product_id)}
                                                      className="compact-input"
                                                      placeholder="0.00"
                                                      readOnly={(() => {
                                                        if (!editedPrices[product.product_id]) return true;
                                                        const currentBase = parseFloat(editedPrices[product.product_id] || 0);
                                                        const hasMatchingTier = getTierPricesForProduct(product.product_id).some(t => 
                                                          Math.abs(Number(t.value) - currentBase) < 0.01
                                                        );
                                                        return hasMatchingTier;
                                                      })()}
                                                />
                                              </div>
                                                  
                                                  <div className="price-preview">
                                                    <span className="preview-item">GST: ₹{(parseFloat(editedPrices[product.product_id] || 0) * (product.gst_rate / 100)).toFixed(2)}</span>
                                                    <span className="preview-total">Total: ₹{(parseFloat(editedPrices[product.product_id] || 0) + (parseFloat(editedPrices[product.product_id] || 0) * (product.gst_rate / 100))).toFixed(2)}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="price-display">
                                              <div>Base: ₹{((product.price / (1 + (product.gst_rate / 100)))).toFixed(2)}</div>
                                              <div>GST ({product.gst_rate}%): ₹{(product.price - (product.price / (1 + (product.gst_rate / 100)))).toFixed(2)}</div>
                                              <div>Total: ₹{product.price?.toFixed(2)}</div>
                                            </div>
                                          )}
                                        </td>
                                        <td className="gst-rate-col">{product.gst_rate}%</td>
                                        <td className="total-col">
                                          ₹{(product.price * product.quantity).toLocaleString()}
                                        </td>
                                        <td>
                                          {editingProductId === product.product_id && order.cancelled !== 'Yes' ? (
                                            <div className="action-buttons">
                                              <button onClick={() => handleSavePrice(order.id, product.product_id)} className="btn-save">
                                              Save
                                            </button>
                                              <button onClick={() => setEditingProductId(null)} className="btn-cancel">
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="action-buttons">
                                              <button 
                                                onClick={() => order.cancelled !== 'Yes' && handleEditPrice(product.product_id, product.price, product.gst_rate)} 
                                                className="btn-edit"
                                                disabled={order.cancelled === 'Yes'}
                                                title={order.cancelled === 'Yes' ? 'Cannot edit cancelled order' : `Edit ${product.name}`}
                                              >
                                              Edit
                                            </button>
                                              <button 
                                                onClick={() => order.cancelled !== 'Yes' && handleDeleteItem(order.id, product.product_id, product.name)} 
                                                className="btn-delete"
                                                disabled={order.cancelled === 'Yes'}
                                                title={order.cancelled === 'Yes' ? 'Cannot delete from cancelled order' : `Delete ${product.name}`}
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="no-products">
                                  <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>No items in this order</p>
                                    <p style={{ margin: '0', fontSize: '14px' }}>Click "Add Product" to add items to this order</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-orders">
                    No orders found for the selected date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Product to Order</h3>
            <div className="modal-body">
              <table className="modal-products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableProducts.map((product) => (
                    <AddProductRow 
                      key={product.id || product.product_id || product._id}
                      product={product}
                      orderId={selectedOrderId}
                      onClose={() => setShowAddProductModal(false)}
                      onProductAdded={() => {
                        setShowAddProductModal(false);
                        fetchOrderProducts(selectedOrderId);
                      }}
                      onOrdersRefresh={fetchOrders}
                      onDeleteItem={handleDeleteItem}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <button 
              onClick={() => setShowAddProductModal(false)}
              className="btn-close-modal"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add Product Row Component
const AddProductRow = ({ product, orderId, onClose, onProductAdded, onOrdersRefresh, onDeleteItem }) => {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const handleAddToOrder = async () => {
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setAdding(true);
      const productId = product.id || product.product_id || product._id;
      const basePrice = product.price_p1 || product.price || 0;
      const gstRate = product.gst_rate || 0;
      // Final Price = Base Price + GST
      const finalPrice = basePrice + (basePrice * (gstRate / 100));

      const newProduct = {
        order_id: orderId,
        product_id: productId,
        quantity: quantity,
        price: finalPrice,
        gst_rate: gstRate,
        name: product.name,
        category: product.category,
        is_new: true
      };

      const response = await updateOrder(orderId, [newProduct], 0);
      
      if (response.success) {
        toast.success('Product added successfully!');
        onProductAdded();
        // Refresh orders list to show updated total amounts
        if (onOrdersRefresh) {
          onOrdersRefresh();
        }
      } else {
        toast.error(response.message || 'Failed to add product');
      }
    } catch (error) {
      toast.error('Failed to add product. Please try again.');
      console.error('Error adding product:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <tr>
      <td>{product.name}</td>
      <td>{product.category}</td>
      <td>
        ₹{((product.price_p1 || product.price || 0) + ((product.price_p1 || product.price || 0) * ((product.gst_rate || 0) / 100))).toFixed(2)}
      </td>
      <td>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="modal-quantity-input"
        />
      </td>
      <td>
        <div className="action-buttons">
          <button
            onClick={handleAddToOrder}
            disabled={adding}
            className="btn-add-to-order"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </td>
    </tr>
  );
};

export default OrderManagement;