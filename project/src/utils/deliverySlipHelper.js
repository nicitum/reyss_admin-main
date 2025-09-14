import * as XLSX from 'xlsx';

/**
 * Helper functions for Delivery Slip operations
 */

/**
 * Create delivery slip data for Excel for a specific route
 * @param {Array} ordersForRoute - Array of orders for a specific route
 * @param {string} routeName - Name of the route
 * @returns {Object} - Object containing delivery slip data and customer information
 */
export const createDeliverySlipDataForRoute = async (ordersForRoute, routeName = 'Unknown') => {
  const orderMap = new Map();
  const allProducts = new Set();
  const unitRegex = /(\d+\.?\d*)\s*(ML|LTR|KG|GRMS|G|GM|ML)/i;

  // Process each order's products
  for (const order of ordersForRoute) {
    try {
      // Fetch order products
      const response = await fetch(`http://82.112.226.135:8090/order-products?orderId=${order.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch products for order ID ${order.id}. Status: ${response.status}`);
        continue;
      }
      
      const productsData = await response.json();
      
      // Initialize order data
      orderMap.set(order.customer_id, {
        name: order.customer_name || `Customer ${order.customer_id}`,
        orderId: order.id,
        products: [],
        route: routeName,
        productCrates: {}
      });

      productsData.forEach(product => {
        // Extract quantity and unit
        const match = product.name.match(unitRegex);
        let quantityValue = match ? parseFloat(match[1]) : 1;
        let unit = match ? match[2].toLowerCase() : 'unit';
        
        if (unit === 'grms' || unit === 'g' || unit === 'gm') unit = 'gm';
        else if (unit === 'ltr') unit = 'ltr';
        else if (unit === 'kg') unit = 'kg';
        else if (unit === 'ml') unit = 'ml';

        // Calculate base unit quantity
        let baseUnitQuantity = 0;
        if (unit === 'ml') baseUnitQuantity = (quantityValue * product.quantity) / 1000;
        else if (unit === 'gm') baseUnitQuantity = (quantityValue * product.quantity) / 1000;
        else if (unit === 'ltr') baseUnitQuantity = quantityValue * product.quantity;
        else if (unit === 'kg') baseUnitQuantity = quantityValue * product.quantity;
        else baseUnitQuantity = product.quantity;

        // Calculate crates
        const crates = Math.floor(baseUnitQuantity / 12);
        
        const orderData = orderMap.get(order.customer_id);
        orderData.products.push(product);
        orderData.productCrates[product.name] = crates;
        allProducts.add(product.name);
      });
    } catch (fetchError) {
      console.error("Error fetching order products:", fetchError);
    }
  }

  const productList = Array.from(allProducts);
  const customerNames = Array.from(orderMap.values()).map(order => order.name);
  
  // Prepare Excel data with vertical headers
  const excelData = [
    ["Delivery Slip"],
    [`Route: ${routeName}`],
    [], // Empty row for spacing
    ["Items", ...customerNames, "Total Crates"]
  ];

  // Add product rows with quantities and crate calculations
  productList.forEach(productName => {
    const productRow = [productName];
    let totalCratesForProduct = 0;
    
    orderMap.forEach((orderData, customerId) => {
      const quantity = orderData.products.find(p => p.name === productName)?.quantity || 0;
      productRow.push(quantity);
      
      // Add to crate total
      totalCratesForProduct += orderData.productCrates[productName] || 0;
    });
    
    productRow.push(totalCratesForProduct);
    excelData.push(productRow);
  });

  // Add totals row
  const totalsRow = ["Totals"];
  let grandTotalQuantity = 0;
  let grandTotalCrates = 0;
  
  orderMap.forEach((orderData) => {
    const customerTotal = orderData.products.reduce((sum, product) => sum + product.quantity, 0);
    totalsRow.push(customerTotal);
    grandTotalQuantity += customerTotal;
  });
  
  grandTotalCrates = Array.from(orderMap.values()).reduce((total, orderData) => {
    return total + Object.values(orderData.productCrates).reduce((sum, crates) => sum + crates, 0);
  }, 0);
  
  totalsRow.push(grandTotalCrates);
  excelData.push(totalsRow);

  // Add customer ID row
  const customerIdRow = ["Customer ID", ...Array.from(orderMap.keys()), ""];
  excelData.push(customerIdRow);

  return {
    excelData,
    customerNames,
    deliveryData: excelData.slice(3), // Data without headers
    productList,
    orderMap
  };
};

/**
 * Generate Excel report for delivery slip
 * @param {Object} deliverySlipData - Delivery slip data from createDeliverySlipDataForRoute
 * @param {string} reportType - Type of report (e.g., 'Delivery Slip')
 * @param {string} routeName - Name of the route
 * @param {boolean} downloadOnly - Whether to download the file (default: true)
 * @returns {Object} - Excel data for display or download
 */
