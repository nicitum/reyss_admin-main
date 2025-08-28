import React, { useEffect, useMemo, useState } from "react";
import { getUsers, getProducts, placeOrder } from "../services/api";
import toast from "react-hot-toast";

export default function PlaceIndent() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [quantities, setQuantities] = useState({});
  const [orderType, setOrderType] = useState("AM");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [usersResp, productsResp] = await Promise.all([
          getUsers("")
            .then((data) => Array.isArray(data) ? data : [])
            .catch(() => []),
          getProducts()
            .then((data) => (Array.isArray(data?.data) ? data.data : data))
            .catch(() => []),
        ]);
        setCustomers(usersResp);
        setProducts(productsResp);
      } catch (e) {
        toast.error("Failed to load initial data");
      }
    };
    fetchInitial();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.username, c.customer_id, c.phone, c.route]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [customers, searchTerm]);

  const handleQuantityChange = (productId, value) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      setQuantities((prev) => ({ ...prev, [productId]: 0 }));
    } else {
      setQuantities((prev) => ({ ...prev, [productId]: parsed }));
    }
  };

  const cartItems = useMemo(() => {
    return products
      .map((p) => ({
        product_id: p.id ?? p.product_id ?? p._id,
        name: p.name,
        price: p.discount_price ?? p.price ?? p.effectivePrice ?? 0,
        quantity: Number(quantities[p.id ?? p.product_id ?? p._id] || 0),
      }))
      .filter((i) => i.product_id && i.quantity > 0 && i.price >= 0);
  }, [products, quantities]);

  const visibleProducts = useMemo(() => {
    const q = (productSearch || "").toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const submitOrder = async () => {
    if (!selectedCustomer) {
      toast.error("Select a customer first");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    if (!orderType) {
      toast.error("Select order type");
      return;
    }

    setIsPlacing(true);
    try {
      // Build payload similar to mobile PlaceOrder
      const payloadProducts = cartItems.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        price: i.price,
      }));
      const isoDate = new Date(orderDate).toISOString();

      // Always use the explicit customer_id from selected customer
      const selectedCustomerId = selectedCustomer.customer_id;
      await placeOrder(payloadProducts, orderType, isoDate, selectedCustomerId);
      toast.success("Order placed successfully");
      // reset cart
      setQuantities({});
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Failed to place order";
      toast.error(msg);
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Place Indent</h1>

      {/* Customers */}
      <div className="bg-white rounded-md shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Customers</h2>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        <div className="max-h-64 overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Username</th>
                <th className="text-left p-2">Customer ID</th>
                <th className="text-left p-2">Phone</th>
                <th className="text-left p-2">Route</th>
                <th className="text-left p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id} className={selectedCustomer?.id === c.id ? "bg-emerald-50" : ""}>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.username}</td>
                  <td className="p-2">{c.customer_id}</td>
                  <td className="p-2">{c.phone}</td>
                  <td className="p-2">{c.route}</td>
                  <td className="p-2">
                    <button
                      className={`px-3 py-1 rounded text-white ${selectedCustomer?.id === c.id ? "bg-emerald-600" : "bg-gray-700 hover:bg-gray-800"}`}
                      onClick={() => setSelectedCustomer(c)}
                    >
                      {selectedCustomer?.id === c.id ? "Selected" : "Select"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={6}>No customers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selectedCustomer && (
          <div className="mt-3 text-sm text-gray-700">
            <span className="font-medium">Selected:</span> {selectedCustomer.name} ({selectedCustomer.customer_id})
          </div>
        )}
      </div>

      {/* Order controls */}
      <div className="bg-white rounded-md shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Order Date</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <div className="flex items-end">
            <div className="text-lg font-semibold">Total: ₹{totalAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-md shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Products</h2>
          <input
            type="text"
            placeholder="Search products..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => {
                const pid = p.id ?? p.product_id ?? p._id;
                const price = p.discount_price ?? p.price ?? p.effectivePrice ?? 0;
                return (
                  <tr key={pid}>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{p.category}</td>
                    <td className="p-2">₹{Number(price).toFixed(2)}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        value={quantities[pid] ?? 0}
                        onChange={(e) => handleQuantityChange(pid, e.target.value)}
                        className="border rounded px-2 py-1 w-24"
                      />
                    </td>
                  </tr>
                );
              })}
              {visibleProducts.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={4}>No products</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Place Order moved to sticky footer */}
      </div>

      {/* Sticky footer action bar */}
      <div className="sticky bottom-0 bg-white border-t shadow px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-700">
          {selectedCustomer ? (
            <span>
              <span className="font-medium">Customer:</span> {selectedCustomer.name} ({selectedCustomer.customer_id})
            </span>
          ) : (
            <span className="text-gray-500">Select a customer to place order</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">Total: ₹{totalAmount.toFixed(2)}</div>
          <button
            disabled={!selectedCustomer || cartItems.length === 0 || isPlacing}
            onClick={submitOrder}
            className={`px-6 py-2 rounded text-white ${
              !selectedCustomer || cartItems.length === 0 || isPlacing
                ? "bg-gray-400"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isPlacing ? "Placing..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}


