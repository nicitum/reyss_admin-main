import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import UsersTab from './Masters/UsersMasters/UsersTab';
import ProductMasters from './Masters/ProductMasters/ProductMasters';
import RouteMasters from './Masters/RouteMasters';
import RouteSwap from './Masters/RouteSwap';

import AdminUserDetails from './Reports/AdminUsersDetails';
import AdminOrdersReport from './Reports/AdminOrdersReport';
import BrandWiseReport from './Reports/BrandWiseReport';
import UpdateOrderPrices from './Transactions/PlaceIndent/UpdateOrderPrices';
import TallyInvoiceReport from './Reports/TallyInvoiceReport';
import TallyReceiptReport from './Reports/TallyReceiptReport';
import LoadingSlip from './Reports/LoadingSlip';
import DeliverySlip from './Reports/DeliverySlip';
import PlaceOrderFlow from './Transactions/PlaceIndent';
import OrderAcceptance from './Transactions/PlaceIndent/OrderAcceptance';
import OrderControl from './Utility/OrderControl';
import Invoice from './Transactions/PlaceIndent/Invoice';
import CutOffTiming from './Masters/CutOffTiming';
import FontSettings from './FontSettings';
import OrderHistoryPage from './Reports/OrderHistoryPage';
import OrderSummaryPage from './Reports/OrderSummaryPage';
import CreditLimit from './Collections/CreditLimit';
import CollectCash from './Collections/CollectCash';
import PaymentsReport from './Reports/PaymentsReport';
import ItemsReport from './Reports/ItemsReport';
import CashWallet from './Collections/CashWallet';
import SLEMainAccount from './Collections/SLEMainAccount';
import AutoOrderPage from './Utility/AutoOrderPage';

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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
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
              <Route path="/products" element={<ProductMasters />} />
              <Route path="/route-masters" element={<RouteMasters />} />
              <Route path="/routeswap" element={<RouteSwap />} />
              <Route path="/adminusersDetails" element={<AdminUserDetails />} />
              <Route path="/adminordersreport" element={<AdminOrdersReport />} />
              <Route path="/brandwisereport" element={<BrandWiseReport />} />
              <Route path="/updateorderprices" element={<UpdateOrderPrices />} />
              <Route path="/orderacceptance" element={<OrderAcceptance />} />
              <Route path="/ordercontrol" element={<OrderControl />} />
              <Route path="/tallyinvoicereport" element={<TallyInvoiceReport />} />
              <Route path="/tallyreceiptreport" element={<TallyReceiptReport />} />
              <Route path="/loadingslip" element={<LoadingSlip />} />
              <Route path="/deliveryslip" element={<DeliverySlip />} />
              <Route path="/placeindent" element={<PlaceOrderFlow />} />
              <Route path="/invoice" element={<Invoice />} />
              <Route path="/cutofftiming" element={<CutOffTiming />} />
              <Route path="/fontsettings" element={<FontSettings />} />
              <Route path="/orderhistory" element={<OrderHistoryPage />} />
              <Route path="/ordersummary" element={<OrderSummaryPage />} />
               <Route path="/autoorder" element={<AutoOrderPage />} />
              <Route path="/creditlimit" element={<CreditLimit />} />
              <Route path="/collectcash" element={<CollectCash />} />
              <Route path="/paymentsreport" element={<PaymentsReport />} />
              <Route path="/itemsreport" element={<ItemsReport />} />
              <Route path="/cashwallet" element={<CashWallet />} />
              <Route path="/slemainaccount" element={<SLEMainAccount />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}