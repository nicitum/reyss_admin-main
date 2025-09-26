import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Wallet, IndianRupee, Calendar, User, ArrowDownToLine,
  Filter, Search
} from 'lucide-react';
import { mainWalletAPI } from '../../services/api';

const SLEMainAccount = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalBalance, setTotalBalance] = useState(0);

  // Fetch main wallet transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await mainWalletAPI.fetchTransactions();
      
      if (response.message === "Main wallet transactions fetched successfully") {
        setTransactions(response.data || []);
        
        // Calculate total balance
        const balance = (response.data || []).reduce((sum, transaction) => sum + (parseFloat(transaction.amount) || 0), 0);
        setTotalBalance(balance);
      } else {
        setTransactions([]);
        setTotalBalance(0);
        toast.error(response.message || 'Failed to fetch main wallet transactions');
      }
    } catch (error) {
      setTransactions([]);
      setTotalBalance(0);
      toast.error('Failed to fetch main wallet transactions. Please try again later.');
      console.error('Error fetching main wallet transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!searchTerm) return transactions;
    
    const query = searchTerm.toLowerCase();
    return transactions.filter(transaction => 
      (transaction.name && transaction.name.toLowerCase().includes(query)) ||
      (transaction.id && transaction.id.toString().includes(query))
    );
  }, [transactions, searchTerm]);

  // Initialize
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">SLE Main Account</h1>
              <p className="text-gray-600 text-lg">View main account transactions</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <Wallet className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          {/* Professional Filters */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
            <div className="flex items-center mb-3">
              <Filter className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Search Transactions</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <div className="bg-white rounded-lg p-3 w-full">
                  <p className="text-gray-600 text-sm">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAmount(totalBalance)}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-orange-400">
              <div className="text-sm text-orange-100">
                Showing <span className="font-semibold text-white">{getFilteredTransactions().length}</span> of&nbsp;
                <span className="font-semibold text-white">{transactions.length}</span> transactions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading main account transactions...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-full mx-auto px-4 py-6">
          {getFilteredTransactions().length > 0 ? (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3">
                <h2 className="text-white text-lg font-semibold">Main Account Transactions</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
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
                    {getFilteredTransactions().map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatAmount(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.date)}
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
                {searchTerm ? 'Try adjusting your search criteria' : 'No main account transactions found'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SLEMainAccount;