import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getBrandReport, getUniqueBrands } from '../services/api';
import { downloadBrandReportPDF, viewBrandReportPDF } from '../utils/brandReportHelper';
import './OrderManagement.css';

const BrandWiseReport = () => {
    const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orderType, setOrderType] = useState('AM');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brands, setBrands] = useState([]);
  const [productReport, setProductReport] = useState(null);
  const [summary, setSummary] = useState({
    total_orders: 0,
    total_products: 0,
    total_amount: 0
  });

  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await getUniqueBrands();
        if (response.success) {
          setBrands(response.data.brands);
          // Set first brand as default
          if (response.data.brands.length > 0) {
            setSelectedBrand(response.data.brands[0]);
          }
        } else {
          toast.error('Failed to fetch brands');
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast.error('Failed to fetch brands');
      }
    };
    
    fetchBrands();
  }, []);

  // Set default date range to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
  }, []);

  // Fetch initial orders when brands are loaded
  useEffect(() => {
    if (brands.length > 0 && selectedBrand && fromDate && toDate) {
      const fetchInitialOrders = async () => {
        try {
          setLoading(true);
          const response = await getBrandReport(fromDate, toDate, 'AM', selectedBrand);
        
          if (response.success) {
            const ordersData = response.data.orders || [];
            
            // Products are already included in the API response
            console.log('Orders with products from API:', ordersData);
            setOrders(ordersData);
            setSummary(response.data.summary || {});
            
            // Process product report
            if (ordersData.length > 0) {
              const report = processProductReport(ordersData);
              setProductReport(report);
            } else {
              setProductReport(null);
            }
            
            if (ordersData.length === 0) {
              toast.info('No AM orders found for today');
            }
          } else {
            toast.error('Failed to fetch today\'s AM orders');
            setProductReport(null);
          }
        } catch (error) {
          toast.error('Failed to fetch today\'s AM orders. Please try again.');
          console.error('Error fetching today\'s AM orders:', error);
          setProductReport(null);
        } finally {
          setLoading(false);
        }
      };

      fetchInitialOrders();
    }
  }, [brands, selectedBrand, fromDate, toDate]);

  // Auto-fetch orders when date range, order type, or brand changes (but not on initial load)
  useEffect(() => {
    if (fromDate && toDate && orderType && selectedBrand && selectedBrand !== '') {
      fetchOrders();
    }
  }, [fromDate, toDate, orderType, selectedBrand]);

  const fetchOrders = async () => {
    if (!fromDate || !toDate || !orderType || !selectedBrand) {
      return;
    }

    try {
      setLoading(true);
      // Clear existing orders immediately when starting new fetch
      setOrders([]);
      setSummary({
        total_orders: 0,
        total_products: 0,
        total_amount: 0
      });
      setProductReport(null);
      
      console.log('Fetching orders with:', { fromDate, toDate, orderType, selectedBrand });
      let response;
      
      if (orderType === 'Evening') {
        // For Evening, use the new API format that handles PM + Evening in one call
        console.log('Fetching Evening orders (PM + Evening)');
        response = await getBrandReport(fromDate, toDate, 'PM + Evening', selectedBrand);
        console.log('API Response:', response);
      } else {
        console.log(`Fetching ${orderType} orders`);
        response = await getBrandReport(fromDate, toDate, orderType, selectedBrand);
        console.log('API Response:', response);
      }
      
      if (response.success) {
        const ordersData = response.data.orders || [];
        console.log('Full API response data:', response.data);
        console.log('Orders data:', ordersData);
        console.log('Summary:', response.data.summary);
        console.log('Total products from API:', response.data.summary.total_products);
        
        // Products are already included in the API response, no need to fetch separately
        console.log('Orders with products from API:', ordersData);
        setOrders(ordersData);
        setSummary(response.data.summary || {});
        
        // Process product report
        if (ordersData.length > 0) {
          console.log('Processing product report with orders:', ordersData);
          
          // Check if any orders have products
          const hasProducts = ordersData.some(order => order.products && order.products.length > 0);
          console.log('Has products:', hasProducts);
          
          if (hasProducts) {
            const report = processProductReport(ordersData);
            console.log('Processed report:', report);
            setProductReport(report);
            console.log('productReport state set to:', report);
          } else {
            console.log('No products found in orders, setting productReport to null');
            setProductReport(null);
          }
        } else {
          setProductReport(null);
        }
        
        console.log('Orders set:', ordersData.length);
        
        if (ordersData.length === 0) {
          toast.info(`No ${orderType} orders found for the selected date range`);
        } else if (response.data.summary.total_products === 0) {
          toast.info(`Found ${ordersData.length} ${orderType} orders but no products from ${selectedBrand} brand`);
        } else {
          toast.success(`Found ${ordersData.length} ${orderType} orders with ${response.data.summary.total_products} products from ${selectedBrand} brand`);
        }
      } else {
        toast.error(response.message || 'Failed to fetch brand report');
        // Clear orders on error too
        setOrders([]);
        setSummary({
          total_orders: 0,
          total_products: 0,
          total_amount: 0
        });
        setProductReport(null);
      }
    } catch (error) {
      toast.error('Failed to fetch brand report. Please try again.');
      console.error('Error fetching brand report:', error);
      // Clear orders on error
      setOrders([]);
      setSummary({
        total_orders: 0,
        total_products: 0,
        total_amount: 0
      });
      setProductReport(null);
    } finally {
      setLoading(false);
    }
  };

  // PDF Functions
  const handleDownloadPDF = () => {
    if (!productReport) {
      toast.error('No report data available for PDF generation');
      return;
    }
    
    const reportInfo = {
      fromDate,
      toDate,
      orderType,
      brand: selectedBrand,
      totalOrders: orders.length
    };
    
    try {
      downloadBrandReportPDF(productReport, reportInfo);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleViewPDF = () => {
    if (!productReport) {
      toast.error('No report data available for PDF generation');
      return;
    }
    
    const reportInfo = {
      fromDate,
      toDate,
      orderType,
      brand: selectedBrand,
      totalOrders: orders.length
    };
    
    try {
      viewBrandReportPDF(productReport, reportInfo);
      toast.success('PDF opened in new tab');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Process orders to create product report similar to loading slip
  const processProductReport = (ordersData) => {
    console.log('processProductReport called with:', ordersData);
    const consolidatedProducts = new Map();
    const unitRegex = /(\d+\.?\d*)\s*(ML|LTR|KG|GRMS|G|GM|ML)/i;

    // Process each order's products
    ordersData.forEach(order => {
      console.log('Processing order:', order);
      if (order.products && Array.isArray(order.products)) {
        console.log('Order products:', order.products);
        order.products.forEach(product => {
          console.log('Processing product:', product);
          console.log('Product fields:', Object.keys(product));
          console.log('Product name:', product.product_name || product.name);
          console.log('Product quantity:', product.quantity);
          console.log('Product category:', product.category);
          
          // Use product_name from API response, fallback to name
          const productName = product.product_name || product.name;
          
          // Extract quantity and unit from product name
          const match = productName ? productName.match(unitRegex) : null;
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

          // Calculate crates (assuming 12 units per crate)
          const crates = Math.floor(baseUnitQuantity / 12);

          // Consolidate product data
          const currentProductInfo = consolidatedProducts.get(productName);
          if (currentProductInfo) {
            consolidatedProducts.set(productName, {
              totalQuantity: currentProductInfo.totalQuantity + product.quantity,
              category: currentProductInfo.category,
              brand: product.brand || 'Unknown',
              totalBaseUnitQuantity: currentProductInfo.totalBaseUnitQuantity + baseUnitQuantity,
              totalCrates: currentProductInfo.totalCrates + crates,
              totalPackets: currentProductInfo.totalPackets + product.quantity,
            });
          } else {
            consolidatedProducts.set(productName, {
              totalQuantity: product.quantity,
              category: product.category || 'Unknown',
              brand: product.brand || 'Unknown',
              totalBaseUnitQuantity: baseUnitQuantity,
              totalCrates: crates,
              totalPackets: product.quantity,
            });
          }
        });
      }
    });

    // Convert to array and sort by category
    const productList = Array.from(consolidatedProducts.entries()).map(([productName, productInfo]) => ({
      name: productName,
      quantity: productInfo.totalQuantity,
      category: productInfo.category,
      brand: productInfo.brand,
      baseUnitQuantity: productInfo.totalBaseUnitQuantity,
      crates: productInfo.totalCrates,
      packets: productInfo.totalPackets
    }));

    // Calculate totals
    const totalCrates = productList.reduce((sum, product) => sum + product.crates, 0);
    const totalLiters = productList.reduce((sum, product) => sum + product.baseUnitQuantity, 0);
    const totalPackets = productList.reduce((sum, product) => sum + product.packets, 0);

    // Group by category for totals
    const milkProducts = productList.filter(p => p.category.toLowerCase().includes('milk') || p.name.toLowerCase().includes('milk'));
    const curdProducts = productList.filter(p => p.category.toLowerCase().includes('curd') || p.name.toLowerCase().includes('curd'));

    const milkTotals = {
      crates: milkProducts.reduce((sum, p) => sum + p.crates, 0),
      liters: milkProducts.reduce((sum, p) => sum + p.baseUnitQuantity, 0),
      packets: milkProducts.reduce((sum, p) => sum + p.packets, 0)
    };

    const curdTotals = {
      crates: curdProducts.reduce((sum, p) => sum + p.crates, 0),
      liters: curdProducts.reduce((sum, p) => sum + p.baseUnitQuantity, 0),
      packets: curdProducts.reduce((sum, p) => sum + p.packets, 0)
    };

    const result = {
      productList,
      totals: {
        totalCrates,
        totalLiters,
        totalPackets
      },
      milkTotals,
      curdTotals
    };
    
    console.log('processProductReport result:', result);
    return result;
  };

        return (
    <div className="order-management-container">
      <div className="order-management-header">
        <h1>Brand Wise Report</h1>
        <div className="filter-controls">
          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="filter-group">
            <label>To Date:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="filter-group">
            <label>Order Type:</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="AM">AM Orders</option>
              <option value="Evening">Evening Orders (PM + Evening)</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Brand:</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Brand</option>
              {brands.map((brand, index) => (
                <option key={index} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {loading ? (
        <div className="loading-spinner">Loading {orderType} orders...</div>
      ) : (
        <div className="brand-report-container">
          {console.log('Rendering - productReport:', productReport)}
          {productReport ? (
            <div className="product-report">
              {/* Header */}
              <div className="report-header">
                <div className="report-title-section">
                  <h2>Brand Wise Report</h2>
                  <div className="pdf-buttons">
                    <button 
                      onClick={handleViewPDF}
                      className="pdf-btn view-btn"
                      title="View PDF in new tab"
                    >
                      📄 View PDF
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      className="pdf-btn download-btn"
                      title="Download PDF"
                    >
                      💾 Download PDF
                    </button>
                  </div>
                </div>
                <div className="report-info">
                  <p><strong>Date:</strong> {fromDate} to {toDate}</p>
                  <p><strong>Order Type:</strong> {orderType}</p>
                  <p><strong>Brand:</strong> {selectedBrand}</p>
                  <p><strong>Total Orders:</strong> {orders.length}</p>
                </div>
              </div>

              {/* Products Table */}
              <div className="products-table-container">
                <table className="products-report-table">
                  <thead>
                    <tr className="table-header">
                      <th>SL NO</th>
                      <th>Particulars</th>
                      <th>Total Crates</th>
                      <th>Total Milk Ltr</th>
                      <th>Total Packets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Milk Products */}
                    {productReport.productList
                      .filter(product => 
                        product.category.toLowerCase().includes('milk') || 
                        product.name.toLowerCase().includes('milk')
                      )
                      .map((product, index) => (
                        <tr key={`milk-${index}`} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                          <td className="sl-no">{productReport.productList.findIndex(p => p.name === product.name) + 1}</td>
                          <td className="particulars">{product.name}</td>
                          <td className="crates">{product.crates.toFixed(2)}</td>
                          <td className="liters">{product.baseUnitQuantity.toFixed(2)}</td>
                          <td className="packets">{product.packets.toFixed(0)}</td>
                        </tr>
                      ))}
                    
                    {/* Milk Totals */}
                    <tr className="total-row milk-total">
                      <td colSpan="2"><strong>TOTAL MILK</strong></td>
                      <td><strong>{productReport.milkTotals.crates.toFixed(2)}</strong></td>
                      <td><strong>{productReport.milkTotals.liters.toFixed(2)}</strong></td>
                      <td><strong>{productReport.milkTotals.packets.toFixed(0)}</strong></td>
                    </tr>
                    
                    {/* Separator Bar */}
                    <tr className="separator-row">
                      <td colSpan="5" className="separator-cell">
                        <div className="separator-line"></div>
                      </td>
                    </tr>
                    
                    {/* Curd Products */}
                    {productReport.productList
                      .filter(product => 
                        product.category.toLowerCase().includes('curd') || 
                        product.name.toLowerCase().includes('curd')
                      )
                      .map((product, index) => (
                        <tr key={`curd-${index}`} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                          <td className="sl-no">{productReport.productList.findIndex(p => p.name === product.name) + 1}</td>
                          <td className="particulars">{product.name}</td>
                          <td className="crates">{product.crates.toFixed(2)}</td>
                          <td className="liters">{product.baseUnitQuantity.toFixed(2)}</td>
                          <td className="packets">{product.packets.toFixed(0)}</td>
                        </tr>
                      ))}
                    
                    {/* Curd Totals */}
                    <tr className="total-row curd-total">
                      <td colSpan="2"><strong>TOTAL CURD</strong></td>
                      <td><strong>{productReport.curdTotals.crates.toFixed(2)}</strong></td>
                      <td><strong>{productReport.curdTotals.liters.toFixed(2)}</strong></td>
                      <td><strong>{productReport.curdTotals.packets.toFixed(0)}</strong></td>
                    </tr>
                    
                    {/* Grand Total */}
                    <tr className="grand-total-row">
                      <td colSpan="2"><strong>G.TOTAL (Crates & Ltr)</strong></td>
                      <td><strong>{productReport.totals.totalCrates.toFixed(2)}</strong></td>
                      <td><strong>{productReport.totals.totalLiters.toFixed(2)}</strong></td>
                      <td><strong>{productReport.totals.totalPackets.toFixed(0)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-orders">
              {orders.length === 0 ? 
                'No orders found for the selected date range' : 
                `Found ${orders.length} ${orderType} orders but no products from ${selectedBrand} brand for the selected date range`
              }
            </div>
          )}
        </div>
      )}
        </div>
    );
};

export default BrandWiseReport;
