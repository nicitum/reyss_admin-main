import React, { useState, useEffect, useMemo } from "react";
import {
  getProducts,
  addProduct,
  updateProductsByBrand,
  updateProduct,
  globalPriceUpdate,
} from "../services/api";
import { 
  Plus, 
  Edit, 
  Package, 
  Search, 
  Filter,
  Grid,
  List,
  IndianRupee,
  CheckCircle,
  X
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProductEditModal, setShowProductEditModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [newProduct, setNewProduct] = useState({
    name: "",
    brand: "",
    category: "",
    price: "",
    discountPrice: "",
    price_p1: "",
    price_p2: "",
    price_p3: "",
    price_p4: "",
    price_p5: "",
    price_p6: "",
    hsn_code: "",
    gst_rate: "",
  });
  const [bulkEdit, setBulkEdit] = useState({
    price: "",
    stock: "",
  });
  const [currentProduct, setCurrentProduct] = useState({
    id: "",
    name: "",
    brand: "",
    category: "",
    price: "",
    discountPrice: "",
    enable_product: "Yes",
    price_p1: "",
    price_p2: "",
    price_p3: "",
    price_p4: "",
    price_p5: "",
    price_p6: "",
    hsn_code: "",
    gst_rate: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      const normalized = (Array.isArray(data?.data) ? data.data : data) || [];
      setProducts(normalized);
      setBrands([...new Set(normalized.map((p) => p.brand))]);
      setCategories([...new Set(normalized.map((p) => p.category))]);
    } catch (error) {
      toast.error("Failed to fetch products");
    }
  };

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (productSearch) {
      const query = productSearch.toLowerCase();
      filtered = filtered.filter((p) =>
        [p.name, p.brand, p.category]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      );
    }
    
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    return filtered;
  }, [products, productSearch, selectedBrand, selectedCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await addProduct(newProduct);
      await fetchProducts();
      setShowAddModal(false);
      setNewProduct({
        name: "",
        brand: "",
        category: "",
        price: "",
        discountPrice: "",
        price_p1: "",
        price_p2: "",
        price_p3: "",
        price_p4: "",
        price_p5: "",
        price_p6: "",
        hsn_code: "",
        gst_rate: "",
      });
      toast.success("Product added successfully");
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  const handleBulkEdit = async (e) => {
    e.preventDefault();
    try {
      await updateProductsByBrand(selectedBrand, bulkEdit);
      await fetchProducts();
      setShowEditModal(false);
      setBulkEdit({ price: "", stock: "" });
      toast.success("Products updated successfully");
    } catch (error) {
      toast.error("Failed to update products");
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      console.log("Updating product:", currentProduct);
      await updateProduct(currentProduct.id, currentProduct);
      console.log("Calling globalPriceUpdate with:", {
        productId: currentProduct.id,
        newDiscountPrice: parseFloat(currentProduct.discountPrice),
      });
      const response = await globalPriceUpdate(
        currentProduct.id,
        parseFloat(currentProduct.discountPrice)
      );
      console.log("Global Price Update Response:", response.data);
      await fetchProducts();
      setShowProductEditModal(false);
      toast.success("Product updated successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update product");
    }
  };

  const isEnabled = (p) => {
    const raw =
      p.enable_product ??
      p.enable_products ??
      p.enabled ??
      p.is_enabled;
    const v = typeof raw === "string" ? raw.trim() : raw;
    return (
      v === true ||
      v === 1 ||
      v === "1" ||
      v === "Yes" ||
      v === "yes" ||
      v === "Y" ||
      v === "y" ||
      v === "TRUE" ||
      v === "true" ||
      v === "Enabled" ||
      v === "enabled" ||
      v === "Active" ||
      v === "active"
    );
  };

  const clearFilters = () => {
    setProductSearch("");
    setSelectedBrand("");
    setSelectedCategory("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
              <p className="text-gray-600 mt-1">Manage your product catalog and pricing</p>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Search & Filter
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by product name, brand or category..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Brand Filter */}
              <div>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* View Mode and Results Summary */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{paginatedProducts.length}</span> of{" "}
                  <span className="font-semibold">{filteredProducts.length}</span> products
                </div>
                
                {(productSearch || selectedBrand || selectedCategory) && (
                  <button
                    onClick={clearFilters}
                    className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center justify-center py-2 px-3 transition-colors duration-200 ${
                      viewMode === "grid"
                        ? "bg-orange-500 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center justify-center py-2 px-3 transition-colors duration-200 ${
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
          </div>
        </div>

        {/* Products Display */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">Product Catalog</h2>
          </div>
          
          {paginatedProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
              <p className="text-gray-500 text-sm">
                {productSearch || selectedBrand || selectedCategory
                  ? "Try adjusting your search criteria"
                  : "No products available at the moment"}
              </p>
            </div>
          ) : (
            <>
              <div className="p-4">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all duration-200 border border-gray-200"
                      >
                        <div className="flex flex-col h-full">
                          {/* Product Info */}
                          <div className="flex-1 mb-3">
                            <div className="bg-orange-100 rounded-lg p-3 mb-3 text-center">
                              <Package className="h-8 w-8 text-orange-600 mx-auto" />
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2">
                              {product.name}
                            </h3>
                            
                            <div className="flex items-center justify-between mb-2">
                              {product.brand && (
                                <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                  {product.brand}
                                </span>
                              )}
                              {product.category && (
                                <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                  {product.category}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-600 text-sm">
                                <span>Base:</span>
                                <div className="flex items-center font-medium text-gray-900 ml-1">
                                  <IndianRupee className="h-3 w-3" />
                                  {Number(product.price || 0).toFixed(2)}
                                </div>
                              </div>
                              
                              <div className="flex items-center text-orange-600 font-bold">
                                <IndianRupee className="h-3 w-3" />
                                {Number(product.discountPrice || product.price || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Product Status and Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <span className={`px-2 py-1 rounded text-xs ${isEnabled(product) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              {isEnabled(product) ? "Enabled" : "Disabled"}
                            </span>
                            
                            <button
                              onClick={() => {
                                setCurrentProduct(product);
                                setShowProductEditModal(true);
                              }}
                              className="flex items-center text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all duration-200 border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="bg-orange-100 rounded-lg p-2">
                              <Package className="h-6 w-6 text-orange-600" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-base mb-1">
                                {product.name}
                              </h3>
                              
                              <div className="flex items-center space-x-3 text-sm text-gray-600 mb-2">
                                {product.brand && (
                                  <span className="px-2 py-0.5 bg-gray-200 rounded-full">
                                    {product.brand}
                                  </span>
                                )}
                                {product.category && (
                                  <span className="px-2 py-0.5 bg-gray-200 rounded-full">
                                    {product.category}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center">
                                <div className="flex items-center text-gray-600 text-sm mr-4">
                                  <span>Base:</span>
                                  <div className="flex items-center font-medium text-gray-900 ml-1">
                                    <IndianRupee className="h-3 w-3" />
                                    {Number(product.price || 0).toFixed(2)}
                                  </div>
                                </div>
                                
                                <div className="flex items-center text-orange-600 font-bold">
                                  <IndianRupee className="h-3 w-3 mr-1" />
                                  {Number(product.discountPrice || product.price || 0).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 rounded text-xs ${isEnabled(product) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              {isEnabled(product) ? "Enabled" : "Disabled"}
                            </span>
                            
                            <button
                              onClick={() => {
                                setCurrentProduct(product);
                                setShowProductEditModal(true);
                              }}
                              className="flex items-center text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
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
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowAddModal(false)}></div>
            
            <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Add New Product</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-white hover:text-gray-200 transition-colors duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleAddProduct} className="px-6 py-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Half - Basic Product Information */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter product name"
                            value={newProduct.name}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, name: e.target.value })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter brand"
                            value={newProduct.brand}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, brand: e.target.value })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter category"
                            value={newProduct.category}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, category: e.target.value })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            HSN Code
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter HSN code"
                            value={newProduct.hsn_code}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, hsn_code: e.target.value })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            GST Rate (%)
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Enter GST rate"
                            value={newProduct.gst_rate}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, gst_rate: e.target.value })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Half - Pricing Information */}
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Pricing Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base Price
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            value={newProduct.price}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, price: e.target.value })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount Price
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            value={newProduct.discountPrice}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                discountPrice: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        
                        {/* Price Tiers */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P1</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={newProduct.price_p1}
                              onChange={(e) => setNewProduct({ ...newProduct, price_p1: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P2</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={newProduct.price_p2}
                              onChange={(e) => setNewProduct({ ...newProduct, price_p2: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P3</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={newProduct.price_p3}
                              onChange={(e) => setNewProduct({ ...newProduct, price_p3: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P4</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={newProduct.price_p4}
                              onChange={(e) => setNewProduct({ ...newProduct, price_p4: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P5</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={newProduct.price_p5}
                              onChange={(e) => setNewProduct({ ...newProduct, price_p5: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P6</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={newProduct.price_p6}
                              onChange={(e) => setNewProduct({ ...newProduct, price_p6: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-md transition-colors flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showProductEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowProductEditModal(false)}></div>
            
            <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Edit Product</h3>
                  <button
                    onClick={() => setShowProductEditModal(false)}
                    className="text-white hover:text-gray-200 transition-colors duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleEditProduct} className="px-6 py-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Half - Basic Product Information */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter product name"
                            value={currentProduct.name}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                name: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter brand"
                            value={currentProduct.brand}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                brand: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter category"
                            value={currentProduct.category}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                category: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            HSN Code
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter HSN code"
                            value={currentProduct.hsn_code}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                hsn_code: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            GST Rate (%)
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Enter GST rate"
                            value={currentProduct.gst_rate}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                gst_rate: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Enable Product</label>
                          <select
                            value={isEnabled(currentProduct) ? "Yes" : (currentProduct.enable_product || "No")}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                enable_product: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Half - Pricing Information */}
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Pricing Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base Price
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            value={currentProduct.price}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                price: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount Price
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            value={currentProduct.discountPrice}
                            onChange={(e) =>
                              setCurrentProduct({
                                ...currentProduct,
                                discountPrice: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        
                        {/* Price Tiers */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P1</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={currentProduct.price_p1}
                              onChange={(e) => setCurrentProduct({ ...currentProduct, price_p1: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P2</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={currentProduct.price_p2}
                              onChange={(e) => setCurrentProduct({ ...currentProduct, price_p2: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P3</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={currentProduct.price_p3}
                              onChange={(e) => setCurrentProduct({ ...currentProduct, price_p3: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P4</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={currentProduct.price_p4}
                              onChange={(e) => setCurrentProduct({ ...currentProduct, price_p4: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P5</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={currentProduct.price_p5}
                              onChange={(e) => setCurrentProduct({ ...currentProduct, price_p5: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price P6</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={currentProduct.price_p6}
                              onChange={(e) => setCurrentProduct({ ...currentProduct, price_p6: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowProductEditModal(false)}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-md transition-colors flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}