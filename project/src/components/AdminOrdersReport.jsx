import React, { useEffect, useState } from 'react';
import { getAdminOrders, getUsers, getAssignedUsers } from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import { Calendar } from "lucide-react";
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { format, startOfDay, endOfDay } from 'date-fns';


function AdminOrdersReport() {
    const [admins, setAdmins] = useState([]);
    const [adminOrders, setAdminOrders] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState([
        {
            startDate: startOfDay(new Date()),
            endDate: endOfDay(new Date()),
            key: 'selection',
        }
    ]);
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [filteredAdminOrders, setFilteredAdminOrders] = useState({});

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const userData = await getUsers();
                const adminUsers = userData.filter((user) => user.role === "admin");
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
                        const startDate = dateRange[0].startDate;
                        const endDate = dateRange[0].endDate;
                        return orderDate >= startDate && orderDate <= endDate;
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

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '30px', fontSize: '1.1em', color: '#555' }}>Loading admin order data...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', padding: '30px', fontSize: '1.1em', color: 'red' }}>Error: {error}</div>;
    }


    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={() => setDatePickerOpen(!isDatePickerOpen)}
                        style={{
                            display: 'flex', alignItems: 'center', padding: '10px 16px',
                            border: '1px solid #ccc', borderRadius: '5px', background: 'white', cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: '0.95em'
                        }}
                    >
                        <Calendar style={{ marginRight: '8px', width: '18px', height: '18px' }} />
                        <span style={{ fontWeight: '500' }}>
                            {format(dateRange[0].startDate, 'yyyy-MM-dd')} - {format(dateRange[0].endDate, 'yyyy-MM-dd')}
                        </span>
                    </button>
                    {isDatePickerOpen && (
                        <div style={{ position: 'relative', marginTop: '1px', boxShadow: '0 4px 8px rgba(0,0,0,0.15)', borderRadius: '5px', zIndex: 10 }}>
                            <DateRangePicker
                                onChange={item => {
                                    setDateRange([item.selection]);
                                    setDatePickerOpen(false); // Close datepicker after selection
                                }}
                                ranges={dateRange}
                                direction="horizontal"
                                // Display only one month initially to reduce height
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={exportToExcel}
                    style={{
                        padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px',
                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: '0.95em', fontWeight: '500'
                    }}
                >
                    Export Report
                </button>
            </div>

            <div>
                <h2 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5em', fontWeight: '600' }}>Admin Order Dashboard</h2>
                {admins.map(admin => (
                    <div key={admin.id} style={{ marginBottom: '25px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 5px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginBottom: '15px', color: '#444', fontWeight: '500' }}>Orders for Admin: <span style={{ fontWeight: '600' }}>{admin.username}</span> (ID: {admin.id}) - Routes: {filteredAdminOrders[admin.id]?.routeData}</h3>
                        {filteredAdminOrders[admin.id]?.orders && filteredAdminOrders[admin.id].orders.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: '#f8f8f8' }}>
                                        <tr>
                                            <th style={tableHeaderStyle}>Order ID</th>
                                            <th style={tableHeaderStyle}>Customer ID</th>
                                            <th style={tableHeaderStyle}>Customer Route</th>
                                            <th style={tableHeaderStyle}>Total Amount</th>
                                            <th style={tableHeaderStyle}>Order Type</th>
                                            <th style={tableHeaderStyle}>Placed On</th>
                                            <th style={tableHeaderStyle}>Cancelled</th>
                                            <th style={tableHeaderStyle}>Loading Slip</th>
                                            <th style={tableHeaderStyle}>Approve Status</th>
                                            <th style={tableHeaderStyle}>Delivery Status</th>
                                            
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAdminOrders[admin.id].orders.map(order => (
                                            <tr key={order.id}>
                                                <td style={tableCellStyle}>{order.id}</td>
                                                <td style={tableCellStyle}>{order.customer_id}</td>
                                                <td style={tableCellStyle}>{order.customer_route || 'N/A'}</td> 
                                                <td style={tableCellStyle}>{order.total_amount}</td>
                                                <td style={tableCellStyle}>{order.order_type}</td>
                                                <td style={tableCellStyle}>{new Date(order.placed_on * 1000).toLocaleDateString('en-gb')}</td>
                                                <td style={tableCellStyle}>{String(order.cancelled)}</td>
                                                <td style={tableCellStyle}>{order.loading_slip}</td>
                                                <td style={tableCellStyle}>{order.approve_status}</td>
                                                <td style={tableCellStyle}>{order.delivery_status}</td>
                                               {/* Display customer route or N/A if not found */}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: '#777', padding: '10px' }}>No orders found for this admin for the selected date range.</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


const tableHeaderStyle = {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    fontWeight: 'bold',
    backgroundColor: '#f8f8f8',
    fontSize: '0.9em',
    color: '#333'
};

const tableCellStyle = {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '1px solid #eee',
    fontSize: '0.9em',
    color: '#555'
};

export default AdminOrdersReport;