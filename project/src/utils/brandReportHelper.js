import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBrandReportPDF = (productReport, reportInfo) => {
  const { fromDate, toDate, orderType, totalOrders } = reportInfo;
  const { productList, totals, milkTotals, curdTotals } = productReport;

  // Create new PDF document
  const pdf = new jsPDF();
  
  // Set font
  pdf.setFont('helvetica', 'normal');

  // Add header
  pdf.setFontSize(20);
  pdf.text('BRAND WISE REPORT', 105, 20, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(`Date: ${fromDate} to ${toDate}`, 20, 35);
  pdf.text(`Order Type: ${orderType}`, 20, 42);
  pdf.text(`Total Orders: ${totalOrders}`, 20, 49);

  // Prepare table data
  const tableData = productList.map((product, index) => [
    index + 1,
    product.name,
    product.crates.toFixed(2),
    product.baseUnitQuantity.toFixed(2),
    product.packets.toFixed(0)
  ]);

  // Add separator rows for totals
  const milkSeparator = ['', '', '', '', ''];
  const curdSeparator = ['', '', '', '', ''];
  const grandTotalSeparator = ['', '', '', '', ''];

  // Insert separators and totals
  const finalTableData = [];
  let currentIndex = 0;
  
  // Add milk products
  const milkProducts = productList.filter(p => 
    p.category.toLowerCase().includes('milk') || p.name.toLowerCase().includes('milk')
  );
  const curdProducts = productList.filter(p => 
    p.category.toLowerCase().includes('curd') || p.name.toLowerCase().includes('curd')
  );

  // Add milk products
  milkProducts.forEach((product, index) => {
    const productIndex = productList.findIndex(p => p.name === product.name);
    finalTableData.push([
      productIndex + 1,
      product.name,
      product.crates.toFixed(2),
      product.baseUnitQuantity.toFixed(2),
      product.packets.toFixed(0)
    ]);
  });

  // Add milk totals
  finalTableData.push(milkSeparator);
  finalTableData.push(['', 'TOTAL MILK', milkTotals.crates.toFixed(2), milkTotals.liters.toFixed(2), milkTotals.packets.toFixed(0)]);

  // Add curd products
  curdProducts.forEach((product, index) => {
    const productIndex = productList.findIndex(p => p.name === product.name);
    finalTableData.push([
      productIndex + 1,
      product.name,
      product.crates.toFixed(2),
      product.baseUnitQuantity.toFixed(2),
      product.packets.toFixed(0)
    ]);
  });

  // Add curd totals
  finalTableData.push(curdSeparator);
  finalTableData.push(['', 'TOTAL CURD', curdTotals.crates.toFixed(2), curdTotals.liters.toFixed(2), curdTotals.packets.toFixed(0)]);

  // Add grand total
  finalTableData.push(grandTotalSeparator);
  finalTableData.push(['', 'G.TOTAL (Crates & Ltr)', totals.totalCrates.toFixed(2), totals.totalLiters.toFixed(2), totals.totalPackets.toFixed(0)]);

  // Generate table
  autoTable(pdf, {
    head: [['SL NO', 'Particulars', 'Total Crates', 'Total Milk Ltr', 'Total Packets']],
    body: finalTableData,
    startY: 60,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didParseCell: function (data) {
      // Style separator rows
      if (data.row.raw[1] && data.row.raw[1].includes('---')) {
        data.cell.styles.fillColor = [200, 200, 200];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [50, 50, 50];
      }
      // Style total rows
      if (data.row.raw[1] && (data.row.raw[1].includes('TOTAL') || data.row.raw[1].includes('G.TOTAL'))) {
        data.cell.styles.fillColor = [52, 152, 219];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    columnStyles: {
      0: { cellWidth: 15 }, // SL NO
      1: { cellWidth: 80 }, // Particulars
      2: { cellWidth: 25 }, // Total Crates
      3: { cellWidth: 25 }, // Total Milk Ltr
      4: { cellWidth: 25 }, // Total Packets
    },
  });

  return pdf;
};

export const downloadBrandReportPDF = (productReport, reportInfo) => {
  const pdf = generateBrandReportPDF(productReport, reportInfo);
  const fileName = `BrandReport_${reportInfo.fromDate}_to_${reportInfo.toDate}_${reportInfo.orderType}.pdf`;
  pdf.save(fileName);
};

export const viewBrandReportPDF = (productReport, reportInfo) => {
  const pdf = generateBrandReportPDF(productReport, reportInfo);
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Open PDF in new tab
  window.open(pdfUrl, '_blank');
  
  // Clean up the URL after a delay
  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 1000);
};

export const formatReportData = (productReport) => {
  const { productList, totals, milkTotals, curdTotals } = productReport;
  
  // Separate milk and curd products
  const milkProducts = productList.filter(p => 
    p.category.toLowerCase().includes('milk') || p.name.toLowerCase().includes('milk')
  );
  const curdProducts = productList.filter(p => 
    p.category.toLowerCase().includes('curd') || p.name.toLowerCase().includes('curd')
  );

  return {
    milkProducts,
    curdProducts,
    totals,
    milkTotals,
    curdTotals
  };
};
