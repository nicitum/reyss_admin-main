import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Calendar, 
  ChevronDown, 
  ChevronRight,
  Filter,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getInvoices } from '../../services/api';

const TallyInvoiceReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  
  // Ensure both dates are set to today's date
  const todayDate = moment().format('YYYY-MM-DD');
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const navigate = useNavigate();

  // Debug logging to check initial date values
  console.log('TallyInvoiceReport initialized with dates:', {
    today: todayDate,
    startDate: todayDate,
    endDate: todayDate
  });

  const fetchInvoices = async (start = '', end = '') => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching invoices with dates:', { start, end });
      
      const response = await getInvoices(start, end);
      console.log('Invoice API Response:', response);
      
      if (response && response.success) {
        const invoiceData = response.data || [];
        console.log('Invoice data received:', invoiceData);
        setInvoices(invoiceData);
        
        if (invoiceData.length === 0) {
          setError('No invoices found for the selected date range');
          console.log('No invoices found');
        } else {
          console.log(`Successfully loaded ${invoiceData.length} invoices`);
        }
      } else {
        const errorMsg = response?.message || 'Failed to fetch invoices';
        console.error('API returned error:', errorMsg);
        setError(errorMsg);
        setInvoices([]);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch invoices. Please try again.';
      console.error('Error in fetchInvoices:', error);
      setError(errorMessage);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoiceExpansion = (invoiceId) => {
    setExpandedInvoiceId(expandedInvoiceId === invoiceId ? null : invoiceId);
  };

  const formatDate = (unixTimestamp) => {
    return unixTimestamp
      ? moment.unix(unixTimestamp).format('DD/MM/YYYY')
      : '-';
  };

  // Fetch invoices when dates change (including initial load)
  useEffect(() => {
    console.log('useEffect triggered with dates:', { startDate, endDate });
    
    // Validate date range if both dates are provided
    if (startDate && endDate && moment(endDate).isBefore(moment(startDate))) {
      setInvoices([]);
      setError('Invalid date range');
      setLoading(false);
      return;
    }
    
    // Fetch invoices with current date range
    console.log('Calling fetchInvoices with:', { startDate, endDate });
    fetchInvoices(startDate, endDate);
  }, [startDate, endDate]);

  const exportToExcel = () => {
    if (!invoices.length) {
      return;
    }

    const exportData = [];
    let vchRef = 1;
    let prevInvoiceId = null;

    invoices.forEach((invoice) => {
      if (prevInvoiceId !== invoice.invoice_id) {
        vchRef++;
        prevInvoiceId = invoice.invoice_id;
      }

      invoice.items.forEach((item) => {
        const gstAmount = (item.amount * (item.gst_percentage || 0)) / 100;
        const sgstAmount = gstAmount / 2;
        const cgstAmount = gstAmount / 2;

        exportData.push({
          'Vch Ref': vchRef - 1,
          'Invoice No': invoice.invoice_id || '-',
          'Voucher Date': formatDate(invoice.voucher_date),
          'Invoice Date': formatDate(invoice.invoice_date),
          'Voucher TYPE': 'SALES',
          'Customer Code / Alias': '',
          'Customer Name': invoice.customer_name || '-',
          'Customer Mobile': invoice.customer_mobile || '-',
          'Under Group': 'Sundry Debtors',
          'Address Line 1': '',
          'Address Line 2': '',
          'Address Line 3': '',
          'City': '',
          'Pin Code': '',
          'State': '',
          'GST No': '',
          'Product NO': '',
          'Product Description': item.product_description || '-',
          'Stock Group': item.stock_group || '-',
          'Stock Category': item.stock_category || '-',
          'HSN': item.hsn || '-',
          'Godown': 'Main Location',
          'UOM': 'Pkts',
          'Quantity': item.quantity || 0,
          'Rate': item.rate || 0,
          'Amount': (item.rate * item.quantity) || 0,
          'GST %': item.gst_percentage || 0,
          'SGST Amount': sgstAmount || 0,
          'CGST Amount': cgstAmount || 0,
          'IGST Amount': '',
          'Ledger 1': '',
          'Ledger 2': '',
          'Ledger 3': '',
          'Ledger 4': '',
          'Ledger 5': '',
          'Ledger 6': '',
          'Ledger 7': '',
          'Round off': '',
          'Line Total': item.amount || 0,
          'Remarks': '',
          'batch number': '',
          'mnfdate': '',
          'Expiry Date': ''
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `Tally_Invoice_Report_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      {/* Professional Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tally Invoice Report</h1>
              <p className="text-gray-600">Export and manage invoice data for Tally integration</p>
            </div>
            <div className="bg-orange-100 rounded-2xl p-4">
              <FileText className="h-8 w-8 text-orange-600" />
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
                    onChange={(e) => setStartDate(e.target.value)}
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
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:ring-2 focus:ring-orange-300 text-gray-900"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={exportToExcel}
                  disabled={!invoices.length || loading}
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

      <div className="max-w-full mx-auto px-4 py-6">
        {/* Invoice Count Display */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-orange-500 mr-2" />
              <p className="text-gray-600">
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading invoices...
                  </span>
                ) : (
                  <>
                    Showing <span className="font-semibold">{invoices.length}</span> invoices
                    {(startDate || endDate) && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({startDate && endDate ? `${moment(startDate).format('DD/MM/YYYY')} - ${moment(endDate).format('DD/MM/YYYY')}` : 'filtered'})
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mr-3" />
              <span className="text-lg text-gray-600">Loading invoices...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-center justify-center text-red-600">
              <AlertCircle className="h-8 w-8 mr-3" />
              <span className="text-lg">{error}</span>
            </div>
          </div>
        ) : invoices.length > 0 ? (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Invoice No</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Invoice Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Total Items</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Total Amount</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <React.Fragment key={invoice.id}>
                      <tr className="hover:bg-orange-50 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {invoice.invoice_id || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {invoice.customer_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {invoice.items?.length || 0} items
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">
                          ₹{(invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleInvoiceExpansion(invoice.id)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors duration-150"
                          >
                            {expandedInvoiceId === invoice.id ? (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-4 w-4 mr-1" />
                                View
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedInvoiceId === invoice.id && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Invoice Meta Information */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border">
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Order ID</span>
                                  <p className="text-sm text-gray-900">{invoice.order_id || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Order Date</span>
                                  <p className="text-sm text-gray-900">{formatDate(invoice.order_date)}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Customer Mobile</span>
                                  <p className="text-sm text-gray-900">{invoice.customer_mobile || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">Voucher Date</span>
                                  <p className="text-sm text-gray-900">{formatDate(invoice.voucher_date)}</p>
                                </div>
                              </div>

                              {/* Invoice Items Table */}
                              <div className="bg-white rounded-lg border overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Group</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GST %</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {invoice.items?.map((item, index) => (
                                        <tr key={`${invoice.id}-${index}`} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm text-gray-900">{item.product_description || '-'}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700">{item.hsn || '-'}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700">{item.stock_group || '-'}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700">{item.stock_category || '-'}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700 text-right">₹{(item.rate || 0).toFixed(2)}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700 text-right">{item.quantity || 0}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700 text-right">{item.gst_percentage ? `${item.gst_percentage}%` : '-'}</td>
                                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">₹{(item.amount || 0).toFixed(2)}</td>
                                        </tr>
                                      )) || (
                                        <tr>
                                          <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No items found</td>
                                        </tr>
                                      )}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                      <tr>
                                        <td colSpan="7" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                          Total:
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                          ₹{(invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0).toFixed(2)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-500">No invoices found for the selected date range</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TallyInvoiceReport;