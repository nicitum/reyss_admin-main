import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import UsersTab from './UsersTab';
import ProductsTab from './ProductsTab';
import RouteMasters from './RouteMasters';
import RouteSwap from './RouteSwap';

import AdminRoutes from './AdminRoutes';


import AdminUserDetails from './AdminUsersDetails';
import AdminOrdersReport from './AdminOrdersReport';
import BrandWiseReport from './BrandWiseReport';
import UpdateOrderPrices from './UpdateOrderPrices';
import TallyInvoiceReport from './TallyInvoiceReport';
import TallyReceiptReport from './TallyReceiptReport';
import LoadingSlip from './LoadingSlip';
import PlaceIndent from './PlaceIndent';
import OrderAcceptance from './OrderAcceptance';

 


export default function Dashboard() {
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    // Retrieve the logged-in user from localStorage
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (user) {
      setLoggedInUser(user);
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        {/* Display "Logged in as" if a user is logged in */}
        {loggedInUser && (
          <div className="mb-4">
      <h2 className="text-xl font-bold">
        Logged in as{" "}
        {loggedInUser?.role === "superadmin"
          ? "SUPER ADMIN"
          : loggedInUser?.role?.toUpperCase() || "UNKNOWN"}
      </h2>

          </div>
        )}
        
        <Routes>
          
          <Route path="/users" element={<UsersTab />} />
      
          <Route path="/products" element={<ProductsTab />} />
          <Route path="/route-masters" element={<RouteMasters />} />
          <Route path="/routeswap" element={<RouteSwap />} />
          <Route path="/adminRoutes" element={<AdminRoutes />} /> {/* Add this route */}
        
          <Route path="/adminusersDetails" element={<AdminUserDetails />} />
          <Route path="/adminordersreport" element={<AdminOrdersReport />} />
          <Route path="/brandwisereport" element={<BrandWiseReport />} />

          <Route path="/updateorderprices" element={<UpdateOrderPrices />} />
          <Route path="/orderacceptance" element={<OrderAcceptance />} />
          <Route path="/tallyinvoicereport" element={<TallyInvoiceReport />} />
          <Route path="/tallyreceiptreport" element={<TallyReceiptReport />} />
          <Route path="/loadingslip" element={<LoadingSlip />} />
          <Route path="/placeindent" element={<PlaceIndent />} />
         
          

      
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}
