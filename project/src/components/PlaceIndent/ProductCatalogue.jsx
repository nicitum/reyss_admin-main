import React, { useEffect, useMemo, useState } from "react";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Package, 
  IndianRupee,
  Calendar,
  Clock,
  Filter,
  Grid,
  List,
  ChevronLeft,
  User,
  MapPin,
  CheckCircle,
  X
} from "lucide-react";
import { getProducts, placeOrder } from "../../services/api";
import { toast } from 'react-hot-toast';

export default function ProductCatalogue({ selectedCustomer, onBack, onOrderPlaced }) {
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [quantities, setQuantities] = useState({});
  const [orderType, setOrderType] = useState("AM");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPlacing, setIsPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [showCart, setShowCart] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getProducts();
        const productData = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        
        // Check if there are reorder products in localStorage
        const reorderProducts = localStorage.getItem('reorderProducts');
        const reorderType = localStorage.getItem('reorderType');
        
        if (reorderProducts && reorderType) {
          console.log('Found reorder products in localStorage:', { reorderProducts, reorderType });
          
          // Parse and set the reorder products
          const parsedProducts = JSON.parse(reorderProducts);
          
          // Handle the case where parsedProducts is directly an array
          let productsToProcess = [];
          if (Array.isArray(parsedProducts)) {
            productsToProcess = parsedProducts;
          } else if (parsedProducts.data && Array.isArray(parsedProducts.data)) {
            productsToProcess = parsedProducts.data;
          } else if (typeof parsedProducts === 'object') {
            productsToProcess = [parsedProducts];
          }
          
          console.log('Processing products:', productsToProcess);
          
          // Create a map of existing product IDs for quick lookup
          // We need to check for both 'id' and 'product_id' fields
          const existingProductIds = new Set(productData.map(p => p.id ?? p.product_id ?? p._id));
          
          // Add any reorder products that aren't already in the product list
          const additionalProducts = [];
          const newQuantities = {};
          
          productsToProcess.forEach(product => {
            // Handle both 'id' and 'product_id' fields
            const productId = product.product_id || product.id || product.productId || product._id;
            if (productId) {
              // Set the quantity
              newQuantities[productId] = product.quantity || product.qty || 0;
              
              // If this product isn't in the existing product list, add it
              if (!existingProductIds.has(productId)) {
                // Create a product object that matches the format of the main product list
                additionalProducts.push({
                  id: productId, // Always use 'id' field for consistency with main product list
                  product_id: productId,
                  name: product.name || `Product ${productId}`,
                  category: product.category || 'Unknown',
                  price: product.price || 0,
                  discount_price: product.price || 0,
                  // Add other properties as needed
                });
              }
            }
          });
          
          console.log('Setting quantities:', newQuantities);
          console.log('Additional products to add:', additionalProducts);
          
          // Set the products (existing + additional) and quantities
          setProducts([...productData, ...additionalProducts]);
          setQuantities(newQuantities);
          setOrderType(reorderType);
          
          // Clear localStorage
          localStorage.removeItem('reorderProducts');
          localStorage.removeItem('reorderType');
          
          // Remove the toast notification
        } else {
          // No reorder products, just set the regular products
          setProducts(productData);
        }
      } catch (error) {
        console.error('Error in fetchProducts:', error);
        // Remove the error toast
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []); // Only run once on mount

  // Add useEffect to watch for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      // Check if there are reorder products in localStorage
      const reorderProducts = localStorage.getItem('reorderProducts');
      const reorderType = localStorage.getItem('reorderType');
      
      // If we have reorder data, process it
      if (reorderProducts && reorderType) {
        try {
          console.log('Detected reorder products in localStorage:', { reorderProducts, reorderType });
          
          // Parse and set the reorder products
          const parsedProducts = JSON.parse(reorderProducts);
          
          // Handle the case where parsedProducts is directly an array
          let productsToProcess = [];
          if (Array.isArray(parsedProducts)) {
            productsToProcess = parsedProducts;
          } else if (parsedProducts.data && Array.isArray(parsedProducts.data)) {
            productsToProcess = parsedProducts.data;
          } else if (typeof parsedProducts === 'object') {
            productsToProcess = [parsedProducts];
          }
          
          console.log('Processing products:', productsToProcess);
          
          // Create a map of existing product IDs for quick lookup
          // We need to check for both 'id' and 'product_id' fields
          const existingProductIds = new Set(products.map(p => p.id ?? p.product_id ?? p._id));
          
          // Add any reorder products that aren't already in the product list
          const additionalProducts = [];
          const newQuantities = {};
          
          productsToProcess.forEach(product => {
            // Handle both 'id' and 'product_id' fields
            const productId = product.product_id || product.id || product.productId || product._id;
            if (productId) {
              // Set the quantity
              newQuantities[productId] = product.quantity || product.qty || 0;
              
              // If this product isn't in the existing product list, add it
              if (!existingProductIds.has(productId)) {
                // Create a product object that matches the format of the main product list
                additionalProducts.push({
                  id: productId, // Always use 'id' field for consistency with main product list
                  product_id: productId,
                  name: product.name || `Product ${productId}`,
                  category: product.category || 'Unknown',
                  price: product.price || 0,
                  discount_price: product.price || 0,
                  // Add other properties as needed
                });
              }
            }
          });
          
          console.log('Setting quantities:', newQuantities);
          console.log('Additional products to add:', additionalProducts);
          
          // Set the products (existing + additional) and quantities
          setProducts(prevProducts => [...prevProducts, ...additionalProducts]);
          setQuantities(newQuantities);
          setOrderType(reorderType);
          
          // Clear localStorage
          localStorage.removeItem('reorderProducts');
          localStorage.removeItem('reorderType');
          
          // Remove the toast notification
        } catch (error) {
          console.error('Error processing reorder products from storage change:', error);
          // Remove the error toast as well
        }
      }
    };
    
    // Set up storage event listener
    window.addEventListener('storage', handleStorageChange);
    
    // Also check immediately in case data was set before component mounted
    handleStorageChange();
    
    // Clean up event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [products]); // Depend on products array

  const uniqueCategories = useMemo(() => {
    const categories = products
      .map(p => p.category)
      .filter(Boolean)
      .filter((category, index, arr) => arr.indexOf(category) === index);
    return categories.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (productSearch) {
      const query = productSearch.toLowerCase();
      filtered = filtered.filter((p) =>
        [p.name, p.category]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      );
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    return filtered;
  }, [products, productSearch, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handleQuantityChange = (productId, value) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      setQuantities((prev) => ({ ...prev, [productId]: 0 }));
    } else {
      setQuantities((prev) => ({ ...prev, [productId]: parsed }));
    }
  };

  const incrementQuantity = (productId) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const decrementQuantity = (productId) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1)
    }));
  };

  const cartItems = useMemo(() => {
    return products
      .map((p) => {
        // Use consistent ID field handling
        const productId = p.id ?? p.product_id ?? p._id;
        const quantity = Number(quantities[productId] || 0);
        return {
          product_id: productId,
          name: p.name,
          category: p.category,
          price: p.discount_price ?? p.price ?? p.effectivePrice ?? 0,
          quantity: quantity,
        };
      })
      .filter((i) => i.product_id && i.quantity > 0 && i.price >= 0);
  }, [products, quantities]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const submitOrder = async () => {
    if (!selectedCustomer) {
      toast.error("No customer selected");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Add at least one product to cart");
      return;
    }
    if (!orderType) {
      toast.error("Select order type");
      return;
    }

    setIsPlacing(true);
    try {
      const payloadProducts = cartItems.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        price: i.price,
      }));
      const isoDate = new Date(orderDate).toISOString();
      const selectedCustomerId = selectedCustomer.customer_id;

      await placeOrder(payloadProducts, orderType, isoDate, selectedCustomerId);
      
      // Show success toast message
      toast.success("Order placed successfully!");
      
      // Reset cart
      setQuantities({});
      setShowCart(false);
      onOrderPlaced && onOrderPlaced();
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Failed to place order";
      console.error(msg);
      toast.error(msg);
    } finally {
      setIsPlacing(false);
    }
  };

  const clearFilters = () => {
    setProductSearch("");
    setCategoryFilter("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading product catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  Product Catalogue
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span className="font-medium">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{selectedCustomer.route}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Cart Button */}
              <button
                onClick={() => setShowCart(true)}
                className="relative flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Cart</span>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2">
            <h2 className="text-white text-sm font-semibold flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Search & Filter
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by product name or category..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>
              </div>
              
              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-1.5 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* View Mode Toggle */}
              <div>
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center justify-center flex-1 py-1.5 px-3 transition-colors duration-200 text-sm ${
                      viewMode === "grid"
                        ? "bg-orange-500 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center justify-center flex-1 py-1.5 px-3 transition-colors duration-200 text-sm ${
                      viewMode === "list"
                        ? "bg-orange-500 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Results Summary */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Showing <span className="font-semibold">{paginatedProducts.length}</span> of{" "}
                <span className="font-semibold">{filteredProducts.length}</span> products
              </div>
              {(productSearch || categoryFilter) && (
                <button
                  onClick={clearFilters}
                  className="text-orange-600 hover:text-orange-800 text-xs font-medium transition-colors duration-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Products Display */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">Available Products</h2>
          </div>
          
          {paginatedProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
              <p className="text-gray-500 text-sm">
                {productSearch || categoryFilter
                  ? "Try adjusting your search criteria"
                  : "No products available at the moment"}
              </p>
            </div>
          ) : (
            <>
              <div className="p-4">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedProducts.map((product) => {
                      const pid = product.id ?? product.product_id ?? product._id;
                      const price = product.discount_price ?? product.price ?? product.effectivePrice ?? 0;
                      const currentQuantity = quantities[pid] || 0;
                      
                      return (
                        <div
                          key={pid}
                          className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-all duration-200 border border-gray-200"
                        >
                          <div className="flex flex-col h-full">
                            {/* Product Info */}
                            <div className="flex-1 mb-3">
                              <div className="bg-orange-100 rounded-lg p-2 mb-2 text-center">
                                <Package className="h-6 w-6 text-orange-600 mx-auto" />
                              </div>
                              
                              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                                {product.name}
                              </h3>
                              
                              {product.category && (
                                <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full mb-1">
                                  {product.category}
                                </span>
                              )}
                              
                              <div className="flex items-center text-orange-600 font-bold text-base">
                                <IndianRupee className="h-3 w-3 mr-1" />
                                {Number(price).toFixed(2)}
                              </div>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => decrementQuantity(pid)}
                                  className="flex items-center justify-center w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors duration-200"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                
                                <input
                                  type="number"
                                  min="0"
                                  value={currentQuantity}
                                  onChange={(e) => handleQuantityChange(pid, e.target.value)}
                                  className="w-12 text-center border border-gray-300 rounded-lg py-1 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                                
                                <button
                                  onClick={() => incrementQuantity(pid)}
                                  className="flex items-center justify-center w-7 h-7 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              
                              {currentQuantity > 0 && (
                                <div className="text-center text-xs text-orange-600 font-medium">
                                  Subtotal: ₹{(price * currentQuantity).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedProducts.map((product) => {
                      const pid = product.id ?? product.product_id ?? product._id;
                      const price = product.discount_price ?? product.price ?? product.effectivePrice ?? 0;
                      const currentQuantity = quantities[pid] || 0;
                      
                      return (
                        <div
                          key={pid}
                          className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all duration-200 border border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="bg-orange-100 rounded-lg p-2">
                                <Package className="h-5 w-5 text-orange-600" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-base mb-1">
                                  {product.name}
                                </h3>
                                
                                <div className="flex items-center space-x-3 text-xs text-gray-600">
                                  {product.category && (
                                    <span className="px-2 py-0.5 bg-gray-200 rounded-full">
                                      {product.category}
                                    </span>
                                  )}
                                  
                                  <div className="flex items-center text-orange-600 font-bold">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {Number(price).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-3">
                              {currentQuantity > 0 && (
                                <div className="text-orange-600 font-medium text-sm">
                                  Subtotal: ₹{(price * currentQuantity).toFixed(2)}
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => decrementQuantity(pid)}
                                  className="flex items-center justify-center w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors duration-200"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                
                                <input
                                  type="number"
                                  min="0"
                                  value={currentQuantity}
                                  onChange={(e) => handleQuantityChange(pid, e.target.value)}
                                  className="w-16 text-center border border-gray-300 rounded-lg py-1 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                />
                                
                                <button
                                  onClick={() => incrementQuantity(pid)}
                                  className="flex items-center justify-center w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors duration-200"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors duration-200 ${
                              currentPage === pageNum
                                ? "bg-orange-500 text-white"
                                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCart(false)} />
          
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Cart Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 flex items-center justify-between">
                <h2 className="text-white text-lg font-semibold flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Shopping Cart ({totalItems})
                </h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-white hover:text-gray-200 transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-base font-medium text-gray-900 mb-1">Your cart is empty</h3>
                    <p className="text-gray-500 text-sm">Add some products to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.product_id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-medium text-gray-900 text-sm flex-1">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => handleQuantityChange(item.product_id, 0)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {item.category && (
                          <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full mb-2">
                            {item.category}
                          </span>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-orange-600 font-medium text-sm">
                            <IndianRupee className="h-3 w-3 mr-1" />
                            {item.price.toFixed(2)} × {item.quantity}
                          </div>
                          
                          <div className="font-bold text-gray-900 text-sm">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Order Settings & Checkout */}
              {cartItems.length > 0 && (
                <div className="border-t border-gray-200 p-4 space-y-3">
                  {/* Order Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Order Type
                      </label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value)}
                        className="w-full py-1.5 px-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                        <option value="Evening">Evening</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Order Date
                      </label>
                      <input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full py-1.5 px-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                      />
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-base font-bold text-orange-800">
                      <span>Total Amount:</span>
                      <span className="flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {totalAmount.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-orange-600 mt-1">
                      {totalItems} item{totalItems !== 1 ? 's' : ''} • {orderType} Order
                    </div>
                  </div>
                  
                  {/* Place Order Button */}
                  <button
                    onClick={submitOrder}
                    disabled={isPlacing}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {isPlacing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Placing Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Place Order</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}