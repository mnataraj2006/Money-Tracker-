import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Format currency with Indian grouping (e.g. ₹1,23,456)
 */
function formatAmount(amount) {
  const num = Math.abs(parseFloat(amount) || 0);
  return 'Rs. ' + num.toLocaleString('en-IN');
}

function formatAmountWithSign(amount, type) {
  const num = Math.abs(parseFloat(amount) || 0);
  const formatted = num.toLocaleString('en-IN');
  if (type === 'INCOME') return '+Rs. ' + formatted;
  if (type === 'EXPENSE') return '-Rs. ' + formatted;
  if (type === 'WITHDRAWAL') return '+Rs. ' + formatted;
  return 'Rs. ' + formatted;
}

function formatTime(dateStr, createdAtStr) {
  if (createdAtStr) {
    try {
      const d = new Date(createdAtStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    } catch (e) {}
  }
  return '--:--';
}

/**
 * Generates a strictly ONE-PAGE professional Daily Financial Report PDF.
 * 
 * @param {Object} params
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @param {Object} params.summaryData - Full payload from summaryAPI.getDailyDetails(date)
 * @param {Object} [params.user] - User object
 * @param {string} [params.language] - Language code ('en' or 'ta')
 */
export async function generateDailyFinancialReport({ date, summaryData, user, language = 'en' }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12; // 12mm margins
  const contentWidth = pageWidth - (margin * 2); // 186mm

  // Format date display
  let dateFormatted = date;
  try {
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateFormatted = dateObj.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {}

  // 1. Calculations & Classifications
  const txs = summaryData.transactions || [];
  const incomeTxs = txs.filter(t => t.type === 'INCOME');
  const expenseTxs = txs.filter(t => t.type === 'EXPENSE');
  const withdrawalTxs = txs.filter(t => t.type === 'CASH_WITHDRAWAL');

  const totalIncome = summaryData.income ?? incomeTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpense = summaryData.expense ?? expenseTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const net = totalIncome - totalExpense;

  const openingCash = summaryData.openingCash ?? 0;
  const cashIncome = summaryData.cashIncome ?? incomeTxs.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const cashExpense = summaryData.cashExpense ?? expenseTxs.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const cashWithdrawal = summaryData.cashWithdrawal ?? withdrawalTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const expectedCash = summaryData.expectedCash ?? (openingCash + cashIncome - cashExpense + cashWithdrawal);
  const physicalCash = summaryData.physicalCash;
  const difference = summaryData.difference;
  const status = summaryData.status;

  const bankAccounts = summaryData.bankAccounts || [];
  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (parseFloat(b.expectedBalance) || 0), 0);
  const totalMoney = expectedCash + totalBankBalance;

  let y = margin;

  // 2. PDF HEADER
  doc.setFillColor(30, 41, 59); // Navy Primary #1E293B
  doc.rect(margin, y, contentWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CASHLY', margin + 6, y + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Daily Financial Statement', margin + 6, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(dateFormatted, pageWidth - margin - 6, y + 10, { align: 'right' });

  y += 22;

  // 3. TODAY'S SUMMARY (Income | Expense | Net)
  const colWidth = (contentWidth - 6) / 3;
  
  // Income Box
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.roundedRect(margin, y, colWidth, 14, 2, 2, 'FD');
  doc.setTextColor(22, 101, 52); // Green 800
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL INCOME', margin + (colWidth / 2), y + 4.5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatAmount(totalIncome), margin + (colWidth / 2), y + 10.5, { align: 'center' });

  // Expense Box
  const col2X = margin + colWidth + 3;
  doc.setFillColor(254, 242, 242); // Red 50
  doc.setDrawColor(254, 202, 202); // Red 200
  doc.roundedRect(col2X, y, colWidth, 14, 2, 2, 'FD');
  doc.setTextColor(153, 27, 27); // Red 800
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL EXPENSE', col2X + (colWidth / 2), y + 4.5, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatAmount(totalExpense), col2X + (colWidth / 2), y + 10.5, { align: 'center' });

  // Net Box
  const col3X = col2X + colWidth + 3;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(col3X, y, colWidth, 14, 2, 2, 'FD');
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SAVINGS', col3X + (colWidth / 2), y + 4.5, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(net >= 0 ? 22 : 153, net >= 0 ? 101 : 27, net >= 0 ? 52 : 27);
  doc.text((net >= 0 ? '+' : '-') + formatAmount(net), col3X + (colWidth / 2), y + 10.5, { align: 'center' });

  y += 18;

  // 4. CASH SUMMARY & BANK SUMMARY (Side by Side)
  const halfWidth = (contentWidth - 4) / 2;

  // Left Card: CASH SUMMARY
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, halfWidth, 34, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CASH SUMMARY', margin + 4, y + 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Opening Cash:', margin + 4, y + 10);
  doc.text(formatAmount(openingCash), margin + halfWidth - 4, y + 10, { align: 'right' });

  doc.text('+ Cash Income:', margin + 4, y + 14);
  doc.setTextColor(22, 101, 52);
  doc.text('+' + formatAmount(cashIncome), margin + halfWidth - 4, y + 14, { align: 'right' });

  doc.setTextColor(71, 85, 105);
  doc.text('+ Cash Withdrawals:', margin + 4, y + 18);
  doc.setTextColor(67, 56, 202);
  doc.text('+' + formatAmount(cashWithdrawal), margin + halfWidth - 4, y + 18, { align: 'right' });

  doc.setTextColor(71, 85, 105);
  doc.text('- Cash Expenses:', margin + 4, y + 22);
  doc.setTextColor(153, 27, 27);
  doc.text('-' + formatAmount(cashExpense), margin + halfWidth - 4, y + 22, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 4, y + 24, margin + halfWidth - 4, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Expected Cash:', margin + 4, y + 28);
  doc.text(formatAmount(expectedCash), margin + halfWidth - 4, y + 28, { align: 'right' });

  // Physical Cash Status Line
  let countStatusText = 'Physical Cash: Not counted (Pending)';
  if (physicalCash !== null && physicalCash !== undefined) {
    if (status === 'TALLIED' || difference === 0) {
      countStatusText = `Physical: ${formatAmount(physicalCash)} (TALLIED)`;
    } else if (difference < 0) {
      countStatusText = `Physical: ${formatAmount(physicalCash)} (SHORT by ${formatAmount(Math.abs(difference))})`;
    } else {
      countStatusText = `Physical: ${formatAmount(physicalCash)} (EXTRA by ${formatAmount(difference)})`;
    }
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(status === 'TALLIED' || difference === 0 ? 22 : (difference < 0 ? 153 : 71), status === 'TALLIED' || difference === 0 ? 101 : 27, 52);
  doc.text(countStatusText, margin + 4, y + 32);

  // Right Card: BANK SUMMARY
  const rightX = margin + halfWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, y, halfWidth, 34, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK SUMMARY', rightX + 4, y + 5);

  let bankY = y + 10;
  if (bankAccounts.length === 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('No bank accounts configured.', rightX + 4, bankY);
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    // Display up to 3 bank accounts neatly
    bankAccounts.slice(0, 3).forEach(acc => {
      doc.setTextColor(51, 65, 85);
      const accName = acc.name.length > 20 ? acc.name.substring(0, 18) + '...' : acc.name;
      doc.text(accName, rightX + 4, bankY);
      doc.setFont('helvetica', 'bold');
      doc.text(formatAmount(acc.expectedBalance), rightX + halfWidth - 4, bankY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      bankY += 4.5;
    });
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(rightX + 4, y + 24, rightX + halfWidth - 4, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total Bank Balance:', rightX + 4, y + 28);
  doc.text(formatAmount(totalBankBalance), rightX + halfWidth - 4, y + 28, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Active Accounts: ${bankAccounts.length}`, rightX + 4, y + 32);

  y += 38;

  // 5. TODAY'S TRANSACTIONS (INCOME FIRST, THEN EXPENSE, THEN CASH WITHDRAWALS)
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text("TODAY'S TRANSACTIONS", margin, y);
  y += 3;

  // Helper to format table rows
  const formatRows = (list, type) => {
    return list.map(tx => {
      const timeStr = formatTime(tx.date, tx.createdAt);
      const txName = (tx.transactionName && tx.transactionName.trim()) 
        ? tx.transactionName.trim() 
        : ((tx.name && tx.name.trim()) ? tx.name.trim() : (type === 'WITHDRAWAL' ? 'Cash Withdrawal' : 'Unnamed Transaction'));
      const desc = tx.description ? ` (${tx.description})` : '';
      const method = tx.paymentMethod === 'CASH' ? 'CASH' : 'UPI';
      const account = tx.paymentMethod === 'CASH' ? '—' : (tx.accountName || 'Bank');
      const amt = formatAmountWithSign(tx.amount, type);
      return [timeStr, txName + desc, method, account, amt];
    });
  };

  // Section A: INCOME TABLE
  const incomeRows = formatRows(incomeTxs, 'INCOME');
  if (incomeRows.length === 0) {
    incomeRows.push(['--', 'No income recorded for this day', '--', '--', 'Rs. 0']);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Time', 'Income Transaction', 'Method', 'Account', 'Amount']],
    body: incomeRows,
    foot: [['', `Total Income (${incomeTxs.length} records)`, '', '', formatAmount(totalIncome)]],
    theme: 'striped',
    headStyles: {
      fillColor: [22, 101, 52], // Green 800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 1.5
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.5
    },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [22, 101, 52],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 1.5
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 32 },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    }
  });

  y = doc.lastAutoTable.finalY + 4;

  // Section B: EXPENSE TABLE
  const expenseRows = formatRows(expenseTxs, 'EXPENSE');
  if (expenseRows.length === 0) {
    expenseRows.push(['--', 'No expenses recorded for this day', '--', '--', 'Rs. 0']);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Time', 'Expense Transaction', 'Method', 'Account', 'Amount']],
    body: expenseRows,
    foot: [['', `Total Expense (${expenseTxs.length} records)`, '', '', formatAmount(totalExpense)]],
    theme: 'striped',
    headStyles: {
      fillColor: [153, 27, 27], // Red 800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 1.5
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.5
    },
    footStyles: {
      fillColor: [254, 242, 242],
      textColor: [153, 27, 27],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 1.5
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 32 },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    }
  });

  y = doc.lastAutoTable.finalY + 4;

  // Section C: CASH WITHDRAWALS (if any)
  if (withdrawalTxs.length > 0) {
    const withdrawalRows = withdrawalTxs.map(tx => {
      const timeStr = formatTime(tx.date, tx.createdAt);
      const txName = (tx.transactionName && tx.transactionName.trim()) ? tx.transactionName.trim() : 'ATM Cash Withdrawal';
      const transferRoute = `${tx.accountName || 'Bank'} -> CASH`;
      const amt = formatAmount(tx.amount);
      return [timeStr, txName, 'TRANSFER', transferRoute, '+' + amt];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Time', 'Cash Withdrawal (Bank -> Cash)', 'Type', 'Transfer', 'Amount']],
      body: withdrawalRows,
      theme: 'plain',
      headStyles: {
        fillColor: [67, 56, 202], // Indigo 700
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 1.5
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [67, 56, 202],
        cellPadding: 1.5
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 32 },
        4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
      }
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // 6. FINAL POSITION & FOOTER (Placed at the bottom of the single page)
  const bottomCardY = Math.max(y, pageHeight - 32);

  doc.setFillColor(30, 41, 59); // Slate 800
  doc.roundedRect(margin, bottomCardY, contentWidth, 18, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FINAL POSITION', margin + 6, bottomCardY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Cash: ${formatAmount(expectedCash)}    |    Bank: ${formatAmount(totalBankBalance)}`, margin + 6, bottomCardY + 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL MONEY: ${formatAmount(totalMoney)}`, pageWidth - margin - 6, bottomCardY + 10, { align: 'right' });

  // Footer Line
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const timestamp = new Date().toLocaleString('en-IN');
  doc.text(`Generated by Cashly • ${timestamp} • Page 1 of 1`, pageWidth / 2, pageHeight - 4, { align: 'center' });

  // 7. Save / Trigger Download
  const filename = `Cashly_Daily_Report_${date}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      // Extract base64 from jsPDF output
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // Save file directly to device Documents folder
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: pdfBase64,
        directory: Directory.Documents,
        recursive: true
      });

      // Prompt native Android Open/Share/Save dialog
      try {
        await Share.share({
          title: `Cashly Daily Report (${date})`,
          text: `Cashly Daily Financial Statement for ${date}`,
          url: savedFile.uri,
          dialogTitle: 'Save / Open PDF Report'
        });
      } catch (shareErr) {
        console.log('Share sheet dismissed or closed:', shareErr);
      }

      return filename;
    } catch (nativeErr) {
      console.warn('Native Filesystem write error, falling back to doc.save:', nativeErr);
      doc.save(filename);
      return filename;
    }
  } else {
    // Standard Desktop Browser Download
    doc.save(filename);
    return filename;
  }
}
