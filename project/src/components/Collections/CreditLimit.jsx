import React, { useState, useEffect } from "react";
import { 
  Search, 
  User, 
  CreditCard, 
  IndianRupee, 
  Plus, 
  Minus,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { fetchCreditLimitData, increaseCreditLimit, decreaseCreditLimit } from "../../services/api";
import { toast } from 'react-hot-toast';

export default function CreditLimit() {
  const [creditData, setCreditData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [increasing, setIncreasing] = useState({});
  const [decreasing, setDecreasing] = useState({});
  const [amount, setAmount] = useState({}); // Single amount state for both operations
  const [showActionButtons, setShowActionButtons] = useState({}); // Show buttons after entering amount
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchCreditLimitData();
        if (response && response.creditData) {
          setCreditData(response.creditData);
          setFilteredData(response.creditData);
        }
      } catch (error) {
        console.error("Failed to fetch credit limit data:", error);
        toast.error("Failed to fetch credit limit data");
        setCreditData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter data based on search term
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = creditData.filter(item => 
        (item.customer_id && item.customer_id.toString().includes(term)) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(term))
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(creditData);
    }
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, creditData]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleAmountChange = (customerId, value) => {
    // Allow only positive integers, no symbols, no decimals, no zero
    const numericValue = value.replace(/[^0-9]/g, ''); // Remove all non-numeric characters
    const intValue = parseInt(numericValue, 10);
    
    // Prevent zero and negative values
    if (numericValue === '' || intValue <= 0) {
      setAmount(prev => ({
        ...prev,
        [customerId]: numericValue === '' ? '' : numericValue
      }));
      
      // Hide action buttons if value is invalid
      if (numericValue === '' || intValue <= 0) {
        setShowActionButtons(prev => ({
          ...prev,
          [customerId]: false
        }));
      }
      return;
    }
    
    setAmount(prev => ({
      ...prev,
      [customerId]: numericValue
    }));
    
    // Show action buttons only when there's a valid positive integer
    setShowActionButtons(prev => ({
      ...prev,
      [customerId]: true
    }));
  };

  const submitIncrease = async (customerId) => {
    const amountValue = parseFloat(amount[customerId]);
    
    if (!amountValue || amountValue <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    try {
      setIncreasing(prev => ({ ...prev, [customerId]: true }));
      
      const response = await increaseCreditLimit(customerId, amountValue);
      
      if (response && response.message) {
        toast.success(response.message);
        
        // Update the local data
        setCreditData(prev => 
          prev.map(item => 
            item.customer_id === customerId 
              ? { ...item, credit_limit: parseFloat(item.credit_limit) + amountValue }
              : item
          )
        );
        
        // Reset amount and hide buttons
        setAmount(prev => ({ ...prev, [customerId]: "" }));
        setShowActionButtons(prev => ({ ...prev, [customerId]: false }));
      }
    } catch (error) {
      console.error("Failed to increase credit limit:", error);
      const errorMsg = error?.response?.data?.message || "Failed to increase credit limit";
      toast.error(errorMsg);
    } finally {
      setIncreasing(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const submitDecrease = async (customerId) => {
    const amountValue = parseFloat(amount[customerId]);
    
    if (!amountValue || amountValue <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    try {
      setDecreasing(prev => ({ ...prev, [customerId]: true }));
      
      const response = await decreaseCreditLimit(customerId, amountValue);
      
      if (response && response.message) {
        toast.success(response.message);
        
        // Update the local data
        setCreditData(prev => 
          prev.map(item => 
            item.customer_id === customerId 
              ? { ...item, credit_limit: parseFloat(item.credit_limit) - amountValue }
              : item
          )
        );
        
        // Reset amount and hide buttons
        setAmount(prev => ({ ...prev, [customerId]: "" }));
        setShowActionButtons(prev => ({ ...prev, [customerId]: false }));
      }
    } catch (error) {
      console.error("Failed to decrease credit limit:", error);
      const errorMsg = error?.response?.data?.message || "Failed to decrease credit limit";
      toast.error(errorMsg);
    } finally {
      setDecreasing(prev => ({ ...prev, [customerId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading credit limit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Credit Limit Management
              </h1>
              <p className="text-gray-600">
                View and manage customer credit limits
              </p>
            </div>
            <div className="bg-orange-100 rounded-xl p-3">
              <CreditCard className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2">
            <h2 className="text-white text-sm font-semibold flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Search Customers
            </h2>
          </div>
          
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by customer ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Credit Limit Data */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
            <h2 className="text-white text-lg font-semibold">Customer Credit Limits</h2>
          </div>
          
          {filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No credit limit data found</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm ? "Try adjusting your search criteria" : "No customer credit limit data available"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Credit Limit
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((item) => (
                      <tr key={item.customer_id} className="hover:bg-orange-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">#{item.customer_id}</div>
                              {item.customer_name && (
                                <div className="text-sm text-gray-500">{item.customer_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-orange-600 font-bold">
                            <IndianRupee className="h-4 w-4 mr-1" />
                            {parseFloat(item.credit_limit).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col space-y-3">
                            {/* Amount Input Field */}
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text" // Changed to text to allow better control over input
                                inputMode="numeric" // Show numeric keyboard on mobile
                                placeholder="Enter positive integer amount"
                                value={amount[item.customer_id] || ""}
                                onChange={(e) => handleAmountChange(item.customer_id, e.target.value)}
                                className="pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full md:w-48"
                              />
                            </div>
                            
                            {/* Action Buttons - shown only when amount is entered */}
                            {showActionButtons[item.customer_id] && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => submitIncrease(item.customer_id)}
                                  disabled={increasing[item.customer_id]}
                                  className="flex items-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 justify-center"
                                >
                                  {increasing[item.customer_id] ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  ) : (
                                    <Plus className="h-3 w-3 mr-1" />
                                  )}
                                  <span>Increase</span>
                                </button>
                                
                                <button
                                  onClick={() => submitDecrease(item.customer_id)}
                                  disabled={decreasing[item.customer_id]}
                                  className="flex items-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 justify-center"
                                >
                                  {decreasing[item.customer_id] ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  ) : (
                                    <Minus className="h-3 w-3 mr-1" />
                                  )}
                                  <span>Decrease</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-700">
                      <span>
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> of{' '}
                        <span className="font-medium">{filteredData.length}</span> results
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg ${
                          currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-orange-600 hover:bg-orange-100 transition-colors duration-200'
                        }`}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                currentPage === pageNum
                                  ? 'bg-orange-500 text-white'
                                  : 'text-gray-700 hover:bg-orange-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg ${
                          currentPage === totalPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-orange-600 hover:bg-orange-100 transition-colors duration-200'
                        }`}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}