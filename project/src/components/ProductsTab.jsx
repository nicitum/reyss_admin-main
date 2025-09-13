import React, { useState, useEffect } from "react";
import {
  getProducts,
  addProduct,
  updateProductsByBrand,
  updateProduct,
  globalPriceUpdate,
} from "../services/api";
import { Plus, Edit, Package } from "lucide-react";
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
        stock: "", // Note: "stock" is here but not in the form
        discountPrice: "",
        hsn_code: "", // Add this
        gst_rate: "", // Add this
        price_p1: "",
        price_p2: "",
        price_p3: "",
        price_p4: "",
        price_p5: "",
        price_p6: "",
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Products</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </button>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Filter by Brand
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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

        <div className="flex justify-end mt-4">
          {selectedBrand && (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Edit {selectedBrand} Products
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products
          .filter(
            (product) =>
              (!selectedBrand || product.brand === selectedBrand) &&
              (!selectedCategory || product.category === selectedCategory)
          )
          .map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Brand: {product.brand}</p>
                <p className="text-sm text-gray-600">
                  Category: {product.category}
                </p>
                <p className="text-lg font-bold">Price: ₹{product.price}</p>
                <p className="text-lg font-bold text-red-600">
                 Selling Global Price: ₹{product.discountPrice}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-700">Enable Product:</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${isEnabled(product) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {isEnabled(product) ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => {
                    setCurrentProduct(product);
                    setShowProductEditModal(true);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New Product</h3>
            </div>
            <form onSubmit={handleAddProduct} className="p-6">
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P2</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newProduct.price_p2}
                            onChange={(e) => setNewProduct({ ...newProduct, price_p2: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P3</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newProduct.price_p3}
                            onChange={(e) => setNewProduct({ ...newProduct, price_p3: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P4</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newProduct.price_p4}
                            onChange={(e) => setNewProduct({ ...newProduct, price_p4: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P5</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newProduct.price_p5}
                            onChange={(e) => setNewProduct({ ...newProduct, price_p5: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P6</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newProduct.price_p6}
                            onChange={(e) => setNewProduct({ ...newProduct, price_p6: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showProductEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Edit Product</h3>
            </div>
            <form onSubmit={handleEditProduct} className="p-6">
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P2</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={currentProduct.price_p2}
                            onChange={(e) => setCurrentProduct({ ...currentProduct, price_p2: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P3</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={currentProduct.price_p3}
                            onChange={(e) => setCurrentProduct({ ...currentProduct, price_p3: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P4</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={currentProduct.price_p4}
                            onChange={(e) => setCurrentProduct({ ...currentProduct, price_p4: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P5</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={currentProduct.price_p5}
                            onChange={(e) => setCurrentProduct({ ...currentProduct, price_p5: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Price P6</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={currentProduct.price_p6}
                            onChange={(e) => setCurrentProduct({ ...currentProduct, price_p6: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowProductEditModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}