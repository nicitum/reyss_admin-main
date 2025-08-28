import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { getReceipts } from '../services/api';
import './TallyReceiptPage.css';

const TallyReceiptPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReceipts = async () => {
    console.log("Fetching receipts...");
    try {
      setLoading(true);
      setError(null);
      const data = await getReceipts();
      console.log("Fetched receipts:", data);
      if (!data.length) {
        setError("No receipts found");
        toast.error("No receipts found");
        setFilteredReceipts([]);
        setReceipts([]);
        return;
      }
      setReceipts(data);
      setFilteredReceipts(data);

      // Set date range from API response
      const dates = data.map(r => moment(r.payment_date, 'YYYY-MM-DD'));
      const minDate = moment.min(dates).format('YYYY-MM-DD');
      const maxDate = moment.max(dates).format('YYYY-MM-DD');
      setStartDate(minDate);
      setEndDate(maxDate);
      console.log("Set date range:", { minDate, maxDate });
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

  useEffect(() => {
    console.log("useEffect: Fetching receipts");
    fetchReceipts();
  }, []);

  return (
    <div className="tally-receipt-container">
      <div className="tally-receipt-header">
        <h1>Tally Receipt Report</h1>
        <div className="date-filter-export">
          <div className="date-filter">
            <label>
              Start Date:
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  filterReceipts(e.target.value, endDate);
                }}
              />
            </label>
            <label>
              End Date:
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  filterReceipts(startDate, e.target.value);
                }}
              />
            </label>
          </div>
          <button onClick={exportToExcel} className="export-button">
            Export Report
          </button>
        </div>
      </div>

      {loading && <div className="loading-spinner">Loading receipts...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && !error && filteredReceipts.length === 0 && (
        <div className="no-receipts">No receipts found</div>
      )}
      {!loading && !error && filteredReceipts.length > 0 && (
        <div className="receipts-table-container">
          <table className="receipts-table">
            <thead>
              <tr>
                <th>Vch No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment Method</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map(receipt => (
                <tr key={receipt.transaction_id}>
                  <td>{receipt.transaction_id || '-'}</td>
                  <td>{formatDate(receipt.payment_date)}</td>
                  <td>{receipt.customer_name || '-'}</td>
                  <td>{receipt.payment_method || '-'}</td>
                  <td>₹{(receipt.payment_amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TallyReceiptPage;