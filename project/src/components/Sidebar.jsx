import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Package, Users, CreditCard, ShoppingBag, MapPin, BarChart, CheckCircle, ChevronDown, ChevronRight, ArrowLeftRight, FileText, Settings, Type, Clock, Wallet } from "lucide-react";
import LogoutButton from "./LogoutTab";

const Sidebar = () => {
  const [adminRoutes, setAdminRoutes] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <div className={`h-full w-64 text-white ${sidebarGradient} shadow-lg flex flex-col`}>
      <div className="p-4 text-center flex-shrink-0">
        <h2 className="text-3xl font-extrabold">SL Enterprisess</h2>
        <p className="text-sm font-semibold opacity-90">
          {userRole === "superadmin" ? "Super Admin Panel" : "Admin Panel"}
        </p>
      </div>
      
      <nav className="mt-6 space-y-1 flex flex-col flex-1 overflow-y-auto pb-4">
        {/* Common Routes for all users */}
        

        {/* Masters Dropdown */}
        <div className="space-y-1">
          <button
            onClick={() => setIsMastersOpen(!isMastersOpen)}
            className="flex items-center justify-between w-full px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg text-gray-200"
          >
            <div className="flex items-center">
              <Package className="mr-3" />
              Masters
            </div>
            {isMastersOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {isMastersOpen && (
            <div className="ml-6 space-y-1">
              <NavLink
                to="/dashboard/users"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <Users className="mr-3" />
                Users
              </NavLink>
              
              <NavLink
                to="/dashboard/products"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <ShoppingBag className="mr-3" />
                Products
              </NavLink>
              
              <NavLink
                to="/dashboard/route-masters"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <MapPin className="mr-3" />
                Route Masters
              </NavLink>
              
              <NavLink
                to="/dashboard/routeswap"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <ArrowLeftRight className="mr-3" />
                Route Swap
              </NavLink>
              
              <NavLink
                to="/dashboard/cutofftiming"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <Settings className="mr-3" />
                Cut Off Timing
              </NavLink>
              
              <NavLink
                to="/dashboard/creditlimit"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <CreditCard className="mr-3" />
                Credit Limit
              </NavLink>
              
              <NavLink
                to="/dashboard/collectcash"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <Wallet className="mr-3" />
                Collect Cash
              </NavLink>

            </div>
          )}
        </div>

        <NavLink
          to="/dashboard/placeindent"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
              isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
            }`
          }
        >
          <ShoppingBag className="mr-3" />
          Place Indent
        </NavLink>

        {/* Order History Page Link */}
        <NavLink
          to="/dashboard/orderhistory"
          className={({ isActive }) =>
            `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
              isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
            }`
          }
        >
          <FileText className="mr-3" />
          Order History
        </NavLink>

        {/* Super Admin Only Routes */}
        {userRole === "superadmin" && (
          <>
           
            <NavLink
              to="/dashboard/adminusersDetails"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                  isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <Users className="mr-3" />
              Admin User Details
            </NavLink>

            <NavLink
              to="/dashboard/adminordersreport"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                  isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <BarChart className="mr-3" />
              Admin Wise Report
            </NavLink>


            <NavLink
              to="/dashboard/updateorderprices"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                  isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <BarChart className="mr-3" />
              Update Order Prices
            </NavLink>

            <NavLink
              to="/dashboard/orderacceptance"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                  isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <CheckCircle className="mr-3" />
              Order Acceptance
            </NavLink>

            <NavLink
              to="/dashboard/ordercontrol"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                  isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <Settings className="mr-3" />
              Order Control
            </NavLink>

            {/* Auto Order Preferences - New Link */}
            <NavLink
              to="/dashboard/autoorder"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                  isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                }`
              }
            >
              <Clock className="mr-3" />
              Auto Order Preferences
            </NavLink>

            {/* Reports Dropdown */}
            <div className="space-y-1">
              <button
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                className="flex items-center justify-between w-full px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg text-gray-200"
              >
                <div className="flex items-center">
                  <BarChart className="mr-3" />
                  Reports
                </div>
                {isReportsOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {isReportsOpen && (
                <div className="ml-6 space-y-1">
                  <NavLink
                    to="/dashboard/tallyinvoicereport"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <BarChart className="mr-3" />
                    Tally Invoice Report
                  </NavLink>
                  
                  <NavLink
                    to="/dashboard/tallyreceiptreport"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <BarChart className="mr-3" />
                    Tally Receipt Report
                  </NavLink>
                  
                  <NavLink
                    to="/dashboard/loadingslip"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <FileText className="mr-3" />
                    Loading Slip
                  </NavLink>
                  
                  <NavLink
                    to="/dashboard/deliveryslip"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <FileText className="mr-3" />
                    Delivery Slip
                  </NavLink>
                  
                  <NavLink
                    to="/dashboard/brandwisereport"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <BarChart className="mr-3" />
                    Brand Wise Report
                  </NavLink>
                  
                  <NavLink
                    to="/dashboard/ordersummary"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <BarChart className="mr-3" />
                    Order Summary
                  </NavLink>
                  
                  <NavLink
                    to="/dashboard/invoice"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <FileText className="mr-3" />
                    Invoice
                  </NavLink>
                  
                  <NavLink
                    to="/dashboard/paymentsreport"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <CreditCard className="mr-3" />
                    Payments Report
                  </NavLink>

                  <NavLink
                    to="/dashboard/itemsreport"
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                        isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                      }`
                    }
                  >
                    <BarChart className="mr-3" />
                    Items Report
                  </NavLink>

                </div>
              )}
            </div>
          </>
        )}

        {/* Assigned Routes List */}
        {userRole === "superadmin" && adminRoutes.length > 0 && (
          <div className="mt-6 px-6 flex-shrink-0">
            <h3 className="text-lg font-semibold">Assigned Routes</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-200">
              {adminRoutes.map((route, index) => (
                <li key={index}>{route}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Settings Dropdown at Bottom */}
        <div className="space-y-1 mt-auto flex-shrink-0">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center justify-between w-full px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg text-gray-200"
          >
            <div className="flex items-center">
              <Settings className="mr-3" />
              Settings
            </div>
            {isSettingsOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {isSettingsOpen && (
            <div className="ml-6 space-y-1 mb-2">
              <NavLink
                to="/dashboard/fontsettings"
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 hover:bg-orange-500 transition-colors rounded-lg ${
                    isActive ? "bg-orange-500 text-white font-bold" : "text-gray-200"
                  }`
                }
              >
                <Type className="mr-3" />
                Font Settings
              </NavLink>
              <LogoutButton />
            </div>
          )}
        </div>
        

      </nav>
    </div>
  );
};

export default Sidebar;