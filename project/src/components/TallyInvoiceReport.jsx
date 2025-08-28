import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { getInvoices } from '../services/api';
import './TallyInvoiceReport.css';

const TallyInvoiceReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const fetchInvoices = async (start = '', end = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInvoices(start, end);
      if (response.success) {
        setInvoices(response.data);
        if (response.data.length === 0) {
          toast.error(response.message || 'No invoices found');
        } else {
          toast.success(response.message);
        }
      } else {
        setError(response.message);
        toast.error(response.message);
      }
    } catch (error) {
      const errorMessage = 'Failed to fetch invoices. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error fetching invoices:', error);
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

  // Automatically fetch invoices when startDate or endDate changes
  useEffect(() => {
    // Only fetch if at least one date is selected and dates are valid
    if (startDate || endDate) {
      if (startDate && endDate && moment(endDate).isBefore(moment(startDate))) {
        toast.error('End date cannot be before start date');
        setInvoices([]);
        setError('Invalid date range');
        return;
      }
      fetchInvoices(startDate, endDate);
    } else {
      // Fetch all invoices when both dates are cleared
      fetchInvoices();
    }
  }, [startDate, endDate]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchInvoices();
  }, []);

  const exportToExcel = () => {
    if (!invoices.length) {
      toast.error('No invoices to export');
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
    toast.success('Report exported successfully');
  };

  return (
    <div className="tally-invoice-container">
      <div className="tally-invoice-header">
        <h1>Tally Invoice Report</h1>
        <div className="date-filter-export">
          <div className="date-filter">
            <label>
              Start Date:
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              End Date:
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <button onClick={exportToExcel} className="export-button">
            Export Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading invoices...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : invoices.length > 0 ? (
        <div className="invoices-table-container">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Invoice Date</th>
                <th>Total Items</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <React.Fragment key={invoice.id}>
                  <tr
                    onClick={() => toggleInvoiceExpansion(invoice.id)}
                    className="invoice-row"
                  >
                    <td>{invoice.invoice_id || '-'}</td>
                    <td>{invoice.customer_name || '-'}</td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{invoice.items?.length || 0}</td>
                    <td>
                      ₹{(invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0).toLocaleString()}
                    </td>
                  </tr>
                  {expandedInvoiceId === invoice.id && (
                    <tr className="invoice-details-row">
                      <td colSpan="5">
                        <div className="invoice-details-container">
                          <div className="invoice-meta">
                            <div>
                              <strong>Order ID:</strong> {invoice.order_id || '-'}
                            </div>
                            <div>
                              <strong>Order Date:</strong> {formatDate(invoice.order_date)}
                            </div>
                            <div>
                              <strong>Customer Mobile:</strong> {invoice.customer_mobile || '-'}
                            </div>
                            <div>
                              <strong>Voucher Date:</strong> {formatDate(invoice.voucher_date)}
                            </div>
                          </div>

                          <table className="invoice-items-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>HSN</th>
                                <th>Stock Group</th>
                                <th>Category</th>
                                <th>Rate</th>
                                <th>Qty</th>
                                <th>GST %</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.items?.map((item, index) => (
                                <tr key={`${invoice.id}-${index}`}>
                                  <td>{item.product_description || '-'}</td>
                                  <td>{item.hsn || '-'}</td>
                                  <td>{item.stock_group || '-'}</td>
                                  <td>{item.stock_category || '-'}</td>
                                  <td>₹{(item.rate || 0).toFixed(2)}</td>
                                  <td>{item.quantity || 0}</td>
                                  <td>{item.gst_percentage ? `${item.gst_percentage}%` : '-'}</td>
                                  <td>₹{(item.amount || 0).toFixed(2)}</td>
                                </tr>
                              )) || (
                                <tr>
                                  <td colSpan="8">No items found</td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan="7" className="total-label">
                                  Total:
                                </td>
                                <td className="total-amount">
                                  ₹{(invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0).toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
           </table>
        </div>
      ) : (
        <div className="no-invoices">No invoices found for the selected date range</div>
      )}
    </div>
  );
};

export default TallyInvoiceReport;