import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getAllOrders, getOrderProducts, updateOrderPrice, getProducts } from '../services/api';
import './OrderManagement.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [productsLoading, setProductsLoading] = useState({});
  const [orderProducts, setOrderProducts] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [editedPrices, setEditedPrices] = useState({});
  const [productsMaster, setProductsMaster] = useState([]);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await getAllOrders();
      const allOrders = response || [];
      const filteredOrders = allOrders.filter(order => {
        const orderDate = new Date(order.placed_on * 1000);
        const selectedDate = new Date(date);
        return (
          orderDate.getFullYear() === selectedDate.getFullYear() &&
          orderDate.getMonth() === selectedDate.getMonth() &&
          orderDate.getDate() === selectedDate.getDate()
        );
      });
      setOrders(filteredOrders);
    } catch (error) {
      toast.error('Failed to fetch orders. Please try again.');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
  }, [date]);

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
    const basePrice = price / (1 + (gstRate / 100));
    setEditedPrices(prev => ({ ...prev, [productId]: basePrice.toFixed(2) }));
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

  const handleSelectTierPrice = (productId, gstRate, totalPrice) => {
    const base = Number(totalPrice) / (1 + (Number(gstRate) / 100));
    setEditedPrices(prev => ({ ...prev, [productId]: base.toFixed(2) }));
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
      const finalPrice = basePrice * (1 + (gstRate / 100));

      const orderPriceResponse = await updateOrderPrice(orderId, productId, finalPrice);
      if (orderPriceResponse && orderPriceResponse.status === 200) {
        toast.success('Price updated successfully!');
        fetchOrderProducts(orderId);
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

  return (
    <div className="order-management-container">
      <div className="order-management-header">
        <h1>Order Management</h1>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Filter by Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="product-details-row">
                        <td colSpan="5">
                          {productsLoading[order.id] ? (
                            <div className="loading-products">Loading products...</div>
                          ) : (
                            <div className="products-container">
                              <h4>Order Products</h4>
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
                                        <td className="quantity-col">{product.quantity}</td>
                                        <td className="price-col">
                                          {editingProductId === product.product_id ? (
                                            <div className="edit-price-container">
                                              <div className="price-edit-compact">
                                                {/* Horizontal tier selection */}
                                                <div className="tier-selection-horizontal">
                                                  <div className="tier-buttons-row">
                                                    {getTierPricesForProduct(product.product_id).map(t => {
                                                      const currentTotal = parseFloat(editedPrices[product.product_id] || 0) * (1 + (product.gst_rate / 100));
                                                      const isActive = editedPrices[product.product_id] && Math.abs(Number(t.value) - currentTotal) < 0.01;
                                                      
                                                      return (
                                                        <button
                                                          key={t.key}
                                                          className={`tier-btn ${isActive ? 'active' : ''}`}
                                                          onClick={() => handleSelectTierPrice(product.product_id, product.gst_rate, Number(t.value))}
                                                          title={`${t.key}: ₹${t.value.toFixed(2)}`}
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
                                                        const currentTotal = parseFloat(editedPrices[product.product_id] || 0) * (1 + (product.gst_rate / 100));
                                                        const hasMatchingTier = getTierPricesForProduct(product.product_id).some(t => 
                                                          Math.abs(Number(t.value) - currentTotal) < 0.01
                                                        );
                                                        return hasMatchingTier;
                                                      })()}
                                                    />
                                                  </div>
                                                  
                                                  <div className="price-preview">
                                                    <span className="preview-item">GST: ₹{(parseFloat(editedPrices[product.product_id] || 0) * (product.gst_rate / 100)).toFixed(2)}</span>
                                                    <span className="preview-total">Total: ₹{(parseFloat(editedPrices[product.product_id] || 0) * (1 + (product.gst_rate / 100))).toFixed(2)}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div>Base: ₹{((product.price / (1 + (product.gst_rate / 100)))).toFixed(2)}</div>
                                              <div>GST ({product.gst_rate}%): ₹{(product.price - (product.price / (1 + (product.gst_rate / 100)))).toFixed(2)}</div>
                                              <div>Total: ₹{product.price?.toFixed(2)}</div>
                                            </>
                                          )}
                                        </td>
                                        <td className="gst-rate-col">{product.gst_rate}%</td>
                                        <td className="total-col">
                                          ₹{(product.price * product.quantity).toLocaleString()}
                                        </td>
                                        <td>
                                          {editingProductId === product.product_id ? (
                                            <button onClick={() => handleSavePrice(order.id, product.product_id)} className="save-button">
                                              Save
                                            </button>
                                          ) : (
                                            <button onClick={() => handleEditPrice(product.product_id, product.price, product.gst_rate)} className="edit-button">
                                              Edit
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="no-products">No products found for this order</div>
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
                  <td colSpan="5" className="no-orders">
                    No orders found for the selected date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;