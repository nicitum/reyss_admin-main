import React, { useState, useEffect } from "react";
import { 
  Search, 
  User, 
  IndianRupee, 
  CheckCircle,
  AlertCircle,
  Filter,
  Wallet
} from "lucide-react";
import { fetchCreditLimitData, collectCash } from "../../services/api";
import { toast } from 'react-hot-toast';

export default function CollectCash() {
  const [creditData, setCreditData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState({});
  const [amount, setAmount] = useState({});
  const [showActionButtons, setShowActionButtons] = useState({});
  const [showConfirmation, setShowConfirmation] = useState({});
  const [confirmationAmount, setConfirmationAmount] = useState({});
  const [paymentType, setPaymentType] = useState({}); // 'regular' or 'advance'

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

  useEffect(() => {
    // Filter data based on search term
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
  }, [searchTerm, creditData]);

  const handleAmountChange = (customerId, value) => {
    // Allow only positive integers, no symbols, no decimals, no zero
    const numericValue = value.replace(/[^0-9]/g, ''); // Remove all non-numeric characters
    const intValue = parseInt(numericValue, 10);
    
    // Get the current customer data and payment type
    const customer = creditData.find(item => item.customer_id === customerId);
    const currentPaymentType = paymentType[customerId] || 'regular';
    
    // For regular payments, restrict amount to not exceed amount_due
    if (currentPaymentType === 'regular' && customer && customer.amount_due) {
      const maxAmount = Math.floor(parseFloat(customer.amount_due));
      if (intValue > maxAmount) {
        // Don't allow values greater than amount_due for regular payments
        return;
      }
    }
    
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

  const handlePaymentTypeChange = (customerId, type) => {
    setPaymentType(prev => ({
      ...prev,
      [customerId]: type
    }));
    
    // Validate amount when switching to regular payment
    if (type === 'regular') {
      const currentAmount = amount[customerId];
      if (currentAmount) {
        const intValue = parseInt(currentAmount, 10);
        const customer = creditData.find(item => item.customer_id === customerId);
        if (customer && customer.amount_due) {
          const maxAmount = Math.floor(parseFloat(customer.amount_due));
          if (intValue > maxAmount) {
            // Reset amount to max allowed for regular payment
            setAmount(prev => ({
              ...prev,
              [customerId]: maxAmount.toString()
            }));
          }
        }
      }
    }
  };

  const handleCollectClick = (customerId) => {
    const amountValue = amount[customerId];
    const currentPaymentType = paymentType[customerId] || 'regular';
    
    if (amountValue && parseInt(amountValue) > 0) {
      // For regular payments, validate that amount doesn't exceed amount_due
      if (currentPaymentType === 'regular') {
        const customer = creditData.find(item => item.customer_id === customerId);
        if (customer && customer.amount_due) {
          const maxAmount = Math.floor(parseFloat(customer.amount_due));
          const enteredAmount = parseInt(amountValue, 10);
          
          if (enteredAmount > maxAmount) {
            toast.error(`For regular payment, amount cannot exceed due amount (₹${maxAmount})`);
            return;
          }
        }
      }
      
      setConfirmationAmount(prev => ({
        ...prev,
        [customerId]: amountValue
      }));
      setShowConfirmation(prev => ({
        ...prev,
        [customerId]: true
      }));
    }
  };

  const confirmCollectCash = async (customerId) => {
    const amountValue = parseInt(confirmationAmount[customerId]);
    const type = paymentType[customerId] || 'regular';
    
    if (!amountValue || amountValue <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    try {
      setCollecting(prev => ({ ...prev, [customerId]: true }));
      
      const response = await collectCash(customerId, amountValue, type);
      
      if (response && response.message) {
        toast.success(response.message);
        
        // Update the local data
        setCreditData(prev => 
          prev.map(item => {
            if (item.customer_id === customerId) {
              const updatedItem = { ...item };
              
              // Update fields only if they exist in the response
              if (response.updatedAmountPaidCash !== undefined) {
                updatedItem.amount_paid_cash = response.updatedAmountPaidCash;
              }
              if (response.updatedAmountDue !== undefined) {
                updatedItem.amount_due = response.updatedAmountDue;
              }
              if (response.updatedCreditLimit !== undefined) {
                updatedItem.credit_limit = response.updatedCreditLimit;
              }
              if (response.updatedAdvancePayment !== undefined) {
                updatedItem.advance_payment = response.updatedAdvancePayment;
              }
              if (response.advanceUsed !== undefined) {
                // If advance was used, we might want to show this information
                console.log(`Advance used: ${response.advanceUsed}`);
              }
              
              return updatedItem;
            }
            return item;
          })
        );
        
        // Reset amount and hide buttons
        setAmount(prev => ({ ...prev, [customerId]: "" }));
        setShowActionButtons(prev => ({ ...prev, [customerId]: false }));
        setShowConfirmation(prev => ({ ...prev, [customerId]: false }));
        setPaymentType(prev => ({ ...prev, [customerId]: 'regular' }));
      }
    } catch (error) {
      console.error("Failed to collect cash:", error);
      const errorMsg = error?.response?.data?.message || "Failed to collect cash";
      toast.error(errorMsg);
    } finally {
      setCollecting(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const cancelCollectCash = (customerId) => {
    setShowConfirmation(prev => ({
      ...prev,
      [customerId]: false
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading customer data...</p>
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
                Collect Cash
              </h1>
              <p className="text-gray-600">
                Collect cash payments from customers
              </p>
            </div>
            <div className="bg-orange-100 rounded-xl p-3">
              <Wallet className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
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
            <h2 className="text-white text-lg font-semibold">Customer Payment Details</h2>
          </div>
          
          {filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No customer data found</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm ? "Try adjusting your search criteria" : "No customer data available"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Due
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cash Paid
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Advance Receipt
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit Limit
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
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
                        <div className="flex items-center text-red-600 font-bold">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {parseFloat(item.amount_due || 0) > 0 ? parseFloat(item.amount_due || 0).toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-green-600 font-bold">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {parseFloat(item.amount_paid_cash || 0) > 0 ? parseFloat(item.amount_paid_cash || 0).toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-blue-600 font-bold">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {parseFloat(item.advance_payment || 0) > 0 ? parseFloat(item.advance_payment || 0).toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-purple-600 font-bold">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {parseFloat(item.credit_limit || 0) > 0 ? parseFloat(item.credit_limit || 0).toFixed(2) : '0.00'}
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
                              placeholder="Enter cash amount"
                              value={amount[item.customer_id] || ""}
                              onChange={(e) => handleAmountChange(item.customer_id, e.target.value)}
                              className={`pl-8 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full md:w-48 ${
                                (paymentType[item.customer_id] || 'regular') === 'regular' && 
                                amount[item.customer_id] && 
                                item.amount_due && 
                                parseFloat(amount[item.customer_id]) > parseFloat(item.amount_due) 
                                  ? 'border-red-500 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                            />
                            {/* Max amount display removed as per requirements */}
                          </div>
                          
                          {/* Payment Type Selection */}
                          {showActionButtons[item.customer_id] && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handlePaymentTypeChange(item.customer_id, 'regular')}
                                className={`flex-1 px-2 py-1 text-xs rounded-md ${
                                  (paymentType[item.customer_id] || 'regular') === 'regular'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                Regular Payment
                              </button>
                              <button
                                onClick={() => handlePaymentTypeChange(item.customer_id, 'advance')}
                                className={`flex-1 px-2 py-1 text-xs rounded-md ${
                                  paymentType[item.customer_id] === 'advance'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                Advance Payment
                              </button>
                            </div>
                          )}
                          
                          {/* Action Buttons - shown only when amount is entered */}
                          {showActionButtons[item.customer_id] && (
                            <button
                              onClick={() => handleCollectClick(item.customer_id)}
                              disabled={collecting[item.customer_id]}
                              className="flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                            >
                              {collecting[item.customer_id] ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              ) : (
                                <Wallet className="h-3 w-3 mr-1" />
                              )}
                              <span>Collect Cash</span>
                            </button>
                          )}
                          
                          {/* Confirmation Modal */}
                          {showConfirmation[item.customer_id] && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-md font-bold text-gray-900">
                                    Confirm {paymentType[item.customer_id] === 'advance' ? 'Advance' : 'Cash'} Collection
                                  </h3>
                                  <button 
                                    onClick={() => cancelCollectCash(item.customer_id)}
                                    className="text-gray-400 hover:text-gray-500"
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </button>
                                </div>
                                
                                <div className="mb-4">
                                  <p className="text-sm text-gray-700">
                                    Collect <span className="font-bold text-green-600">
                                      ₹{confirmationAmount[item.customer_id]}
                                    </span> from customer <span className="font-bold">
                                      #{item.customer_id}
                                    </span> as {paymentType[item.customer_id] === 'advance' ? 'advance payment' : 'regular payment'}?
                                  </p>
                                </div>
                                
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => cancelCollectCash(item.customer_id)}
                                    disabled={collecting[item.customer_id]}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-orange-500"
                                  >
                                    No
                                  </button>
                                  <button
                                    onClick={() => confirmCollectCash(item.customer_id)}
                                    disabled={collecting[item.customer_id]}
                                    className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500 flex items-center justify-center"
                                  >
                                    {collecting[item.customer_id] ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    ) : (
                                      "Yes"
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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