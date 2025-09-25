import React, { useEffect, useState, useRef } from 'react';
import { getAdminOrders, getAdmins, getAssignedUsers, getOrderProducts } from '../../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import { 
  Calendar, 
  User, 
  Search, 
  Filter, 
  ShoppingCart, 
  Package, 
  IndianRupee, 
  Clock, 
  FileText,
  Download,
  Users,
  Route,
  TrendingUp
} from "lucide-react";


function AdminOrdersReport() {
    const [admins, setAdmins] = useState([]);
    const [adminOrders, setAdminOrders] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0]
    });
    const [filteredAdminOrders, setFilteredAdminOrders] = useState({});
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderProducts, setOrderProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Refs for auto-scrolling
    const ordersSectionRef = useRef(null);
    const detailsSectionRef = useRef(null);

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const adminUsers = await getAdmins();
                setAdmins(adminUsers);
                console.log('admins', adminUsers)
            } catch (error) {
                toast.error("Failed to fetch admins.");
                console.error("Error fetching admins:", error);
                setError("Failed to fetch admin data. Please try again.");
            }
        };
        fetchAdmins();
    }, []);

    useEffect(() => {
        const fetchAdminOrdersData = async () => {
            if (admins.length > 0) {
                setLoading(true);
                setError(null);
                const ordersForAdmins = {};

                for (const admin of admins) {
                    try {
                        const ordersResponse = await getAdminOrders(admin.id);
                        let adminRouteData = 'N/A';
                        let assignedUsersMap = {}; // To efficiently lookup user routes

                        try {
                            const assignedUsersResponse = await getAssignedUsers(admin.id);
                            console.log('users',assignedUsersResponse)
                            if (assignedUsersResponse.success && assignedUsersResponse.assignedUsers) {
                                // Create a map of customer ID to route for quick lookup
                                assignedUsersMap = assignedUsersResponse.assignedUsers.reduce((map, user) => {
                                    map[user.cust_id] = user.route; // Use cust_id as key
                                    return map;
                                }, {});

                              	// For Admin Header Route Display - Correctly calculate admin routes
                              	const routes = [...new Set(assignedUsersResponse.assignedUsers.map(user => user.route).filter(route => route))];
                              	if (routes.length > 0) {
                              		adminRouteData = routes.join(', ');
                              	} else {
                              		adminRouteData = 'No Route Assigned';
                              	}

                            } else {
                                console.error(`Failed to fetch assigned users for admin ${admin.username} (ID: ${admin.id}):`, assignedUsersResponse.message);
                              	adminRouteData = 'Route Fetch Failed';
                            }
                        } catch (assignedUsersError) {
                            console.error(`Error fetching assigned users for admin ${admin.username} (ID: ${admin.id}):`, assignedUsersError);
                        	adminRouteData = 'Route Fetch Error';
                        }


                        if (ordersResponse.success) {
                            // **Correctly extract customer route by looking up in assignedUsersMap**
                            const ordersWithCustomerRoute = ordersResponse.orders.map(order => ({
                                ...order,
                                customer_route: assignedUsersMap[order.customer_id] || 'N/A' // Lookup route from map
                            }));

                            ordersForAdmins[admin.id] = {
                                orders: ordersWithCustomerRoute,
                                routeData: adminRouteData // Store admin's route data for header
                            };
                        } else {
                            console.error(`Failed to fetch orders for admin ${admin.username} (ID: ${admin.id}):`, ordersResponse.message);
                        }
                    } catch (orderError) {
                        console.error(`Error fetching orders for admin ${admin.username} (ID: ${admin.id}):`, orderError);
                    }
                }
                setAdminOrders(ordersForAdmins);
                setLoading(false);
            }
        };

        fetchAdminOrdersData();
    }, [admins]);

    useEffect(() => {
        const filterOrdersByDate = () => {
            const filteredOrders = {};
            admins.forEach(admin => {
                const adminId = admin.id;
                const adminOrderData = adminOrders[adminId];
                const orders = adminOrderData?.orders || [];
                filteredOrders[adminId] = {
                    orders: orders.filter(order => {
                        if (!order.placed_on) return false;
                        const orderDate = new Date(order.placed_on * 1000);
                        const fromDate = new Date(dateRange.fromDate);
                        const toDate = new Date(dateRange.toDate);
                        toDate.setHours(23, 59, 59, 999); // End of day
                        return orderDate >= fromDate && orderDate <= toDate;
                    }),
                    routeData: adminOrderData?.routeData // Admin route data for header remains
                };
            });
            setFilteredAdminOrders(filteredOrders);
        };

        filterOrdersByDate();
    }, [adminOrders, dateRange, admins]);

    const exportToExcel = () => {
        const workbook = XLSX.utils.book_new();

        admins.forEach(admin => {
            const adminId = admin.id;
            const adminFilteredData = filteredAdminOrders[adminId] || {};
            const orders = adminFilteredData.orders || [];
            const adminRouteData = adminFilteredData.routeData;


            if (orders.length > 0) {
                const sheetData = [
                    [
                        "order_id",
                        "customer_id",
                        "Customer Route",
                        "total_amount",
                        "order_type",
                        "placed_on",
                        "cancelled",
                        "loading_slip",
                        "approve_status",
                        "delivery_status",
                        
                    ],
                    ...orders.map(order => [
                        order.id,
                        order.customer_id,
                        order.customer_route,
                        order.total_amount,
                        order.order_type,
                        format(new Date(order.placed_on * 1000), 'dd-MM-yyyy HH:mm:ss'),
                        order.cancelled,
                        order.loading_slip,
                        order.approve_status,
                        order.delivery_status,
                        // Correct customer route for excel
                    ])
                ];
                const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
                XLSX.utils.book_append_sheet(workbook, worksheet, `Admin ${admin.username} Orders`);
            } else {
                const worksheet = XLSX.utils.aoa_to_sheet([[`No orders found for Admin: ${admin.username} for selected date range.`]]);
                XLSX.utils.book_append_sheet(workbook, worksheet, `Admin ${admin.username} Orders`);
            }
        });

        XLSX.writeFile(workbook, "AdminOrdersReport.xlsx");
    };

    // Handle date range change
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle admin selection
    const handleAdminSelect = (admin) => {
        setSelectedAdmin(admin);
        setSelectedOrder(null);
        setOrderProducts([]);
        // Auto-scroll to orders section
        setTimeout(() => {
            ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Handle order selection
    const handleOrderSelect = async (order) => {
        setSelectedOrder(order);
        setError(null);
        
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

    // Filter admins based on search term
    const filteredAdmins = admins.filter(admin => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            admin.username.toLowerCase().includes(term) ||
            admin.id.toString().includes(term) ||
            (filteredAdminOrders[admin.id]?.routeData && 
             filteredAdminOrders[admin.id].routeData.toLowerCase().includes(term))
        );
    });

    // Status colors matching OrderHistoryPage theme
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl">
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Orders Report</h1>
                            <p className="text-gray-600">View and manage admin order reports with detailed analytics</p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4">
                            <FileText className="h-8 w-8 text-white" />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
                        <div className="flex items-center mb-4">
                            <Filter className="h-5 w-5 mr-2" />
                            <h2 className="text-lg font-semibold">Filters & Export</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                                <label className="block text-sm font-medium text-orange-100 mb-2">Search Admins</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Admin name, ID, or route..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-end">
                                <button
                                    onClick={exportToExcel}
                                    className="w-full bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors flex items-center justify-center"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Excel
                                </button>
                            </div>
                            
                            <div className="flex items-end">
                                <div className="w-full bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-medium text-center">
                                    <TrendingUp className="h-4 w-4 inline mr-2" />
                                    {admins.length} Admins
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {/* Main Content - Vertical Layout */}
                <div className="space-y-6">
                    {/* Admin Selection Section */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center mb-4">
                            <Users className="h-5 w-5 text-orange-600 mr-2" />
                            <h2 className="text-xl font-semibold text-gray-900">Select Admin</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                            {filteredAdmins.map((admin) => {
                                const adminData = filteredAdminOrders[admin.id];
                                const orderCount = adminData?.orders?.length || 0;
                                const routeData = adminData?.routeData || 'No Routes';
                                
                                return (
                                    <div
                                        key={admin.id}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                                            selectedAdmin?.id === admin.id
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-orange-300'
                                        }`}
                                        onClick={() => handleAdminSelect(admin)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900">{admin.username}</h3>
                                                <p className="text-sm text-gray-600">ID: {admin.id}</p>
                                                <div className="mt-2">
                                                    <div className="flex items-center text-xs text-gray-500 mb-1">
                                                        <Route className="h-3 w-3 mr-1" />
                                                        <span className="truncate">{routeData}</span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <ShoppingCart className="h-3 w-3 mr-1" />
                                                        <span>{orderCount} orders</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-orange-100 rounded-full p-2">
                                                <User className="h-4 w-4 text-orange-600" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orders Section */}
                    <div ref={ordersSectionRef}>
                        {selectedAdmin && (
                            <div className="bg-white rounded-2xl shadow-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <ShoppingCart className="h-5 w-5 text-orange-600 mr-2" />
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {selectedAdmin.username}'s Orders
                                        </h2>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                                            {filteredAdminOrders[selectedAdmin.id]?.orders?.length || 0} orders
                                        </span>
                                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                                            Routes: {filteredAdminOrders[selectedAdmin.id]?.routeData || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                
                                {filteredAdminOrders[selectedAdmin.id]?.orders && filteredAdminOrders[selectedAdmin.id].orders.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredAdminOrders[selectedAdmin.id].orders.map((order) => (
                                            <div
                                                key={order.id}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                                                    selectedOrder?.id === order.id
                                                        ? 'border-red-500 bg-red-50'
                                                        : 'border-gray-200 hover:border-red-300'
                                                }`}
                                                onClick={() => handleOrderSelect(order)}
                                            >
                                                <div className="flex justify-between items-start mb-3">
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
                                                
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-600 flex items-center">
                                                            <User className="h-3 w-3 mr-1" />
                                                            {order.customer_id}
                                                        </span>
                                                        <span className="text-sm text-gray-600 flex items-center">
                                                            <Route className="h-3 w-3 mr-1" />
                                                            {order.customer_route || 'N/A'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-600">{order.order_type}</span>
                                                        <span className="font-semibold text-gray-900 flex items-center">
                                                            <IndianRupee className="h-3 w-3" />
                                                            {order.total_amount?.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                                        <div className="bg-gray-50 rounded-lg p-2">
                                                            <p className="text-xs text-gray-500">Cancelled</p>
                                                            <p className="font-medium text-xs">{String(order.cancelled)}</p>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-lg p-2">
                                                            <p className="text-xs text-gray-500">Delivery</p>
                                                            <p className="font-medium text-xs">{order.delivery_status || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                        <p className="text-gray-600">No orders found for this admin in the selected date range</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Order Details Section */}
                        <div ref={detailsSectionRef}>
                            {selectedOrder && (
                                <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
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
        </div>
    );
}

export default AdminOrdersReport;