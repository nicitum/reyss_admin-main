import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { 
  Receipt, 
  Download, 
  Calendar, 
  Filter,
  AlertCircle,
  Loader2,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { getReceipts } from '../services/api';

const TallyReceiptReport = () => {
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));

  const fetchReceipts = async (start = startDate, end = endDate) => {
    console.log("Fetching receipts with date range:", { start, end });
    try {
      setLoading(true);
      setError(null);
      const data = await getReceipts(start, end);
      console.log("Fetched receipts:", data);
      if (!data.length) {
        setError("No receipts found for the selected date range");
        setFilteredReceipts([]);
        setReceipts([]);
        return;
      }
      setReceipts(data);
      setFilteredReceipts(data);
      console.log(`Successfully loaded ${data.length} receipts`);
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch receipts';
      console.error("Fetch error:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      console.log("Loading set to false");
    }
  };

  // Fetch receipts when dates change (including initial load)
  useEffect(() => {
    // Validate date range if both dates are provided
    if (startDate && endDate && moment(endDate).isBefore(moment(startDate))) {
      toast.error('End date cannot be before start date');
      setReceipts([]);
      setFilteredReceipts([]);
      setError('Invalid date range');
      setLoading(false);
      return;
    }
    
    // Fetch receipts with current date range
    fetchReceipts(startDate, endDate);
  }, [startDate, endDate]);

  const formatDate = dateString => {
    if (!dateString) return '-';
    return moment(dateString, 'YYYY-MM-DD').format('DD-MM-YYYY');
  };

  const filterReceipts = (start, end) => {
    console.log("Filtering with start:", start, "end:", end);
    if (!start && !end) {
      setFilteredReceipts(receipts);
      return;
    }
    const filtered = receipts.filter(receipt => {
      const receiptDate = moment(receipt.payment_date, 'YYYY-MM-DD');
      const startMoment = start ? moment(start, 'YYYY-MM-DD').startOf('day') : null;
      const endMoment = end ? moment(end, 'YYYY-MM-DD').endOf('day') : null;
      if (startMoment && receiptDate.isBefore(startMoment)) return false;
      if (endMoment && receiptDate.isAfter(endMoment)) return false;
      return true;
    });
    console.log("Filtered receipts:", filtered);
    setFilteredReceipts(filtered);
  };

  const exportToExcel = () => {
    if (!filteredReceipts.length) {
      toast.error('No receipts to export');
      return;
    }

    const exportData = [];
    // Group by date and customer_id
    const groupedByDateAndCustomer = {};

    filteredReceipts.forEach(receipt => {
      const date = moment(receipt.payment_date).format('YYYY-MM-DD');
      const key = `${date}-${receipt.customer_id}`;
      if (!groupedByDateAndCustomer[key]) {
        groupedByDateAndCustomer[key] = {
          customer_name: receipt.customer_name,
          payment_date: receipt.payment_date,
          total_paid: 0,
          transactions: [],
        };
      }
      groupedByDateAndCustomer[key].total_paid += receipt.payment_amount;
      groupedByDateAndCustomer[key].transactions.push(receipt);
    });

    // Generate rows for each customer-day group
    Object.values(groupedByDateAndCustomer).forEach(group => {
      const totalPaid = group.total_paid;
      // Prefer the transaction_id of the "cash" transaction, else use the first transaction
      const cashTransaction = group.transactions.find(t => t.payment_method.toLowerCase() === 'cash');
      const selectedTransaction = cashTransaction || group.transactions[0];
      const vchNo = selectedTransaction.transaction_id;

      // First row: Customer name with total paid
      exportData.push({
        'Vch No': vchNo,
        'Date': formatDate(group.payment_date),
        'VoucherType': 'Receipt',
        'Ref': vchNo,
        'Ledger Name': group.customer_name,
        'Cost Center': '',
        'Debit Amt': 0,
        'Credit Amt': totalPaid,
        'Narration': '',
        'Group': 'Sundry Debtors',
        'Transaction Type': '',
        'Instrument No': '',
        'Instrument Date': '',
        'Bank': '',
        'Branch': '',
        'Received From': '',
        'Remarks': '',
      });

      // Subsequent rows: One for each transaction's payment method
      group.transactions.forEach(transaction => {
        exportData.push({
          'Vch No': vchNo,
          'Date': formatDate(transaction.payment_date),
          'VoucherType': 'Receipt',
          'Ref': vchNo,
          'Ledger Name': transaction.payment_method,
          'Cost Center': '',
          'Debit Amt': transaction.payment_amount,
          'Credit Amt': 0,
          'Narration': '',
          'Group': 'Sundry Debtors',
          'Transaction Type': '',
          'Instrument No': '',
          'Instrument Date': '',
          'Bank': '',
          'Branch': '',
          'Received From': '',
          'Remarks': '',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Receipts');
    XLSX.writeFile(wb, `Tally_Receipt_Report_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
    toast.success('Report exported successfully');
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tally Receipt Report</h1>
              <p className="text-gray-600">Export and manage receipt data for Tally integration</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <Receipt className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          {/* Professional Filters */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
            <div className="flex items-center mb-3">
              <Filter className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-semibold">Date Range & Export</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={exportToExcel}
                  disabled={!filteredReceipts.length || loading}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Receipt Count Display */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Receipt className="h-5 w-5 text-orange-500 mr-2" />
              <p className="text-gray-600">
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading receipts...
                  </span>
                ) : (
                  <>
                    Showing <span className="font-semibold">{filteredReceipts.length}</span> of <span className="font-semibold">{receipts.length}</span> receipts
                    {(startDate || endDate) && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'filtered'})
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            {!loading && filteredReceipts.length > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <DollarSign className="h-4 w-4 mr-1" />
                Total: ₹{filteredReceipts.reduce((sum, receipt) => sum + (receipt.payment_amount || 0), 0).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mr-3" />
              <span className="text-lg text-gray-600">Loading receipts...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-center justify-center text-red-600">
              <AlertCircle className="h-8 w-8 mr-3" />
              <span className="text-lg">{error}</span>
            </div>
          </div>
        ) : filteredReceipts.length > 0 ? (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Vch No</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Payment Method</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReceipts.map(receipt => (
                    <tr key={receipt.transaction_id} className="hover:bg-orange-50 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {receipt.transaction_id || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(receipt.payment_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {receipt.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {receipt.payment_method || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                        ₹{(receipt.payment_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      ₹{filteredReceipts.reduce((sum, receipt) => sum + (receipt.payment_amount || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="text-center">
              <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found</h3>
              <p className="text-gray-500">No receipts found for the selected date range</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TallyReceiptReport;