export const generateDeliveryExcelReport = async (deliverySlipData, reportType, routeName = '', downloadOnly = true) => {
  if (!deliverySlipData || !deliverySlipData.excelData) {
    throw new Error("No delivery slip data available to generate report.");
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(deliverySlipData.excelData);
  
  // Add styling for column headers (rotate vertically)
  if (!ws['!cols']) ws['!cols'] = [];
  
  // Set column widths
  ws['!cols'][0] = { wch: 30 }; // First column (Items) width
  
  // Set width and rotation for customer name columns
  for (let i = 1; i < deliverySlipData.excelData[3].length; i++) {
    ws['!cols'][i] = { wch: 10 }; // Set column width
    
    // Get cell reference for header (row 3 is headers)
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
    
    // If cell doesn't exist in the sheet, skip
    if (!ws[cellRef]) continue;
    
    // Apply vertical text rotation (90 degrees) and center alignment
    ws[cellRef].s = {
      alignment: {
        vertical: 'center',
        horizontal: 'center',
        textRotation: 90 // 90 degrees rotation (vertical text)
      },
      font: {
        bold: true
      }
    };
  }
  
  // Apply similar styling to the "Items" header
  const itemsHeaderRef = XLSX.utils.encode_cell({ r: 3, c: 0 });
  if (ws[itemsHeaderRef]) {
    ws[itemsHeaderRef].s = {
      alignment: {
        vertical: 'center',
        horizontal: 'center'
      },
      font: {
        bold: true
      }
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, `${reportType}`);

  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const base64Workbook = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const filename = `${reportType.replace(/\s/g, '')}-Route-${routeName}.xlsx`;
  const mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (downloadOnly) {
    // For web, download the file
    const blob = new Blob([wbout], { type: mimetype });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Return data for display
  return {
    filename,
    wbout: wbout, // Array buffer for download
    base64: base64Workbook,
    deliveryData: deliverySlipData.deliveryData,
    customerNames: deliverySlipData.customerNames,
    productList: deliverySlipData.productList,
    orderMap: deliverySlipData.orderMap
  };
};

/**
 * Group orders by route
 * @param {Array} orders - Array of orders
 * @param {Object} customerRoutes - Object mapping customer IDs to routes
 * @returns {Map} - Map of route names to orders
 */
export const groupOrdersByRoute = (orders, customerRoutes) => {
  const routesMap = new Map();
  orders.forEach(order => {
    const route = customerRoutes[order.customer_id] || 'Unrouted';
    if (!routesMap.has(route)) {
      routesMap.set(route, []);
    }
    routesMap.get(route).push(order);
  });
  return routesMap;
};

/**
 * Filter orders by selected routes
 * @param {Array} orders - Array of all orders
 * @param {string|Array} selectedRoutes - Selected route(s) - can be string or array
 * @param {Object} customerRoutes - Object mapping customer IDs to routes
 * @param {Array} routes - Array of all available routes
 * @returns {Array} - Filtered orders
 */
export const filterOrdersByRoutes = (orders, selectedRoutes, customerRoutes, routes) => {
  if (!selectedRoutes || (Array.isArray(selectedRoutes) && selectedRoutes.length === 0)) {
    return orders;
  }

  // Convert single route to array for consistent processing
  const routesToFilter = Array.isArray(selectedRoutes) ? selectedRoutes : [selectedRoutes];
  
  return orders.filter(order => {
    const customerRoute = customerRoutes[order.customer_id];
    
    return routesToFilter.some(selectedRoute => {
      // Try exact match first
      if (customerRoute === selectedRoute) {
        return true;
      }
      
      // Try case-insensitive match
      if (customerRoute && selectedRoute && customerRoute.toLowerCase() === selectedRoute.toLowerCase()) {
        return true;
      }
      
      // Try to find route by name and match with customer route
      const routeObj = routes.find(r => r.name === selectedRoute);
      if (routeObj && customerRoute === routeObj.id.toString()) {
        return true;
      }
      
      // Try to match customer route with route name
      if (routeObj && customerRoute === routeObj.name) {
        return true;
      }
      
      return false;
    });
  });
};

/**
 * Format vertical header text for Excel display
 * @param {string} text - Text to format
 * @returns {string} - Formatted text with newlines
 */
export const formatVerticalHeader = (text) => {
  // Split into words (preserving the space between first/last name)
  const words = text.split(' ');
  
  // Process each word to join letters with newlines
  // Add double newline between words to create visual space
  return words.map(word => word.split('').join('\n')).join('\n \n');
};

/**
 * Update delivery slip status for orders
 * @param {Array} orders - Array of orders to update
 * @returns {Promise} - Promise that resolves when all updates are complete
 */
export const updateDeliverySlipStatus = async (orders) => {
  const updatePromises = orders.map(async (order) => {
    try {
      const response = await fetch(`http://82.112.226.135:8090/update-delivery-slip-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: order.id })
      });

      if (!response.ok) {
        console.error(`Failed to update delivery slip status for order ${order.id}. Status: ${response.status}`);
        throw new Error(`Failed to update delivery slip status for order ${order.id}`);
      }

      const responseData = await response.json();
      console.log(`Delivery slip status updated for order ${order.id}:`, responseData.message);
      return { success: true, orderId: order.id };
    } catch (error) {
      console.error("Error updating delivery slip status:", error);
      return { success: false, orderId: order.id, error: error.message };
    }
  });

  return Promise.all(updatePromises);
};
