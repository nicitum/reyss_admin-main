import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, Calendar, Wallet, IndianRupee, 
  Filter, User, MapPin, CheckCircle, XCircle,
  ArrowDownToLine
} from 'lucide-react';
import { getCashDetails, mainWalletAPI } from '../../services/api';

const CashWallet = () => {
  const [cashTransactions, setCashTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [totals, setTotals] = useState({ 
    periodTotal: 0, 
    overallTotal: 0,
    availableTransferBalance: 0 
  });
  
  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Fetch cash details
  const fetchCashDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCashDetails(fromDate, toDate);
      
      if (response.message === "Cash details fetched successfully") {
        const results = response.data || [];
        // Format the response
        const cashDetails = results.map(row => ({
          customer_id: row.customer_id,
          customer_name: row.customer_name || null,
          payment_method: row.payment_method,
          payment_amount: row.payment_amount,
          payment_date: row.payment_date,
          route: row.route || null,
          collected_by_name: row.collected_by_name || null, // Updated to use collected_by_name directly
          collected_by: row.collected_by || null
        }));
        setCashTransactions(cashDetails);
        // Set totals with separate available transfer balance
        console.log('API Response Totals:', response.totals); // Debug log
        setTotals({
          periodTotal: response.totals?.period_total || 0,
          overallTotal: response.totals?.overall_cash_payments_total || 0,
          availableTransferBalance: response.totals?.available_transfer_balance !== undefined ? 
                                   response.totals?.available_transfer_balance : 
                                   response.totals?.period_total || 0
        });
      } else {
        setCashTransactions([]);
        setTotals({ periodTotal: 0, overallTotal: 0, availableTransferBalance: 0 });
        toast.error(response.message || 'Failed to fetch cash details');
      }
    } catch (error) {
      setCashTransactions([]);
      setTotals({ periodTotal: 0, overallTotal: 0, availableTransferBalance: 0 });
      toast.error('Failed to fetch cash details. Please try again later.');
      console.error('Error fetching cash details:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Handle both timestamp (number) and datetime string formats
    let date;
    if (typeof dateString === 'number') {
      // Unix timestamp in seconds
      date = new Date(dateString * 1000);
    } else if (typeof dateString === 'string') {
      // Datetime string (e.g., "2023-12-01 10:30:00")
      date = new Date(dateString);
    } else {
      return 'N/A';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Format amount
  const formatAmount = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  // Filter transactions by search term
  const getFilteredTransactions = useCallback(() => {
    if (!searchTerm) return cashTransactions;
    
    const query = searchTerm.toLowerCase();
    return cashTransactions.filter(transaction => 
      transaction.customer_id.toLowerCase().includes(query) ||
      (transaction.customer_name && transaction.customer_name.toLowerCase().includes(query)) ||
      (transaction.route && transaction.route.toLowerCase().includes(query)) ||
      (transaction.collected_by && transaction.collected_by.toLowerCase().includes(query)) ||
      (transaction.collected_by_name && transaction.collected_by_name.toLowerCase().includes(query)) // Added collected_by_name to search
    );
  }, [cashTransactions, searchTerm]);

  // Handle transfer to main wallet
  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    
    if (!transferAmount || amount <= 0) {
      toast.error('Please enter a valid transfer amount');
      return;
    }
    
    if (isNaN(amount)) {
      toast.error('Please enter a valid numeric amount');
      return;
    }
    
    // Always use "Lokesh" as the name for transfers
    const transferName = "Lokesh";
    
    // Use available transfer balance for validation
    if (amount > (totals.availableTransferBalance || 0)) {
      toast.error('Transfer amount cannot exceed the available transfer balance');
      return;
    }
    
    try {
      setTransferLoading(true);
      const response = await mainWalletAPI.transfer(transferName, amount);
      
      if (response.message === "Transfer to main wallet successful") {
        toast.success('Amount transferred successfully');
        // Update available transfer balance after successful transfer
        setTotals(prev => ({
          ...prev,
          availableTransferBalance: Math.max(0, (prev.availableTransferBalance || 0) - amount)
        }));
        // Reset transfer form
        setTransferAmount('');
        setShowTransferModal(false);
        // Refresh data after a short delay to ensure server processing
        setTimeout(() => {
          fetchCashDetails();
        }, 1000);
      } else {
        toast.error(response.message || 'Transfer failed');
      }
    } catch (error) {
      toast.error('Failed to transfer amount. Please try again later.');
      console.error('Error transferring to main wallet:', error);
    } finally {
      setTransferLoading(false);
    }
  };

  // Initialize and refresh when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchCashDetails();
    }
  }, [fromDate, toDate, fetchCashDetails]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Wallet</h1>
              <p className="text-gray-600 text-lg">View and manage cash collection transactions</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <Wallet className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          {/* Professional Filters */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
            <div className="flex items-center mb-3">
              <Filter className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Filters & Search</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Search Transactions</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Customer ID, Name, Route..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={fetchCashDetails}
                  className="w-full bg-white text-orange-600 font-medium py-1.5 px-4 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  Refresh Data
                </button>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-orange-400">
              <div className="text-sm text-orange-100">
                Showing <span className="font-semibold text-white">{getFilteredTransactions().length}</span> of&nbsp;
                <span className="font-semibold text-white">{cashTransactions.length}</span> transactions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Period Total ({fromDate} to {toDate})</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(totals.periodTotal)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Overall Total Collected</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(totals.overallTotal)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-lg mr-4">
                <ArrowDownToLine className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Available for Transfer</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(totals.availableTransferBalance || 0)}</p>
              </div>
            </div>
          </div>
          
          {/* Transfer to Main Account Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg mr-4">
                  <ArrowDownToLine className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transfer to Main Account</p>
                  <p className="text-lg font-bold text-gray-900">Move Funds</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium text-sm"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading cash transactions...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {getFilteredTransactions().length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3">
                  <h2 className="text-white text-lg font-semibold">Cash Transactions</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Collected By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredTransactions().map((transaction, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.collected_by_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction.customer_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.customer_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <MapPin className="mr-1 h-4 w-4 text-orange-500" />
                              {transaction.route || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatAmount(transaction.payment_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.payment_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Wallet className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria' : 'No cash transactions found for the selected date range'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Transfer to Main Account</h3>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Amount</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount to transfer"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    disabled={transferLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Available: {formatAmount(totals.availableTransferBalance || 0)}</p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferAmount('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={transferLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium flex items-center"
                  disabled={transferLoading}
                >
                  {transferLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Transferring...
                    </>
                  ) : (
                    'Transfer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashWallet;