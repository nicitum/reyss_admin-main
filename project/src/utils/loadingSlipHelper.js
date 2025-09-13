import * as XLSX from 'xlsx';

/**
 * Helper functions for Loading Slip operations
 */

/**
 * Process orders and create consolidated product data for a specific route
 * @param {Array} ordersForRoute - Array of orders for a specific route
 * @returns {Object} - Object containing productList and brandTotals
 */
export const createLoadingSlipDataForRoute = async (ordersForRoute) => {
  const consolidatedProducts = new Map();
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
      
      productsData.forEach(product => {
        // Extract quantity and unit
        const match = product.name.match(unitRegex);
        let quantityValue = 0;
        let unit = '';

        if (match) {
          quantityValue = parseFloat(match[1]);
          unit = match[2].toLowerCase();
          if (unit === 'grms' || unit === 'g' || unit === 'gm') unit = 'gm';
          else if (unit === 'ltr') unit = 'ltr';
          else if (unit === 'kg') unit = 'kg';
          else if (unit === 'ml') unit = 'ml';
        } else {
          quantityValue = 1;
          unit = 'unit';
        }

        // Calculate base unit quantity
        let baseUnitQuantity = 0;
        if (unit === 'ml') baseUnitQuantity = (quantityValue * product.quantity) / 1000;
        else if (unit === 'gm') baseUnitQuantity = (quantityValue * product.quantity) / 1000;
        else if (unit === 'ltr') baseUnitQuantity = quantityValue * product.quantity;
        else if (unit === 'kg') baseUnitQuantity = quantityValue * product.quantity;
        else baseUnitQuantity = product.quantity;

        // Calculate crates
        const crates = Math.floor(baseUnitQuantity / 12);

        // Consolidate product data
        const currentProductInfo = consolidatedProducts.get(product.name);
        if (currentProductInfo) {
          consolidatedProducts.set(product.name, {
            totalQuantity: currentProductInfo.totalQuantity + product.quantity,
            category: currentProductInfo.category,
            totalBaseUnitQuantity: currentProductInfo.totalBaseUnitQuantity + baseUnitQuantity,
            totalCrates: currentProductInfo.totalCrates + crates,
          });
        } else {
          consolidatedProducts.set(product.name, {
            totalQuantity: product.quantity,
            category: product.category || 'Unknown',
            totalBaseUnitQuantity: baseUnitQuantity,
            totalCrates: crates,
          });
        }
      });
    } catch (fetchError) {
      console.error("Error fetching order products:", fetchError);
    }
  }

  // Prepare product list for Excel
  const productListForExcel = Array.from(consolidatedProducts.entries()).map(([productName, productInfo]) => ({
    name: productName,
    quantity: productInfo.totalQuantity,
    category: productInfo.category,
    baseUnitQuantity: productInfo.totalBaseUnitQuantity.toFixed(2),
    crates: productInfo.totalCrates
  }));

  // Calculate brand-wise total crates
  const brandTotalsMap = new Map();
  for (const [productName, productInfo] of consolidatedProducts.entries()) {
    const brand = productName.split(' ')[0].toUpperCase(); // Extract brand as first word
    const currentTotal = brandTotalsMap.get(brand) || 0;
    brandTotalsMap.set(brand, currentTotal + productInfo.totalCrates);
  }
  const brandTotals = Array.from(brandTotalsMap, ([brand, totalCrates]) => ({ brand, totalCrates }));

  // Return both product list and brand totals
  return {
    productList: productListForExcel,
    brandTotals: brandTotals
  };
};

/**
 * Generate Excel report for loading slip
 * @param {Object} productsData - Product data from createLoadingSlipDataForRoute
 * @param {string} reportType - Type of report (e.g., 'Loading Slip')
 * @param {string} routeName - Name of the route
 * @param {boolean} download - Whether to download the file (default: true)
 * @returns {Object} - Excel data for display or download
 */
export const generateExcelReport = async (productsData, reportType, routeName = '', download = true) => {
  if (!productsData || (Array.isArray(productsData) && productsData.length === 0) || (typeof productsData === 'object' && productsData.productList.length === 0)) {
    throw new Error("No products to include in the loading slip.");
  }

  const wb = XLSX.utils.book_new();
  let wsData;
  let filename;

  if (reportType === 'Loading Slip') {
    const { productList, brandTotals } = productsData;
    let totalQuantity = 0;
    let totalBaseUnitQuantity = 0;
    let totalCrates = 0;

    productList.forEach(product => {
      totalQuantity += product.quantity;
      totalBaseUnitQuantity += parseFloat(product.baseUnitQuantity);
      totalCrates += product.crates;
    });

    wsData = [
      [`${reportType} - Route ${routeName}`],
      [],
      ["Products", "Quantity in base units (eaches)", "Quantity in base units (kgs/lts)", "Crates"],
      ...productList.map(product => [
        product.name,
        product.quantity,
        product.baseUnitQuantity,
        product.crates
      ]),
      ["Totals", totalQuantity.toFixed(2), totalBaseUnitQuantity.toFixed(2), totalCrates],
      [], // Add some space
      ["Brand", "Total Crates"],
      ...brandTotals.map(brandTotal => [brandTotal.brand, brandTotal.totalCrates])
    ];
    filename = `${reportType.replace(/\s/g, '')}-Route-${routeName}.xlsx`;
  } else {
    // Keep the existing logic for other report types if needed
    let totalQuantity = 0;
    let totalBaseUnitQuantity = 0;
    let totalCrates = 0;

    productsData.forEach(product => {
      totalQuantity += product.quantity;
      totalBaseUnitQuantity += parseFloat(product.baseUnitQuantity);
      totalCrates += product.crates;
    });

    wsData = [
      [`${reportType} - Route ${routeName}`],
      [],
      ["Products", "Quantity in base units (eaches)", "Quantity in base units (kgs/lts)", "Crates"],
      ...productsData.map(product => [
        product.name,
        product.quantity,
        product.baseUnitQuantity,
        product.crates
      ]),
      ["Totals", totalQuantity.toFixed(2), totalBaseUnitQuantity.toFixed(2), totalCrates]
    ];
    filename = `${reportType.replace(/\s/g, '')}-Route-${routeName}.xlsx`;
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, `${reportType} Data`);

  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const base64Workbook = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (download) {
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
    data: wsData,
    wbout: wbout, // Array buffer for download
    base64: base64Workbook,
    productList: productsData.productList || productsData,
    brandTotals: productsData.brandTotals || []
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
 * Update loading slip status for orders
 * @param {Array} orders - Array of orders to update
 * @returns {Promise} - Promise that resolves when all updates are complete
 */
export const updateLoadingSlipStatus = async (orders) => {
  const updatePromises = orders.map(async (order) => {
    try {
      const response = await fetch(`http://82.112.226.135:8090/update-loading-slip-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: order.id })
      });

      if (!response.ok) {
        console.error(`Failed to update loading slip status for order ${order.id}. Status: ${response.status}`);
        throw new Error(`Failed to update loading slip status for order ${order.id}`);
      }

      const responseData = await response.json();
      console.log(`Loading slip status updated for order ${order.id}:`, responseData.message);
      return { success: true, orderId: order.id };
    } catch (error) {
      console.error("Error updating loading slip status:", error);
      return { success: false, orderId: order.id, error: error.message };
    }
  });

  return Promise.all(updatePromises);
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
