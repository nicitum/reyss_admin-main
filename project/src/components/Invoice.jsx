import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getOrdersWithDateRange, getOrderProducts, getUsers, getCustomerRoute, getRoutes, postInvoiceToAPI } from '../services/api';
import { filterOrdersByRoutes } from '../utils/deliverySlipHelper';
import jsPDF from 'jspdf';
import './OrderManagement.css';

const Invoice = () => {
  const [orders, setOrders] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [customerRoutes, setCustomerRoutes] = useState({});
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState('All');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Filter orders by selected route(s) and order type
  const getFilteredOrders = useCallback(() => {
    let filteredOrders = [...orders];
    
    // Apply route filtering only if a route is selected
    if (selectedRoute || (selectedRoutes && selectedRoutes.length > 0)) {
      const routesToFilter = selectedRoutes.length > 0 ? selectedRoutes : (selectedRoute ? [selectedRoute] : []);
      filteredOrders = filterOrdersByRoutes(orders, routesToFilter, customerRoutes, routes);
    }
    
    // Apply order type filter
    if (orderTypeFilter === 'AM') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'AM');
    } else if (orderTypeFilter === 'PM + Evening') {
      filteredOrders = filteredOrders.filter(order => order.order_type === 'PM' || order.order_type === 'Evening');
    }
    
    return filteredOrders;
  }, [orders, selectedRoute, selectedRoutes, customerRoutes, routes, orderTypeFilter]);

  // Fetch routes from routes_crud API
  const fetchRoutes = useCallback(async () => {
    try {
      setRoutesLoading(true);
      const routesData = await getRoutes();
      
      if (Array.isArray(routesData) && routesData.length > 0) {
        setRoutes(routesData);
        console.log('Routes loaded successfully:', routesData.length, 'routes');
      } else {
        setRoutes([]);
        toast.error('No routes found', { duration: 2000 });
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to fetch routes: ' + error.message, { duration: 2000 });
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  // Fetch customer routes for all orders
  const fetchCustomerRoutes = async (ordersList) => {
    const routes = {};
    for (const order of ordersList) {
      if (order.customer_id && !customerRoutes[order.customer_id]) {
        try {
          const response = await getCustomerRoute(order.customer_id);
          if (response.message === "Route fetched successfully") {
            routes[order.customer_id] = response.route;
          }
        } catch (error) {
          console.error(`Error fetching route for customer ${order.customer_id}:`, error);
          routes[order.customer_id] = 'N/A';
        }
      }
    }
    setCustomerRoutes(prev => ({ ...prev, ...routes }));
  };

  // Define fetchAssignedUsers
  const fetchAssignedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usersData = await getUsers();
      if (usersData && Array.isArray(usersData)) {
        setAssignedUsers(usersData);
      } else {
        setAssignedUsers([]);
        setError("No users found.");
      }
    } catch (fetchError) {
      const errorMessage = fetchError.message || "Failed to fetch users.";
      setError(errorMessage);
      toast.error(errorMessage, { duration: 2000 });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!fromDate && !toDate) {
      toast.error('Please select at least one date');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await getOrdersWithDateRange(fromDate, toDate);
      
      if (response.data) {
        const ordersList = response.data || [];
        setOrders(ordersList);
        setSelectAllChecked(false);
        setSelectedOrderIds([]);
        
        // Fetch customer routes for the new orders
        await fetchCustomerRoutes(ordersList);
        await fetchAssignedUsers();
      } else {
        toast.error('No orders found for the selected date range');
      }
    } catch (error) {
      const errorMessage = error.message || "Failed to fetch orders";
      setError(errorMessage);
      toast.error(errorMessage, { duration: 2000 });
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, fetchAssignedUsers]);

  // Fetch Order Products
  const fetchOrderProducts = useCallback(async (orderId) => {
    try {
      const response = await getOrderProducts(orderId);
      return response;
    } catch (error) {
      console.error("Error fetching order products:", error);
      toast.error("Failed to fetch order details.", { duration: 2000 });
      return [];
    }
  }, []);

  // Number to Words Function
  const numberToWords = (num) => {
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Million", "Billion"];

    if (num === 0) return "Zero Rupees Only";

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    const rupeesToWords = (num) => {
      if (num === 0) return "";
      let numStr = num.toString();
      let words = [];
      let chunkCount = 0;

      while (numStr.length > 0) {
        let chunk = parseInt(numStr.slice(-3)) || 0;
        numStr = numStr.slice(0, -3);

        if (chunk > 0) {
          let chunkWords = [];
          let hundreds = Math.floor(chunk / 100);
          let remainder = chunk % 100;

          if (hundreds > 0) {
            chunkWords.push(`${units[hundreds]} Hundred`);
          }

          if (remainder > 0) {
            if (remainder < 10) {
              chunkWords.push(units[remainder]);
            } else if (remainder < 20) {
              chunkWords.push(teens[remainder - 10]);
            } else {
              let ten = Math.floor(remainder / 10);
              let unit = remainder % 10;
              chunkWords.push(tens[ten] + (unit > 0 ? ` ${units[unit]}` : ""));
            }
          }

          if (chunkCount > 0) {
            chunkWords.push(thousands[chunkCount]);
          }
          words.unshift(chunkWords.join(" "));
        }
        chunkCount++;
      }
      return words.join(" ");
    };

    const paiseToWords = (num) => {
      if (num === 0) return "";
      if (num < 10) return units[num];
      if (num < 20) return teens[num - 10];
      let ten = Math.floor(num / 10);
      let unit = num % 10;
      return tens[ten] + (unit > 0 ? ` ${units[unit]}` : "");
    };

    const rupeesPart = rupeesToWords(rupees);
    const paisePart = paiseToWords(paise);

    let result = "";
    if (rupeesPart) {
      result += `${rupeesPart} Rupees`;
    }
    if (paisePart) {
      result += `${rupeesPart ? " and " : ""}${paisePart} Paise`;
    }
    result += " Only";

    return result.trim() || "Zero Rupees Only";
  };

  // Generate Invoice and Save as PDF
  const generateInvoice = useCallback(
    async (order, downloadOnly = false) => {
      const orderId = order.id;
      const orderProducts = await fetchOrderProducts(orderId);

      const invoiceProducts = orderProducts
        .map((op, index) => {
          // Calculate base price by removing GST from the stored price
          const priceIncludingGst = parseFloat(op.price);
          const gstRate = parseFloat(op.gst_rate || 0);
          
          // Calculate base price (price before GST)
          const basePrice = gstRate > 0 
            ? priceIncludingGst / (1 + (gstRate / 100))
            : priceIncludingGst;

          // Calculate values
          const value = (op.quantity * basePrice);
          const gstAmount = value * (gstRate / 100);

          return {
            serialNumber: index + 1,
            name: op.name,
            hsn_code: op.hsn_code || " ",
            quantity: op.quantity,
            uom: 'Pkts',
            rate: basePrice.toFixed(2),
            value: value.toFixed(2),
            gstRate: gstRate.toFixed(2),
            gstAmount: gstAmount.toFixed(2),
          };
        })
        .filter(Boolean);

      if (invoiceProducts.length === 0) {
        toast.error("Could not generate invoice due to missing product information.", { duration: 2000 });
        return;
      }

      const customer = assignedUsers.find((user) => user.customer_id === order.customer_id) || {
        name: "Unknown",
        phone: "N/A",
        customer_id: "N/A",
        route: "N/A",
      };

      // Calculate totals
      const subTotal = invoiceProducts.reduce((acc, item) => acc + parseFloat(item.value), 0).toFixed(2);
      const totalGstAmount = invoiceProducts.reduce((acc, item) => acc + parseFloat(item.gstAmount), 0).toFixed(2);
      const cgstAmount = (parseFloat(totalGstAmount) / 2).toFixed(2);
      const sgstAmount = (parseFloat(totalGstAmount) / 2).toFixed(2);
      const grandTotal = (parseFloat(subTotal) + parseFloat(totalGstAmount)).toFixed(2);

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${dateStr}-${randomNum}`;
      const totalInWords = numberToWords(parseFloat(grandTotal));

      const htmlContent = `
        <div style="
          font-family: Arial, sans-serif; 
          padding: 20px; 
          width: 800px; 
          margin: 0 auto; 
          font-size: 16px; 
          line-height: 1.4; 
          box-sizing: border-box;
        ">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 32px; margin: 0; font-weight: bold; letter-spacing: 1px;">SL Enterprisses</h1>
            <div style="font-size: 14px; color: #333;">
              <p style="margin: 3px 0;">No. 05, 1st Main, 3rd Cross,</p>
              <p style="margin: 3px 0;">Ramakrishna Reddy Layout,</p>
              <p style="margin: 3px 0;">Behind HP Software,</p>
              <p style="margin: 3px 0;">Mahadevapura Post,</p>
              <p style="margin: 3px 0;">Bangalore - 560048</p>
            </div>
          </div>

          <!-- Invoice and Customer Information in two columns -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="flex: 1;">
              <h3 style="font-size: 18px; margin: 0 0 5px 0; font-weight: bold;">Customer Information</h3>
              <p style="margin: 3px 0; font-weight:bold;">Name: ${customer.name}</p>
              <p style="margin: 3px 0;font-weight:bold;">Phone: ${customer.phone}</p>
              ${customer.delivery_address?.split(',').map(line => 
                `<p style="margin: 3px 0;">${line.trim()}</p>`
              ).join('') || '<p style="margin: 3px 0;">N/A</p>'}
            </div>
            <div style="flex: 1; text-align: right;">
              <p style="font-weight: bold; margin: 3px 0;">Invoice No: ${invoiceNumber}</p>
              <p style="margin: 3px 0;">Order ID: ${orderId}</p>
              <p style="margin: 3px 0;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <!-- Products Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000; border-top: 2px solid #000;">
                <th style="padding: 8px; text-align: left; font-weight: bold;">S.No</th>
                <th style="padding: 8px; text-align: left; font-weight: bold;">Item Name</th>
                <th style="padding: 8px; text-align: left; font-weight: bold;">HSN</th>
                <th style="padding: 8px; text-align: right; font-weight: bold;">Qty</th>
                <th style="padding: 8px; text-align: left; font-weight: bold;">UOM</th>
                <th style="padding: 8px; text-align: right; font-weight: bold;">Rate</th>
                <th style="padding: 8px; text-align: right; font-weight: bold;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceProducts
                .map(
                  (item) => `
                    <tr style="border-bottom: 1px solid #ddd;">
                      <td style="padding: 8px;">${item.serialNumber}</td>
                      <td style="padding: 8px;">${item.name}</td>
                      <td style="padding: 8px;">${item.hsn_code}</td>
                      <td style="padding: 8px; text-align: right;">${item.quantity}</td>
                      <td style="padding: 8px;">${item.uom}</td>
                      <td style="padding: 8px; text-align: right;">₹${item.rate}</td>
                      <td style="padding: 8px; text-align: right;">₹${item.value}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>

          <!-- Total and Certification Section -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <!-- Certification Text on Left -->
            <div style="width: 50%; text-align: left;">
              <div style="margin: 10px 0;">
                <p style="margin: 3px 0;">We hereby certify that its products mentioned in the said</p>
                <p style="margin: 3px 0;">invoices are warranted to be of the nature and quality</p>
                <p style="margin: 3px 0;">which they are purported to be.</p>
                <br>
                <p style="font-style: italic; font-weight: bold ; font-size: 18px; margin: 3px 0;">(${totalInWords})</p>
              </div>
            </div>
            <!-- Total on Right -->
            <div style="width: 40%; text-align: right;">
              <p style="margin: 3px 0; font-weight: bold;">Subtotal: ₹${subTotal}</p>
              <p style="margin: 3px 0;">CGST: ₹${cgstAmount}</p>
              <p style="margin: 3px 0;">SGST: ₹${sgstAmount}</p>
              <p style="font-weight: bold; margin: 3px 0; font-size: 20px;">Total: ₹${grandTotal}</p>
              <br>
              <p style="font-weight: bold; font-size: 20px; margin: 3px 0; text-align:right;">SL Enterprisses</p>
              <br>
              <br>
              <p style="font-weight: bold; font-size: 18px; margin: 3px 0;text-align:right;">Authorized Signatory</p>
            </div>
          </div>
        </div>
      `;

      try {
        if (downloadOnly) {
          // For bulk generation - download PDF directly using html2pdf with exact same styling
          const element = document.createElement('div');
          element.innerHTML = `
            <div style="
              font-family: Arial, sans-serif; 
              padding: 20px; 
              width: 800px; 
              margin: 0 auto; 
              font-size: 16px; 
              line-height: 1.4; 
              box-sizing: border-box;
            ">
              ${htmlContent}
            </div>
          `;
          
          // Create a temporary container
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px';
          tempContainer.style.top = '-9999px';
          tempContainer.style.width = '800px';
          tempContainer.appendChild(element);
          document.body.appendChild(tempContainer);
          
          // Use html2pdf if available, otherwise fallback to print
          if (window.html2pdf) {
            const opt = {
              margin: [0.5, 0.5, 0.5, 0.5],
              filename: `Invoice_${invoiceNumber}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                width: 800,
                height: 1000
              },
              jsPDF: { 
                unit: 'in', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true
              }
            };
            
            window.html2pdf().set(opt).from(element).save().then(() => {
              document.body.removeChild(tempContainer);
            }).catch((error) => {
              console.error('PDF generation error:', error);
              document.body.removeChild(tempContainer);
              // Fallback to print dialog
              const printWindow = window.open('', '_blank');
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Invoice ${invoiceNumber}</title>
                    <style>
                      @media print {
                        body { margin: 0; }
                        @page { margin: 0.5in; }
                      }
                      body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        width: 800px;
                        margin: 0 auto;
                        font-size: 16px;
                        line-height: 1.4;
                        box-sizing: border-box;
                      }
                    </style>
                  </head>
                  <body>
                    ${htmlContent}
                    <script>
                      window.onload = function() {
                        setTimeout(() => {
                          window.print();
                          setTimeout(() => {
                            window.close();
                          }, 1000);
                        }, 500);
                      };
                    </script>
                  </body>
                </html>
              `);
              printWindow.document.close();
            });
          } else {
            // Fallback: create a blob and download
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Invoice ${invoiceNumber}</title>
                  <style>
                    @media print {
                      body { margin: 0; }
                      @page { margin: 0.5in; }
                    }
                    body {
                      font-family: Arial, sans-serif;
                      padding: 20px;
                      width: 800px;
                      margin: 0 auto;
                      font-size: 16px;
                      line-height: 1.4;
                      box-sizing: border-box;
                    }
                  </style>
                </head>
                <body>
                  ${htmlContent}
                  <script>
                    window.onload = function() {
                      setTimeout(() => {
                        window.print();
                        setTimeout(() => {
                          window.close();
                        }, 1000);
                      }, 500);
                    };
                  </script>
                </body>
              </html>
            `);
            printWindow.document.close();
            document.body.removeChild(tempContainer);
          }
        } else {
          // For individual generation - open print dialog
          const printWindow = window.open('', '_blank');
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          
          // Wait for content to load then print
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        }

        // Post to API after PDF generation
        try {
          await postInvoiceToAPI(orderId, invoiceNumber, order.placed_on);
          console.log("Invoice data posted to API successfully");
        } catch (apiError) {
          console.error("Failed to post invoice to API:", apiError);
          // Don't show error to user as invoice was still generated
        }

        if (downloadOnly) {
          toast.success(`Invoice ${invoiceNumber} PDF downloaded!`, { duration: 2000 });
        } else {
          toast.success(`Invoice ${invoiceNumber} generated successfully!`, { duration: 2000 });
        }
      } catch (error) {
        console.error("Error generating invoice:", error);
        toast.error("Failed to generate the invoice.", { duration: 2000 });
      }
    },
    [fetchOrderProducts, assignedUsers]
  );

  // Generate Bulk Invoices
  const generateBulkInvoices = useCallback(async () => {
    let ordersToProcess = [];
    if (selectAllChecked) {
      ordersToProcess = getFilteredOrders();
    } else {
      ordersToProcess = getFilteredOrders().filter(order => selectedOrderIds.includes(order.id));
    }

    if (ordersToProcess.length === 0) {
      toast.error("No orders selected to generate invoices.", { duration: 2000 });
      return;
    }

    setGeneratingInvoice(true);
    try {
      for (const order of ordersToProcess) {
        await generateInvoice(order, true); // Pass true for downloadOnly
        // Add a small delay between invoices to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      toast.success(`${ordersToProcess.length} PDF invoices downloaded!`, { duration: 2000 });
    } catch (error) {
      console.error("Error generating bulk invoices:", error);
      toast.error("Failed to generate all invoices.", { duration: 2000 });
    } finally {
      setGeneratingInvoice(false);
    }
  }, [getFilteredOrders, selectedOrderIds, selectAllChecked, generateInvoice]);

  // Handle Order Checkbox Change
  const handleOrderCheckboxChange = useCallback((orderId) => {
    setSelectedOrderIds(prevSelected =>
      prevSelected.includes(orderId)
        ? prevSelected.filter(id => id !== orderId)
        : [...prevSelected, orderId]
    );
  }, []);

  // Handle Select All Checkbox Change
  const handleSelectAllCheckboxChange = useCallback(() => {
    setSelectAllChecked(prev => !prev);
    setSelectedOrderIds([]);
  }, []);

  // Initial Fetch on Component Mount
  useEffect(() => {
    fetchOrders();
    fetchRoutes();
  }, [fetchOrders, fetchRoutes]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="order-management-container">
      <div className="loading-slip-header">
        <h1>Invoice Generation</h1>
        <div className="filter-controls">
          <div className="date-filters">
            <div className="filter-group">
              <label>From Date:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>To Date:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Order Type:</label>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="AM">AM</option>
                <option value="PM + Evening">PM + Evening</option>
              </select>
            </div>
          </div>
          <div className="route-filter-section">
            <div className="filter-group">
              <label>Route Filter:</label>
              <select
                value={selectedRoute}
                onChange={(e) => {
                  setSelectedRoute(e.target.value);
                  if (e.target.value) {
                    setSelectedRoutes([e.target.value]);
                  } else {
                    setSelectedRoutes([]);
                  }
                }}
                disabled={routesLoading}
              >
                <option value="">All Routes</option>
                {routesLoading ? (
                  <option value="" disabled>Loading routes...</option>
                ) : routes.length === 0 ? (
                  <option value="" disabled>No routes available</option>
                ) : (
                  routes.map((route) => (
                    <option key={route.id} value={route.name}>
                      {route.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {orders.length > 0 && (
        <div className="bulk-actions-container mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectAllChecked ? getFilteredOrders().length : selectedOrderIds.length} order(s) selected
              </span>
              <button
                onClick={handleSelectAllCheckboxChange}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {selectAllChecked ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={generateBulkInvoices}
                disabled={generatingInvoice || (selectAllChecked ? false : selectedOrderIds.length === 0)}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
              >
                {generatingInvoice ? 'Downloading...' : `Download Selected Invoices (${selectAllChecked ? getFilteredOrders().length : selectedOrderIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading orders...</div>
      ) : (
        <div className="orders-table-container">
          {orders.length > 0 ? (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectAllChecked}
                      onChange={handleSelectAllCheckboxChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Customer ID</th>
                  <th>Customer Route</th>
                  <th>Total Amount</th>
                  <th>Order Type</th>
                  <th>Placed On</th>
                  <th>Cancelled</th>
                  <th>Approve Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredOrders().map((order) => (
                  <tr key={order.id} className="order-row">
                    <td>
                      {!selectAllChecked && (
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => handleOrderCheckboxChange(order.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      )}
                    </td>
                    <td className="font-semibold">#{order.id}</td>
                    <td>{order.customer_id || 'N/A'}</td>
                    <td>{customerRoutes[order.customer_id] || 'Loading...'}</td>
                    <td className="font-semibold text-green-600">
                      {formatAmount(order.total_amount)}
                    </td>
                    <td>
                      <span className={`order-type-badge ${
                        order.order_type === 'AM' ? 'order-type-am' : 'order-type-pm'
                      }`}>
                        {order.order_type || 'N/A'}
                      </span>
                    </td>
                    <td>{formatDate(order.placed_on)}</td>
                    <td>
                      <span className={`status-indicator ${
                        order.cancelled === 'Yes' ? 'status-yes' : 'status-no'
                      }`}>
                        {order.cancelled || 'No'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge accepted">
                        {order.approve_status || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => generateInvoice(order)}
                        disabled={generatingInvoice}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Print Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-orders">
              {orders.length === 0 ? 'No orders found for the selected date range.' : 'No orders match the selected filters. Try changing the filters above.'}
            </div>
          )}
        </div>
      )}

      {generatingInvoice && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner-large"></div>
            <p>Generating Invoices...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
