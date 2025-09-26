import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter,
  Calendar,
  IndianRupee,
  CreditCard,
  Wallet,
  Download
} from "lucide-react";
import { fetchAllPaymentTransactions } from "../../services/api";
import { toast } from 'react-hot-toast';

export default function PaymentsReport() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState(getTodayDate());
  const [dateRange, setDateRange] = useState({ from: getTodayDate(), to: getTodayDate() });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [useDateRange, setUseDateRange] = useState(false);

  // Helper function to get today's date in YYYY-MM-DD format
  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const filters = {};
        
        if (!useDateRange && dateFilter) {
          filters.date = dateFilter;
        } else if (useDateRange) {
          if (dateRange.from) filters.from_date = dateRange.from;
          if (dateRange.to) filters.to_date = dateRange.to;
        }
        
        if (paymentMethodFilter) {
          filters.payment_method = paymentMethodFilter;
        }
        
        const response = await fetchAllPaymentTransactions(filters);
        if (response && response.transactions) {
          setTransactions(response.transactions);
          setFilteredTransactions(response.transactions);
        }
      } catch (error) {
        console.error("Failed to fetch payment transactions:", error);
        // Check if it's a 404 error (no transactions found)
        if (error?.response?.status === 404) {
          toast.success("No transactions found");
          setTransactions([]);
          setFilteredTransactions([]);
        } else {
          toast.error("Failed to fetch payment transactions");
          setTransactions([]);
          setFilteredTransactions([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dateFilter, dateRange, paymentMethodFilter, useDateRange]);

  useEffect(() => {
    // Filter transactions based on search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = transactions.filter(transaction => 
        (transaction.customer_id && transaction.customer_id.toString().includes(term)) ||
        (transaction.payment_amount && transaction.payment_amount.toString().includes(term)) ||
        (transaction.payment_method && transaction.payment_method.toLowerCase().includes(term)) ||
        (transaction.payment_type && transaction.payment_type.toLowerCase().includes(term))
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [searchTerm, transactions]);

  const handleRefresh = () => {
    const today = getTodayDate();
    setDateFilter(today);
    setDateRange({ from: today, to: today });
    setPaymentMethodFilter("");
    setSearchTerm("");
    setUseDateRange(false);
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Transaction ID",
      "Customer ID",
      "Payment Method",
      "Payment Amount",
      "Payment Date",
      "Payment Type"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map(transaction => [
        transaction.transaction_id,
        transaction.customer_id,
        transaction.payment_method,
        transaction.payment_amount,
        transaction.payment_date,
        transaction.payment_type || "N/A"
      ].map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payment_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading payment transactions...</p>
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
                Payments Report
              </h1>
              <p className="text-gray-600">
                View and export payment transaction records
              </p>
            </div>
            <div className="bg-orange-100 rounded-xl p-3">
              <CreditCard className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2">
            <h2 className="text-white text-sm font-semibold flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filter Transactions
            </h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              
              {/* Date Filter Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dateRangeToggle"
                  checked={useDateRange}
                  onChange={(e) => setUseDateRange(e.target.checked)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="dateRangeToggle" className="text-sm text-gray-700">
                  Use Date Range
                </label>
              </div>
              
              {/* Single Date or Date Range */}
              {!useDateRange ? (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="date"
                      placeholder="From date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="date"
                      placeholder="To date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                    />
                  </div>
                </>
              )}
              
              {/* Payment Method Filter */}
              <div>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-sm"
                >
                  <option value="">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={handleRefresh}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
              >
                Reset Filters
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 text-sm font-medium transition-all"
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Data */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 flex justify-between items-center">
            <h2 className="text-white text-lg font-semibold">Payment Transactions</h2>
            <span className="text-white text-sm">
              {filteredTransactions.length} transaction(s)
            </span>
          </div>
          
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm || dateFilter || dateRange.from || dateRange.to || paymentMethodFilter
                  ? "No transactions match your current filters"
                  : "There are currently no payment transactions recorded"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="hover:bg-orange-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{transaction.transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.customer_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {transaction.payment_method === 'cash' ? (
                            <Wallet className="h-4 w-4 text-green-600 mr-2" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-blue-600 mr-2" />
                          )}
                          <span className="text-sm font-medium">
                            {transaction.payment_method.charAt(0).toUpperCase() + transaction.payment_method.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-green-600 font-bold">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {parseFloat(transaction.payment_amount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.payment_date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.payment_type === 'advance' 
                            ? 'bg-blue-100 text-blue-800' 
                            : transaction.payment_type === 'regular' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.payment_type || 'N/A'}
                        </span>
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