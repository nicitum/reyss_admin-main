import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Package, Users, CreditCard, ShoppingBag, MapPin, BarChart, CheckCircle } from "lucide-react";
import LogoutButton from "./LogoutTab";

const Sidebar = () => {
  const [adminRoutes, setAdminRoutes] = useState([]);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser) {
      setUserRole(loggedInUser.role);
      if (loggedInUser.role === "superadmin" && loggedInUser.routes) {
        setAdminRoutes(loggedInUser.routes);
      }
    }
  }, []);

  const sidebarGradient =
    userRole === "superadmin"
      ? "bg-gradient-to-b from-red-600 to-yellow-400"
      : "bg-gradient-to-b from-blue-600 to-purple-600";

  return (
    <div className={`h-screen w-64 text-white ${sidebarGradient} shadow-lg`}>
      <div className="p-4 text-center">
        <h2 className="text-3xl font-extrabold">SL Enterprisess</h2>
        <p className="text-sm font-semibold opacity-90">
          {userRole === "superadmin" ? "Super Admin Panel" : "Admin Panel"}
        </p>
      </div>
      
      <nav className="mt-6 space-y-1">
        {/* Common Routes for all users */}
        

        <NavLink
          to="/dashboard/users"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
              isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
            }`
          }
        >
          <Users className="mr-3" />
          Users
        </NavLink>

       

        <NavLink
          to="/dashboard/products"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
              isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
            }`
          }
        >
          <ShoppingBag className="mr-3" />
          Products
        </NavLink>

        <NavLink
          to="/dashboard/placeindent"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
              isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
            }`
          }
        >
          <ShoppingBag className="mr-3" />
          Place Indent
        </NavLink>

        {/* Super Admin Only Routes */}
        {userRole === "superadmin" && (
          <>
            <NavLink
              to="/dashboard/adminRoutes"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
                  isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <MapPin className="mr-3" />
              Routes Manager
            </NavLink>

           
            <NavLink
              to="/dashboard/adminusersDetails"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
                  isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <Users className="mr-3" />
              Admin User Details
            </NavLink>

            <NavLink
              to="/dashboard/adminordersreport"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
                  isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <BarChart className="mr-3" />
              Admin Wise Report
            </NavLink>


            <NavLink
              to="/dashboard/updateorderprices"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
                  isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <BarChart className="mr-3" />
              Update Order Prices
            </NavLink>

            <NavLink
              to="/dashboard/orderacceptance"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
                  isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <CheckCircle className="mr-3" />
              Order Acceptance
            </NavLink>



            <NavLink
              to="/dashboard/tallyinvoicereport"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
                  isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <BarChart className="mr-3" />
              Tally Invoice Report
            </NavLink>



            <NavLink
              to="/dashboard/tallyreceiptreport"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-gray-700 transition-colors rounded-lg ${
                  isActive ? "bg-gray-700 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <BarChart className="mr-3" />
              Tally Receipt Report
            </NavLink>
          </>
        )}

        {/* Assigned Routes List */}
        {userRole === "superadmin" && adminRoutes.length > 0 && (
          <div className="mt-6 px-6">
            <h3 className="text-lg font-semibold">Assigned Routes</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-200">
              {adminRoutes.map((route, index) => (
                <li key={index}>{route}</li>
              ))}
            </ul>
          </div>
        )}

        <LogoutButton />
      </nav>
    </div>
  );
};

export default Sidebar;