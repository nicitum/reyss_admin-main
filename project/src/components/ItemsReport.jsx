import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter,
  FileText,
  Download,
  Calendar,
  Package,
  MapPin,
  CheckSquare,
  Square
} from "lucide-react";
import { getItemReport, getRoutes } from "../services/api";
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx'; // Added XLSX for Excel export

export default function ItemsReport() {
  const [reportData, setReportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedRoutes, setSelectedRoutes] = useState([]); // Changed from single route to array
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    // Set default date range to today
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    
    setFromDate(formattedToday);
    setToDate(formattedToday);
  }, []);

  useEffect(() => {
    // Fetch all routes for the dropdown
    const fetchRoutes = async () => {
      try {
        setRoutesLoading(true);
        const routeData = await getRoutes();
        // Check if routeData is an array and has data
        if (Array.isArray(routeData) && routeData.length > 0) {
          setRoutes(routeData);
        } else {
          setRoutes([]);
        }
      } catch (error) {
        console.error("Failed to fetch routes:", error);
        toast.error("Failed to fetch routes");
        setRoutes([]);
      } finally {
        setRoutesLoading(false);
      }
    };
    
    fetchRoutes();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      // Only fetch if both dates are set
      if (!fromDate || !toDate) return;
      
      try {
        setLoading(true);
        // Updated API call to use from_date, to_date, and routes parameters
        // If no routes selected, pass null to get all routes
        // If routes selected, join them with commas for the API
        const routeParam = selectedRoutes.length > 0 ? selectedRoutes.join(',') : null;
        const response = await getItemReport(null, fromDate, toDate, routeParam);
        if (response && response.itemReportData) {
          setReportData(response.itemReportData);
          setFilteredData(response.itemReportData);
        } else {
          setReportData([]);
          setFilteredData([]);
        }
      } catch (error) {
        console.error("No item report data:", error);
        toast.error("No item report data");
        setReportData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [fromDate, toDate, selectedRoutes]);

  useEffect(() => {
    // Filter data based on search term and selected route
    let filtered = reportData;
    
    // Apply route filter
    if (selectedRoutes.length > 0) {
      filtered = filtered.filter(item => selectedRoutes.includes(item.route));
    }
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.route && item.route.toLowerCase().includes(term)) ||
        (item.product_name && item.product_name.toLowerCase().includes(term))
      );
    }
    
    setFilteredData(filtered);
  }, [searchTerm, selectedRoutes, reportData]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...filteredData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredData(sortedData);
  };

  // Updated exportToExcel function to export as Excel with separate sheets
  const exportToExcel = () => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // If no routes are selected or all routes are selected, create a single "AllRoutes" sheet
    if (selectedRoutes.length === 0) {
      // Create worksheet for all routes
      const wsData = [
        ["Route", "Product Name", "Total Quantity"],
        ...filteredData.map(item => [
          item.route || '',
          item.product_name || '',
          item.total_quantity || 0
        ])
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "AllRoutes");
    } else {
      // Create separate sheets for each selected route
      selectedRoutes.forEach(routeName => {
        const routeData = filteredData.filter(item => item.route === routeName);
        if (routeData.length > 0) {
          const wsData = [
            ["Route", "Product Name", "Total Quantity"],
            ...routeData.map(item => [
              item.route || '',
              item.product_name || '',
              item.total_quantity || 0
            ])
          ];
          
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          XLSX.utils.book_append_sheet(wb, ws, routeName.length > 31 ? routeName.substring(0, 31) : routeName); // Excel sheet names limited to 31 characters
        }
      });
      
      // Also create an "AllRoutes" sheet with all filtered data
      const allRoutesWsData = [
        ["Route", "Product Name", "Total Quantity"],
        ...filteredData.map(item => [
          item.route || '',
          item.product_name || '',
          item.total_quantity || 0
        ])
      ];
      
      const allRoutesWs = XLSX.utils.aoa_to_sheet(allRoutesWsData);
      XLSX.utils.book_append_sheet(wb, allRoutesWs, "AllRoutes");
    }

    // Generate filename with date range
    const filename = `item_report_${fromDate || 'start'}_to_${toDate || 'end'}.xlsx`;
    
    // Export the workbook
    XLSX.writeFile(wb, filename);
    
    toast.success("Report exported successfully as Excel file");
  };

  // Function to toggle route selection
  const toggleRouteSelection = (routeName) => {
    if (selectedRoutes.includes(routeName)) {
      setSelectedRoutes(selectedRoutes.filter(route => route !== routeName));
    } else {
      setSelectedRoutes([...selectedRoutes, routeName]);
    }
  };

  // Function to select all routes
  const selectAllRoutes = () => {
    const allRouteNames = routes.map(route => route.name);
    setSelectedRoutes(allRouteNames);
  };

  // Function to clear all route selections
  const clearAllRoutes = () => {
    setSelectedRoutes([]);
  };

  // Updated formatDate function to handle date range
  const formatDateRange = () => {
    if (!fromDate && !toDate) return "All Dates";
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return `${from.toLocaleDateString('en-GB')} to ${to.toLocaleDateString('en-GB')}`;
    }
    if (fromDate) {
      const from = new Date(fromDate);
      return `From ${from.toLocaleDateString('en-GB')}`;
    }
    if (toDate) {
      const to = new Date(toDate);
      return `To ${to.toLocaleDateString('en-GB')}`;
    }
    return "All Dates";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading item report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Items Report
              </h1>
              <p className="text-gray-600">
                Detailed report of items sold by route
              </p>
            </div>
            <div className="bg-orange-100 rounded-xl p-3">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters Section - Updated to match CollectCash style */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2">
            <h2 className="text-white text-sm font-semibold flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Report Filters
            </h2>
          </div>
          
          <div className="p-4">
            {/* Top Filters Row - Date Range, Search, and Export */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* From Date Filter */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              
              {/* To Date Filter */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              
              {/* Export Button */}
              <div className="flex items-end">
                <button
                  onClick={exportToExcel}
                  disabled={filteredData.length === 0}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
                >
                  <Download className="h-4 w-4 mr-1" />
                  <span>Export to Excel</span>
                </button>
              </div>
            </div>
            
            {/* Route Filter Section - Using Checkboxes instead of Multi-Select */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Select Routes
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllRoutes}
                    className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllRoutes}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              {routesLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-500 text-sm mt-2">Loading routes...</p>
                </div>
              ) : routes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No routes available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-md">
                  {routes.map((route) => (
                    <div 
                      key={route.id} 
                      className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                        selectedRoutes.includes(route.name) 
                          ? 'bg-orange-100 border border-orange-300' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => toggleRouteSelection(route.name)}
                    >
                      {selectedRoutes.includes(route.name) ? (
                        <CheckSquare className="h-4 w-4 text-orange-600 mr-2" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400 mr-2" />
                      )}
                      <span className="text-sm truncate">{route.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-2">
                {selectedRoutes.length > 0 
                  ? `${selectedRoutes.length} route(s) selected` 
                  : 'No routes selected - showing all routes'}
              </div>
            </div>
          </div>
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Routes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedRoutes.length > 0 ? selectedRoutes.length : Array.from(new Set(filteredData.map(item => item.route))).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Array.from(new Set(filteredData.map(item => item.product_name))).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Report Period</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatDateRange()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Data */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">Item Report Details</h2>
          </div>
          
          {filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No report data found</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm ? "Try adjusting your search criteria" : "No item report data available for the selected date"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('route')}
                    >
                      <div className="flex items-center">
                        Route
                        {sortConfig.key === 'route' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('product_name')}
                    >
                      <div className="flex items-center">
                        Product Name
                        {sortConfig.key === 'product_name' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_quantity')}
                    >
                      <div className="flex items-center">
                        Total Quantity
                        {sortConfig.key === 'total_quantity' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-orange-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.route || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.product_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-orange-600">{item.total_quantity || 0}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}