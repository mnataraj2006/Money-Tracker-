import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Format currency with Indian grouping
 */
function formatCurrency(amount) {
  const num = Math.abs(parseFloat(amount) || 0);
  return '₹' + num.toLocaleString('en-IN');
}

function formatSignedCurrency(amount, isPositive) {
  const num = Math.abs(parseFloat(amount) || 0);
  const formatted = num.toLocaleString('en-IN');
  return (isPositive ? '+₹' : '-₹') + formatted;
}

function formatTime(createdAtStr) {
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

function formatDateDisplay(dateStr, isTamil) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(isTamil ? 'ta-IN' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatShortDate(dateStr, isTamil) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(isTamil ? 'ta-IN' : 'en-US', {
      day: '2-digit',
      month: 'short'
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Save / Share PDF helper function
 */
async function saveOrSharePdf(doc, filename, title) {
  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: pdfBase64,
        directory: Directory.Documents,
        recursive: true
      });

      try {
        await Share.share({
          title: title || filename,
          text: title || 'Cashly Financial Statement',
          url: savedFile.uri,
          dialogTitle: 'Save / Open PDF Report'
        });
      } catch (shareErr) {
        console.log('Share dismissed:', shareErr);
      }

      return filename;
    } catch (nativeErr) {
      console.warn('Native write failed, falling back to doc.save:', nativeErr);
      doc.save(filename);
      return filename;
    }
  } else {
    doc.save(filename);
    return filename;
  }
}

/**
 * Helper to render an HTML DOM element to a canvas
 */
async function renderElementToCanvas(container) {
  document.body.appendChild(container);
  try {
    return await html2canvas(container, {
      scale: 2.2, // Crisp 200+ DPI
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF'
    });
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * 1. SINGLE-DAY FINANCIAL REPORT PDF GENERATOR (STRICTLY ONE-PAGE)
 */
export async function generateDailyFinancialReport({ date, summaryData, user, language = 'en' }) {
  const isTamil = language === 'ta';
  const dateFormatted = formatDateDisplay(date, isTamil);

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

  // Labels
  const L = {
    title: 'CASHLY',
    subtitle: isTamil ? 'தினசரி நிதி அறிக்கை' : 'Daily Financial Statement',
    totalIncome: isTamil ? 'மொத்த வரவு' : 'TOTAL INCOME',
    totalExpense: isTamil ? 'மொத்த செலவு' : 'TOTAL EXPENSE',
    netSavings: isTamil ? 'நிகர சேமிப்பு' : 'NET SAVINGS',
    cashSummary: isTamil ? 'ரொக்க விவரம்' : 'CASH SUMMARY',
    openingCash: isTamil ? 'தொடக்க ரொக்கம்:' : 'Opening Cash:',
    plusCashIncome: isTamil ? '+ ரொக்க வரவு:' : '+ Cash Income:',
    plusCashWithdrawal: isTamil ? '+ ரொக்க எடுப்பு:' : '+ Cash Withdrawals:',
    minusCashExpense: isTamil ? '- ரொக்கச் செலவு:' : '- Cash Expenses:',
    expectedCash: isTamil ? 'எதிர்பார்க்கப்படும் ரொக்கம்:' : 'Expected Cash:',
    physicalCash: isTamil ? 'கையில் உள்ள ரொக்கம்' : 'Physical Cash',
    tallied: isTamil ? 'சரிபார்க்கப்பட்டது (TALLIED)' : 'TALLIED (MATCHED)',
    short: isTamil ? 'குறைவு (SHORT)' : 'SHORT',
    extra: isTamil ? 'கூடுதல் (EXTRA)' : 'EXTRA',
    notCounted: isTamil ? 'சரிபார்க்கப்படவில்லை' : 'Not counted (Pending)',
    bankSummary: isTamil ? 'வங்கி கணக்குகள்' : 'BANK SUMMARY',
    totalBankBalance: isTamil ? 'மொத்த வங்கி இருப்பு:' : 'Total Bank Balance:',
    noBanks: isTamil ? 'வங்கி கணக்குகள் இல்லை' : 'No bank accounts configured',
    todaysTxs: isTamil ? 'இன்றைய பரிவர்த்தனைகள்' : "TODAY'S TRANSACTIONS",
    incomeSection: isTamil ? 'வரவு பதிவுகள்' : 'INCOME RECORDS',
    expenseSection: isTamil ? 'செலவு பதிவுகள்' : 'EXPENSE RECORDS',
    withdrawalSection: isTamil ? 'ரொக்க எடுப்புகள் (வங்கி -> ரொக்கம்)' : 'CASH WITHDRAWALS (Bank -> Cash)',
    noIncome: isTamil ? 'இன்று வரவு பதிவுகள் எதுவும் இல்லை' : 'No income recorded for this day',
    noExpense: isTamil ? 'இன்று செலவு பதிவுகள் எதுவும் இல்லை' : 'No expenses recorded for this day',
    time: isTamil ? 'நேரம்' : 'Time',
    txName: isTamil ? 'பரிவர்த்தனை' : 'Transaction',
    method: isTamil ? 'முறை' : 'Method',
    account: isTamil ? 'கணக்கு' : 'Account',
    amount: isTamil ? 'தொகை' : 'Amount',
    type: isTamil ? 'வகை' : 'Type',
    transfer: isTamil ? 'பரிமாற்றம்' : 'Transfer',
    finalPosition: isTamil ? 'இறுதி இருப்பு நிலை' : 'FINAL POSITION',
    cash: isTamil ? 'ரொக்கம்' : 'Cash',
    bank: isTamil ? 'வங்கி' : 'Bank',
    totalMoney: isTamil ? 'மொத்த பணம்' : 'TOTAL MONEY',
    generatedBy: isTamil ? 'Cashly மூலம் உருவாக்கப்பட்டது' : 'Generated by Cashly',
    unnamedTx: isTamil ? 'பெயரிடப்படாத பரிவர்த்தனை' : 'Unnamed Transaction',
    cashWithdrawalTx: isTamil ? 'ரொக்க எடுப்பு' : 'Cash Withdrawal'
  };

  // Physical status string
  let countStatusBadge = L.notCounted;
  let countStatusColor = '#64748B';
  if (physicalCash !== null && physicalCash !== undefined) {
    if (status === 'TALLIED' || difference === 0) {
      countStatusBadge = `✓ ${L.tallied} (${formatCurrency(physicalCash)})`;
      countStatusColor = '#15803D';
    } else if (difference < 0) {
      countStatusBadge = `⚠ ${L.short} by ${formatCurrency(difference)} (${formatCurrency(physicalCash)})`;
      countStatusColor = '#B91C1C';
    } else {
      countStatusBadge = `⚠ ${L.extra} by ${formatCurrency(difference)} (${formatCurrency(physicalCash)})`;
      countStatusColor = '#B45309';
    }
  }

  // Create A4 Container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.maxHeight = '1123px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#0F172A';
  container.style.fontFamily = "'Noto Sans Tamil', 'Mukta Malar', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.boxSizing = 'border-box';
  container.style.padding = '24px 28px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.zIndex = '-1000';

  const buildTxRows = (list, type) => {
    if (list.length === 0) {
      const emptyText = type === 'INCOME' ? L.noIncome : L.noExpense;
      return `<tr><td colspan="5" style="text-align: center; padding: 6px; color: #94A3B8; font-style: italic; font-size: 11px;">${emptyText}</td></tr>`;
    }
    return list.map((tx, idx) => {
      const timeStr = formatTime(tx.createdAt || tx.date);
      const title = (tx.transactionName && tx.transactionName.trim())
        ? tx.transactionName.trim()
        : ((tx.name && tx.name.trim()) ? tx.name.trim() : (type === 'WITHDRAWAL' ? L.cashWithdrawalTx : L.unnamedTx));
      const descHtml = tx.description ? `<div style="color: #64748B; font-size: 9.5px; margin-top: 1px;">${tx.description}</div>` : '';
      const methodLabel = tx.paymentMethod === 'CASH' ? 'CASH' : 'UPI';
      const accountLabel = tx.paymentMethod === 'CASH' ? '—' : (tx.accountName || 'Bank');
      const isPos = type === 'INCOME' || type === 'WITHDRAWAL';
      const amtColor = type === 'INCOME' ? '#16A34A' : (type === 'EXPENSE' ? '#DC2626' : '#4338CA');
      const amtText = formatSignedCurrency(tx.amount, isPos);
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

      return `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 4px 6px; font-size: 11px; color: #64748B; text-align: center;">${timeStr}</td>
          <td style="padding: 4px 6px; font-size: 11.5px; font-weight: 700; color: #1E293B;">
            ${title}
            ${descHtml}
          </td>
          <td style="padding: 4px 6px; font-size: 10px; font-weight: 800; text-align: center; color: ${tx.paymentMethod === 'CASH' ? '#15803D' : '#4338CA'};">${methodLabel}</td>
          <td style="padding: 4px 6px; font-size: 11px; color: #475569;">${accountLabel}</td>
          <td style="padding: 4px 6px; font-size: 11.5px; font-weight: 800; text-align: right; color: ${amtColor};">${amtText}</td>
        </tr>
      `;
    }).join('');
  };

  const withdrawalRowsHtml = withdrawalTxs.map((tx, idx) => {
    const timeStr = formatTime(tx.createdAt || tx.date);
    const title = (tx.transactionName && tx.transactionName.trim()) ? tx.transactionName.trim() : L.cashWithdrawalTx;
    const descHtml = tx.description ? `<div style="color: #64748B; font-size: 9.5px; margin-top: 1px;">${tx.description}</div>` : '';
    const transferRoute = `${tx.accountName || 'Bank'} → CASH`;
    const amtText = '+' + formatCurrency(tx.amount);
    const bg = idx % 2 === 0 ? '#EEF2FF' : '#F5F3FF';
    return `
      <tr style="background-color: ${bg}; border-bottom: 1px solid #E0E7FF;">
        <td style="padding: 4px 6px; font-size: 11px; color: #4338CA; text-align: center;">${timeStr}</td>
        <td style="padding: 4px 6px; font-size: 11.5px; font-weight: 700; color: #312E81;">
          ${title}
          ${descHtml}
        </td>
        <td style="padding: 4px 6px; font-size: 10px; font-weight: 800; text-align: center; color: #4338CA;">TRANSFER</td>
        <td style="padding: 4px 6px; font-size: 11px; font-weight: 700; color: #4338CA;">${transferRoute}</td>
        <td style="padding: 4px 6px; font-size: 11.5px; font-weight: 800; text-align: right; color: #4338CA;">${amtText}</td>
      </tr>
    `;
  }).join('');

  const bankRowsHtml = bankAccounts.length === 0
    ? `<div style="font-size: 11px; color: #64748B; font-style: italic;">${L.noBanks}</div>`
    : bankAccounts.slice(0, 3).map(b => `
        <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
          <span style="color: #334155;">${b.name}</span>
          <span style="font-weight: 700; color: #0F172A;">${formatCurrency(b.expectedBalance)}</span>
        </div>
      `).join('');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <!-- 1. HEADER -->
      <div style="background-color: #1E293B; border-radius: 8px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; color: #FFFFFF;">
        <div>
          <div style="font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">${L.title}</div>
          <div style="font-size: 12px; color: #CBD5E1; font-weight: 600; margin-top: 1px;">${L.subtitle}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF;">${dateFormatted}</div>
        </div>
      </div>

      <!-- 2. TOTALS ROW -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 10.5px; font-weight: 800; color: #166534; text-transform: uppercase;">${L.totalIncome}</div>
          <div style="font-size: 17px; font-weight: 900; color: #15803D; margin-top: 2px;">${formatCurrency(totalIncome)}</div>
        </div>
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 10.5px; font-weight: 800; color: #991B1B; text-transform: uppercase;">${L.totalExpense}</div>
          <div style="font-size: 17px; font-weight: 900; color: #DC2626; margin-top: 2px;">${formatCurrency(totalExpense)}</div>
        </div>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 10.5px; font-weight: 800; color: #1E293B; text-transform: uppercase;">${L.netSavings}</div>
          <div style="font-size: 17px; font-weight: 900; color: ${net >= 0 ? '#15803D' : '#DC2626'}; margin-top: 2px;">
            ${net >= 0 ? '+' : '-'}${formatCurrency(net)}
          </div>
        </div>
      </div>

      <!-- 3. CASH & BANK SUMMARY -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; margin-bottom: 6px; text-transform: uppercase;">${L.cashSummary}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #475569;">
            <span>${L.openingCash}</span>
            <span style="font-weight: 700; color: #0F172A;">${formatCurrency(openingCash)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>${L.plusCashIncome}</span>
            <span style="font-weight: 700;">+${formatCurrency(cashIncome)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #4338CA;">
            <span>${L.plusCashWithdrawal}</span>
            <span style="font-weight: 700;">+${formatCurrency(cashWithdrawal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #991B1B;">
            <span>${L.minusCashExpense}</span>
            <span style="font-weight: 700;">-${formatCurrency(cashExpense)}</span>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 4px; display: flex; justify-content: space-between; font-weight: 800; color: #1E293B; font-size: 12.5px;">
            <span>${L.expectedCash}</span>
            <span>${formatCurrency(expectedCash)}</span>
          </div>
          <div style="margin-top: 4px; font-size: 10.5px; font-weight: 800; color: ${countStatusColor};">
            ${countStatusBadge}
          </div>
        </div>

        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; margin-bottom: 6px; text-transform: uppercase;">${L.bankSummary}</div>
            ${bankRowsHtml}
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 4px; display: flex; justify-content: space-between; font-weight: 800; color: #1E293B; font-size: 12.5px; margin-top: 4px;">
            <span>${L.totalBankBalance}</span>
            <span>${formatCurrency(totalBankBalance)}</span>
          </div>
        </div>
      </div>

      <!-- 4. TRANSACTIONS SECTION -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 2px;">
        <div style="font-size: 12.5px; font-weight: 800; color: #1E293B; text-transform: uppercase; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 4px;">
          ${L.todaysTxs}
        </div>

        <!-- INCOME TABLE -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #166534; color: #FFFFFF;">
              <th style="padding: 4px 6px; text-align: center; width: 60px;">${L.time}</th>
              <th style="padding: 4px 6px; text-align: left;">${L.incomeSection}</th>
              <th style="padding: 4px 6px; text-align: center; width: 60px;">${L.method}</th>
              <th style="padding: 4px 6px; text-align: left; width: 120px;">${L.account}</th>
              <th style="padding: 4px 6px; text-align: right; width: 90px;">${L.amount}</th>
            </tr>
          </thead>
          <tbody>
            ${buildTxRows(incomeTxs, 'INCOME')}
          </tbody>
          <tfoot>
            <tr style="background-color: #F0FDF4; font-weight: 800; color: #166534; border-top: 1px solid #BBF7D0;">
              <td colspan="4" style="padding: 4px 6px;">${L.totalIncome} (${incomeTxs.length})</td>
              <td style="padding: 4px 6px; text-align: right;">${formatCurrency(totalIncome)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- EXPENSE TABLE -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px;">
          <thead>
            <tr style="background-color: #991B1B; color: #FFFFFF;">
              <th style="padding: 4px 6px; text-align: center; width: 60px;">${L.time}</th>
              <th style="padding: 4px 6px; text-align: left;">${L.expenseSection}</th>
              <th style="padding: 4px 6px; text-align: center; width: 60px;">${L.method}</th>
              <th style="padding: 4px 6px; text-align: left; width: 120px;">${L.account}</th>
              <th style="padding: 4px 6px; text-align: right; width: 90px;">${L.amount}</th>
            </tr>
          </thead>
          <tbody>
            ${buildTxRows(expenseTxs, 'EXPENSE')}
          </tbody>
          <tfoot>
            <tr style="background-color: #FEF2F2; font-weight: 800; color: #991B1B; border-top: 1px solid #FECACA;">
              <td colspan="4" style="padding: 4px 6px;">${L.totalExpense} (${expenseTxs.length})</td>
              <td style="padding: 4px 6px; text-align: right;">${formatCurrency(totalExpense)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- CASH WITHDRAWALS (if any) -->
        ${withdrawalTxs.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px;">
            <thead>
              <tr style="background-color: #4338CA; color: #FFFFFF;">
                <th style="padding: 4px 6px; text-align: center; width: 60px;">${L.time}</th>
                <th style="padding: 4px 6px; text-align: left;">${L.withdrawalSection}</th>
                <th style="padding: 4px 6px; text-align: center; width: 60px;">${L.type}</th>
                <th style="padding: 4px 6px; text-align: left; width: 120px;">${L.transfer}</th>
                <th style="padding: 4px 6px; text-align: right; width: 90px;">${L.amount}</th>
              </tr>
            </thead>
            <tbody>
              ${withdrawalRowsHtml}
            </tbody>
          </table>
        ` : ''}
      </div>
    </div>

    <!-- 5. FINAL POSITION & FOOTER -->
    <div style="margin-top: 12px;">
      <div style="background-color: #1E293B; border-radius: 8px; padding: 10px 16px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase;">${L.finalPosition}</div>
          <div style="font-size: 12px; color: #CBD5E1; margin-top: 2px;">
            ${L.cash}: <strong style="color: #FFFFFF;">${formatCurrency(expectedCash)}</strong> &nbsp;|&nbsp; 
            ${L.bank}: <strong style="color: #FFFFFF;">${formatCurrency(totalBankBalance)}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase;">${L.totalMoney}</div>
          <div style="font-size: 18px; font-weight: 900; color: #FFFFFF; margin-top: 1px;">${formatCurrency(totalMoney)}</div>
        </div>
      </div>

      <div style="text-align: center; font-size: 9.5px; color: #94A3B8; margin-top: 8px;">
        ${L.generatedBy} • ${new Date().toLocaleString(isTamil ? 'ta-IN' : 'en-IN')} • Page 1 of 1
      </div>
    </div>
  `;

  const canvas = await renderElementToCanvas(container);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

  const filename = `Cashly_Daily_Report_${date}.pdf`;
  return await saveOrSharePdf(doc, filename, `Cashly Daily Statement (${date})`);
}

/**
 * 2. COMPREHENSIVE REDESIGNED DATE RANGE (MULTI-PAGE) FINANCIAL REPORT GENERATOR
 */
export async function generateDateRangeFinancialReport({ fromDate, toDate, rangeData, user, language = 'en' }) {
  // If From Date and To Date are the same, automatically use the existing Single-Day Daily Report
  if (fromDate === toDate) {
    return await generateDailyFinancialReport({
      date: fromDate,
      summaryData: {
        ...rangeData,
        income: rangeData.totalIncome,
        expense: rangeData.totalExpense,
        net: rangeData.netSavings,
        expectedCash: rangeData.closingCash
      },
      user,
      language
    });
  }

  const isTamil = language === 'ta';
  const fromFormatted = formatDateDisplay(fromDate, isTamil);
  const toFormatted = formatDateDisplay(toDate, isTamil);
  const periodTitle = `${fromFormatted} – ${toFormatted}`;

  const totalIncome = rangeData.totalIncome || 0;
  const totalExpense = rangeData.totalExpense || 0;
  const netSavings = rangeData.netSavings || (totalIncome - totalExpense);
  const openingCash = rangeData.openingCash || 0;
  const closingCash = rangeData.closingCash || (openingCash + (rangeData.netCashChange || 0));
  const cashIncome = rangeData.cashIncome || 0;
  const cashExpense = rangeData.cashExpense || 0;
  const cashWithdrawal = rangeData.cashWithdrawal || 0;
  const netCashChange = rangeData.netCashChange || (cashIncome - cashExpense + cashWithdrawal);
  const upiIncome = rangeData.upiIncome || 0;
  const upiExpense = rangeData.upiExpense || 0;
  const netUpiChange = rangeData.netUpiChange || (upiIncome - upiExpense - cashWithdrawal);

  const bankAccounts = rangeData.bankAccounts || [];
  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (parseFloat(b.expectedBalance) || 0), 0);
  const totalMoney = closingCash + totalBankBalance;

  const dailyBreakdown = rangeData.dailyBreakdown || [];
  const txs = rangeData.transactions || [];
  const counts = rangeData.counts || {
    totalTransactions: txs.length,
    incomeCount: txs.filter(t => t.type === 'INCOME').length,
    expenseCount: txs.filter(t => t.type === 'EXPENSE').length,
    cashTxCount: txs.filter(t => t.paymentMethod === 'CASH').length,
    upiTxCount: txs.filter(t => t.paymentMethod !== 'CASH').length
  };
  const highlights = rangeData.highlights || {};

  const incomeTxs = txs.filter(t => t.type === 'INCOME');
  const expenseTxs = txs.filter(t => t.type === 'EXPENSE');
  const withdrawalTxs = txs.filter(t => t.type === 'CASH_WITHDRAWAL');

  const L = {
    title: 'CASHLY',
    subtitle: isTamil ? 'நிதி வரம்பு அறிக்கை' : 'Financial Range Report',
    period: isTamil ? 'காலம்:' : 'Period:',
    days: isTamil ? 'நாட்கள்' : 'Days',
    executiveSummary: isTamil ? 'செயல்முறை சுருக்கம்' : 'EXECUTIVE SUMMARY',
    totalIncome: isTamil ? 'மொத்த வரவு' : 'TOTAL INCOME',
    totalExpense: isTamil ? 'மொத்த செலவு' : 'TOTAL EXPENSE',
    netChange: isTamil ? 'நிகர மாற்றம்' : 'NET CHANGE',
    expectedCash: isTamil ? 'எதிர்பார்க்கப்படும் ரொக்கம்' : 'EXPECTED CASH',
    cashActivity: isTamil ? 'ரொக்க இயக்கம் (CASH ACTIVITY)' : 'CASH ACTIVITY',
    upiActivity: isTamil ? 'வங்கி / UPI இயக்கம் (BANK & UPI)' : 'UPI / BANK ACTIVITY',
    openingCash: isTamil ? 'தொடக்க ரொக்கம்' : 'Opening Cash',
    closingCash: isTamil ? 'முடிவு / எதிர்பார்க்கப்படும் ரொக்கம்' : 'Closing Expected Cash',
    cashIncome: isTamil ? 'ரொக்க வரவு' : 'Cash Income',
    cashExpense: isTamil ? 'ரொக்கச் செலவு' : 'Cash Expense',
    atmWithdrawal: isTamil ? 'வங்கி ரொக்க எடுப்பு (ATM)' : 'ATM Cash Withdrawal',
    netCashMovement: isTamil ? 'நிகர ரொக்க மாற்றம்' : 'Net Cash Movement',
    upiIncome: isTamil ? 'UPI / வங்கி வரவு' : 'UPI / Bank Inflow',
    upiExpense: isTamil ? 'UPI / வங்கி செலவு' : 'UPI / Bank Outflow',
    atmDebited: isTamil ? 'ATM எடுப்பு கழிவு' : 'ATM Cash Debited',
    netUpiMovement: isTamil ? 'நிகர வங்கி மாற்றம்' : 'Net UPI / Bank Movement',
    statsSummary: isTamil ? 'பரிவர்த்தனை புள்ளிவிவரங்கள்' : 'TRANSACTION STATISTICS',
    totalTxs: isTamil ? 'மொத்த பரிவர்த்தனைகள்' : 'Total Transactions',
    incomeTxs: isTamil ? 'வரவு பதிவுகள்' : 'Income Records',
    expenseTxs: isTamil ? 'செலவு பதிவுகள்' : 'Expense Records',
    cashTxs: isTamil ? 'ரொக்கப் பதிவுகள்' : 'Cash Records',
    upiTxs: isTamil ? 'UPI பதிவுகள்' : 'UPI Records',
    periodHighlights: isTamil ? 'காலத்தின் சிறப்பம்சங்கள்' : 'PERIOD HIGHLIGHTS',
    highestIncomeDay: isTamil ? 'அதிக வரவு பெற்ற நாள்' : 'Highest Income Day',
    highestExpenseDay: isTamil ? 'அதிக செலவு செய்த நாள்' : 'Highest Expense Day',
    largestIncome: isTamil ? 'மிகப்பெரிய ஒற்றை வரவு' : 'Largest Single Income',
    largestExpense: isTamil ? 'மிகப்பெரிய ஒற்றை செலவு' : 'Largest Single Expense',
    bankSummary: isTamil ? 'வங்கி கணக்கு விவரங்கள்' : 'BANK ACCOUNT ACTIVITY',
    dayWiseSummary: isTamil ? 'நாள் வாரியான நிதி சுருக்கம்' : 'DAY-BY-DAY SUMMARY',
    dailyCashMovement: isTamil ? 'தினசரி ரொக்க இயக்கம்' : 'DAILY CASH MOVEMENTS',
    detailedTransactions: isTamil ? 'விரிவான பரிவர்த்தனை பட்டியல்' : 'DETAILED TRANSACTIONS',
    incomeTransactions: isTamil ? 'வரவு பரிவர்த்தனைகள்' : 'INCOME TRANSACTIONS',
    expenseTransactions: isTamil ? 'செலவு பரிவர்த்தனைகள்' : 'EXPENSE TRANSACTIONS',
    cashWithdrawals: isTamil ? 'ரொக்க எடுப்புகள் (வங்கி -> ரொக்கம்)' : 'CASH WITHDRAWALS (Bank -> Cash)',
    financialSummary: isTamil ? 'இறுதி நிதிச் சுருக்கம்' : 'FINANCIAL SUMMARY',
    totalMoney: isTamil ? 'மொத்த பணம்' : 'TOTAL MONEY',
    noActivityPeriod: isTamil ? 'இந்த காலத்திற்கு பரிவர்த்தனைகள் எதுவும் இல்லை' : 'No transactions recorded for this period',
    date: isTamil ? 'தேதி' : 'Date',
    income: isTamil ? 'வரவு' : 'Income',
    expense: isTamil ? 'செலவு' : 'Expense',
    net: isTamil ? 'நிகரம்' : 'Net',
    generatedBy: isTamil ? 'Cashly மூலம் உருவாக்கப்பட்டது' : 'Generated by Cashly',
    unnamedTx: isTamil ? 'பெயரிடப்படாத பரிவர்த்தனை' : 'Unnamed Transaction',
    description: isTamil ? 'விவரம்:' : 'Description:'
  };

  // Helper to create standard page container
  const createPageContainer = () => {
    const page = document.createElement('div');
    page.style.position = 'fixed';
    page.style.top = '-9999px';
    page.style.left = '-9999px';
    page.style.width = '794px';
    page.style.minHeight = '1123px';
    page.style.maxHeight = '1123px';
    page.style.backgroundColor = '#FFFFFF';
    page.style.color = '#0F172A';
    page.style.fontFamily = "'Noto Sans Tamil', 'Mukta Malar', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    page.style.boxSizing = 'border-box';
    page.style.padding = '24px 28px';
    page.style.display = 'flex';
    page.style.flexDirection = 'column';
    page.style.justifyContent = 'space-between';
    page.style.zIndex = '-1000';
    return page;
  };

  // Header Component for Pages 2+
  const renderSubPageHeader = (subtitleText) => `
    <div style="background-color: #1E293B; border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; color: #FFFFFF; margin-bottom: 12px;">
      <div>
        <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px;">${L.title}</div>
        <div style="font-size: 11px; color: #CBD5E1; font-weight: 600;">${subtitleText || L.subtitle}</div>
      </div>
      <div style="text-align: right; font-size: 11.5px; font-weight: 800; color: #FFFFFF;">
        ${periodTitle}
      </div>
    </div>
  `;

  const pagesCanvases = [];

  // =========================================================================
  // PAGE 1: EXECUTIVE SUMMARY & PERIOD OVERVIEW
  // =========================================================================
  const page1 = createPageContainer();

  // Bank Rows HTML
  const bankRowsHtml = bankAccounts.length === 0
    ? `<div style="font-size: 11px; color: #64748B; font-style: italic;">No bank accounts configured</div>`
    : bankAccounts.map(b => `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 3px 0; border-bottom: 1px solid #F1F5F9;">
          <div>
            <strong style="color: #0F172A;">${b.name}</strong>
            <span style="color: #64748B; font-size: 10px; margin-left: 6px;">(In: +${formatCurrency(b.upiIncome || 0)} | Out: -${formatCurrency(b.upiExpense || 0)}${b.cashWithdrawals ? ` | ATM: -${formatCurrency(b.cashWithdrawals)}` : ''})</span>
          </div>
          <span style="font-weight: 800; color: #1E293B;">${formatCurrency(b.expectedBalance)}</span>
        </div>
      `).join('');

  // Highlights HTML
  const hasHighlights = highlights.highestIncomeDay || highlights.highestExpenseDay || highlights.largestIncomeTx || highlights.largestExpenseTx;
  const highlightsHtml = hasHighlights ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
      <div style="font-size: 11px; font-weight: 800; color: #1E293B; margin-bottom: 6px; text-transform: uppercase;">${L.periodHighlights}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
        ${highlights.highestIncomeDay ? `
          <div>
            <div style="color: #64748B; font-size: 10px;">${L.highestIncomeDay}</div>
            <strong style="color: #15803D;">${formatShortDate(highlights.highestIncomeDay.date, isTamil)} — ${formatCurrency(highlights.highestIncomeDay.amount)}</strong>
          </div>
        ` : ''}
        ${highlights.highestExpenseDay ? `
          <div>
            <div style="color: #64748B; font-size: 10px;">${L.highestExpenseDay}</div>
            <strong style="color: #DC2626;">${formatShortDate(highlights.highestExpenseDay.date, isTamil)} — ${formatCurrency(highlights.highestExpenseDay.amount)}</strong>
          </div>
        ` : ''}
        ${highlights.largestIncomeTx ? `
          <div>
            <div style="color: #64748B; font-size: 10px;">${L.largestIncome}</div>
            <strong style="color: #15803D;">${highlights.largestIncomeTx.name} — ${formatCurrency(highlights.largestIncomeTx.amount)}</strong>
          </div>
        ` : ''}
        ${highlights.largestExpenseTx ? `
          <div>
            <div style="color: #64748B; font-size: 10px;">${L.largestExpense}</div>
            <strong style="color: #DC2626;">${highlights.largestExpenseTx.name} — ${formatCurrency(highlights.largestExpenseTx.amount)}</strong>
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  page1.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <!-- 1. HEADER -->
      <div style="background-color: #1E293B; border-radius: 8px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; color: #FFFFFF;">
        <div>
          <div style="font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">${L.title}</div>
          <div style="font-size: 12px; color: #CBD5E1; font-weight: 600; margin-top: 1px;">${L.subtitle}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF;">${periodTitle}</div>
          <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">${rangeData.daysCount || dailyBreakdown.length} ${L.days} (${fromFormatted} → ${toFormatted})</div>
        </div>
      </div>

      <!-- 2. FOUR MAJOR METRIC CARDS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px;">
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase;">${L.totalIncome}</div>
          <div style="font-size: 16px; font-weight: 900; color: #15803D; margin-top: 2px;">${formatCurrency(totalIncome)}</div>
        </div>
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 10px; font-weight: 800; color: #991B1B; text-transform: uppercase;">${L.totalExpense}</div>
          <div style="font-size: 16px; font-weight: 900; color: #DC2626; margin-top: 2px;">${formatCurrency(totalExpense)}</div>
        </div>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 10px; font-weight: 800; color: #1E293B; text-transform: uppercase;">${L.netChange}</div>
          <div style="font-size: 16px; font-weight: 900; color: ${netSavings >= 0 ? '#15803D' : '#DC2626'}; margin-top: 2px;">
            ${netSavings >= 0 ? '+' : '-'}${formatCurrency(netSavings)}
          </div>
        </div>
        <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 8px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 10px; font-weight: 800; color: #3730A3; text-transform: uppercase;">${L.expectedCash}</div>
          <div style="font-size: 16px; font-weight: 900; color: #4338CA; margin-top: 2px;">${formatCurrency(closingCash)}</div>
        </div>
      </div>

      <!-- 3. CASH VS UPI ACTIVITY (SIDE BY SIDE) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <!-- Left: Cash Activity -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; margin-bottom: 6px; text-transform: uppercase;">${L.cashActivity}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #475569;">
            <span>${L.openingCash}:</span>
            <span style="font-weight: 700; color: #0F172A;">${formatCurrency(openingCash)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>+ ${L.cashIncome}:</span>
            <span style="font-weight: 700;">+${formatCurrency(cashIncome)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #4338CA;">
            <span>+ ${L.atmWithdrawal}:</span>
            <span style="font-weight: 700;">+${formatCurrency(cashWithdrawal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #991B1B;">
            <span>- ${L.cashExpense}:</span>
            <span style="font-weight: 700;">-${formatCurrency(cashExpense)}</span>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 4px; display: flex; justify-content: space-between; font-weight: 800; color: #1E293B; font-size: 12px;">
            <span>${L.closingCash}:</span>
            <span>${formatCurrency(closingCash)}</span>
          </div>
        </div>

        <!-- Right: UPI / Bank Activity -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; margin-bottom: 6px; text-transform: uppercase;">${L.upiActivity}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>+ ${L.upiIncome}:</span>
            <span style="font-weight: 700;">+${formatCurrency(upiIncome)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #991B1B;">
            <span>- ${L.upiExpense}:</span>
            <span style="font-weight: 700;">-${formatCurrency(upiExpense)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #4338CA;">
            <span>- ${L.atmDebited}:</span>
            <span style="font-weight: 700;">-${formatCurrency(cashWithdrawal)}</span>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 4px; display: flex; justify-content: space-between; font-weight: 800; color: #1E293B; font-size: 12px;">
            <span>${L.netUpiMovement}:</span>
            <span style="color: ${netUpiChange >= 0 ? '#15803D' : '#DC2626'};">${netUpiChange >= 0 ? '+' : '-'}${formatCurrency(netUpiChange)}</span>
          </div>
        </div>
      </div>

      <!-- 4. TRANSACTION COUNTS & STATISTICS -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px;">
        <div style="font-size: 11px; font-weight: 800; color: #1E293B; margin-bottom: 4px; text-transform: uppercase;">${L.statsSummary}</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; text-align: center; font-size: 11px;">
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px;">
            <div style="color: #64748B; font-size: 9.5px;">${L.totalTxs}</div>
            <strong style="color: #0F172A; font-size: 13px;">${counts.totalTransactions || 0}</strong>
          </div>
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px;">
            <div style="color: #166534; font-size: 9.5px;">${L.incomeTxs}</div>
            <strong style="color: #15803D; font-size: 13px;">${counts.incomeCount || 0}</strong>
          </div>
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px;">
            <div style="color: #991B1B; font-size: 9.5px;">${L.expenseTxs}</div>
            <strong style="color: #DC2626; font-size: 13px;">${counts.expenseCount || 0}</strong>
          </div>
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px;">
            <div style="color: #475569; font-size: 9.5px;">${L.cashTxs}</div>
            <strong style="color: #0F172A; font-size: 13px;">${counts.cashTxCount || 0}</strong>
          </div>
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px;">
            <div style="color: #4338CA; font-size: 9.5px;">${L.upiTxs}</div>
            <strong style="color: #4338CA; font-size: 13px;">${counts.upiTxCount || 0}</strong>
          </div>
        </div>
      </div>

      <!-- 5. PERIOD HIGHLIGHTS -->
      ${highlightsHtml}

      <!-- 6. BANK ACCOUNT ACTIVITY -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
        <div style="font-size: 11px; font-weight: 800; color: #1E293B; margin-bottom: 4px; text-transform: uppercase;">${L.bankSummary}</div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          ${bankRowsHtml}
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; margin-top: 6px; border-top: 1.5px solid #CBD5E1; padding-top: 4px;">
          <span>Total Bank Balances:</span>
          <span>${formatCurrency(totalBankBalance)}</span>
        </div>
      </div>
    </div>

    <!-- 7. PAGE 1 FOOTER -->
    <div style="margin-top: 10px;">
      <div style="background-color: #1E293B; border-radius: 8px; padding: 8px 14px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11.5px;">
          Cash: <strong style="color: #FFFFFF;">${formatCurrency(closingCash)}</strong> &nbsp;|&nbsp; 
          Bank: <strong style="color: #FFFFFF;">${formatCurrency(totalBankBalance)}</strong>
        </div>
        <div style="font-size: 14px; font-weight: 900; color: #FFFFFF;">
          ${L.totalMoney}: ${formatCurrency(totalMoney)}
        </div>
      </div>
      <div style="text-align: center; font-size: 9px; color: #94A3B8; margin-top: 6px;">
        ${L.generatedBy} • ${new Date().toLocaleString(isTamil ? 'ta-IN' : 'en-IN')}
      </div>
    </div>
  `;

  pagesCanvases.push(await renderElementToCanvas(page1));

  // =========================================================================
  // PAGE 2: DAY-BY-DAY SUMMARY & DAILY CASH MOVEMENTS
  // =========================================================================
  const page2 = createPageContainer();

  const daySummaryRowsHtml = dailyBreakdown.map((d, idx) => {
    const dFormatted = formatDateDisplay(d.date, isTamil);
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    const netColor = d.net > 0 ? '#15803D' : (d.net < 0 ? '#DC2626' : '#64748B');
    const netSign = d.net > 0 ? '+' : (d.net < 0 ? '-' : '');

    return `
      <tr style="background-color: ${bg}; border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 4px 6px; font-weight: 700; color: #1E293B; font-size: 10.5px;">${dFormatted}</td>
        <td style="padding: 4px 6px; text-align: right; color: ${d.income > 0 ? '#15803D' : '#64748B'}; font-weight: 700; font-size: 10.5px;">
          ${d.income > 0 ? '+' : ''}${formatCurrency(d.income)}
        </td>
        <td style="padding: 4px 6px; text-align: right; color: ${d.expense > 0 ? '#DC2626' : '#64748B'}; font-weight: 700; font-size: 10.5px;">
          ${d.expense > 0 ? '-' : ''}${formatCurrency(d.expense)}
        </td>
        <td style="padding: 4px 6px; text-align: right; color: ${d.cashWithdrawal > 0 ? '#4338CA' : '#64748B'}; font-weight: 700; font-size: 10.5px;">
          ${d.cashWithdrawal > 0 ? '+' : ''}${formatCurrency(d.cashWithdrawal)}
        </td>
        <td style="padding: 4px 6px; text-align: right; font-weight: 800; color: ${netColor}; font-size: 10.5px;">
          ${netSign}${formatCurrency(d.net)}
        </td>
      </tr>
    `;
  }).join('');

  // Daily Cash Movement Rows (days with cash transactions or withdrawals)
  const activeCashDays = dailyBreakdown.filter(d => (d.cashIncome > 0 || d.cashExpense > 0 || d.cashWithdrawal > 0));
  const cashMovementRowsHtml = activeCashDays.length === 0
    ? `<div style="font-size: 11px; color: #64748B; font-style: italic; padding: 6px;">No physical cash activity recorded during this period</div>`
    : activeCashDays.slice(0, 12).map(d => `
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; padding: 2px 0; border-bottom: 1px solid #F1F5F9;">
          <span style="font-weight: 700; color: #1E293B;">${formatShortDate(d.date, isTamil)}</span>
          <span>Cash In: <strong style="color: #15803D;">+${formatCurrency(d.cashIncome)}</strong></span>
          <span>ATM: <strong style="color: #4338CA;">+${formatCurrency(d.cashWithdrawal)}</strong></span>
          <span>Cash Out: <strong style="color: #DC2626;">-${formatCurrency(d.cashExpense)}</strong></span>
          <span>Net: <strong style="color: ${(d.cashIncome + d.cashWithdrawal - d.cashExpense) >= 0 ? '#15803D' : '#DC2626'};">${(d.cashIncome + d.cashWithdrawal - d.cashExpense) >= 0 ? '+' : '-'}${formatCurrency(d.cashIncome + d.cashWithdrawal - d.cashExpense)}</strong></span>
        </div>
      `).join('');

  page2.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${renderSubPageHeader(L.dayWiseSummary)}

      <!-- DAY-BY-DAY TABLE -->
      <div>
        <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; text-transform: uppercase; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 3px; margin-bottom: 4px;">
          ${L.dayWiseSummary} (${dailyBreakdown.length} ${L.days})
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
          <thead>
            <tr style="background-color: #1E293B; color: #FFFFFF;">
              <th style="padding: 5px 6px; text-align: left;">${L.date}</th>
              <th style="padding: 5px 6px; text-align: right;">${L.income}</th>
              <th style="padding: 5px 6px; text-align: right;">${L.expense}</th>
              <th style="padding: 5px 6px; text-align: right;">${L.atmWithdrawal}</th>
              <th style="padding: 5px 6px; text-align: right;">${L.net}</th>
            </tr>
          </thead>
          <tbody>
            ${daySummaryRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #F1F5F9; font-weight: 800; color: #0F172A; border-top: 2px solid #CBD5E1;">
              <td style="padding: 5px 6px;">Total (${dailyBreakdown.length} Days)</td>
              <td style="padding: 5px 6px; text-align: right; color: #15803D;">+${formatCurrency(totalIncome)}</td>
              <td style="padding: 5px 6px; text-align: right; color: #DC2626;">-${formatCurrency(totalExpense)}</td>
              <td style="padding: 5px 6px; text-align: right; color: #4338CA;">+${formatCurrency(cashWithdrawal)}</td>
              <td style="padding: 5px 6px; text-align: right; color: ${netSavings >= 0 ? '#15803D' : '#DC2626'};">${netSavings >= 0 ? '+' : '-'}${formatCurrency(netSavings)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- DAILY CASH MOVEMENT SUMMARY -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; margin-top: 4px;">
        <div style="font-size: 11px; font-weight: 800; color: #1E293B; margin-bottom: 4px; text-transform: uppercase;">${L.dailyCashMovement}</div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          ${cashMovementRowsHtml}
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align: center; font-size: 9px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 6px;">
      ${L.generatedBy} • ${new Date().toLocaleString(isTamil ? 'ta-IN' : 'en-IN')}
    </div>
  `;

  pagesCanvases.push(await renderElementToCanvas(page2));

  // =========================================================================
  // PAGE 3+: DETAILED TRANSACTIONS BREAKDOWN
  // =========================================================================
  const renderTxCard = (tx, type) => {
    const isPos = type === 'INCOME' || type === 'WITHDRAWAL';
    const amtColor = type === 'INCOME' ? '#16A34A' : (type === 'EXPENSE' ? '#DC2626' : '#4338CA');
    const amtSign = type === 'INCOME' ? '+₹' : (type === 'EXPENSE' ? '-₹' : '+₹');
    const methodBadge = tx.paymentMethod === 'CASH'
      ? '<span style="background: #DCFCE7; color: #15803D; padding: 1px 5px; border-radius: 4px; font-weight: 800; font-size: 9.5px;">CASH</span>'
      : `<span style="background: #EEF2FF; color: #4338CA; padding: 1px 5px; border-radius: 4px; font-weight: 800; font-size: 9.5px;">UPI • ${tx.accountName || 'Bank'}</span>`;
    
    const timeFormatted = formatTime(tx.createdAt || tx.date);
    const dateFormatted = formatShortDate(tx.date, isTamil);
    const title = (tx.transactionName && tx.transactionName.trim()) ? tx.transactionName.trim() : (type === 'WITHDRAWAL' ? 'Cash Withdrawal' : L.unnamedTx);

    return `
      <div style="border-bottom: 1px solid #F1F5F9; padding: 4px 2px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 700; color: #0F172A; font-size: 11.5px;">${title}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 1px; color: #64748B; font-size: 10px;">
              <span>${dateFormatted} • ${timeFormatted}</span>
              <span>•</span>
              ${methodBadge}
            </div>
            ${tx.description ? `<div style="color: #475569; font-size: 9.5px; margin-top: 1px; font-style: italic;">${L.description} ${tx.description}</div>` : ''}
          </div>
          <div style="font-weight: 800; font-size: 12.5px; color: ${amtColor}; text-align: right;">
            ${amtSign}${Math.abs(tx.amount || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    `;
  };

  // Group transactions for multi-page rendering
  const allCategorizedTxs = [
    ...incomeTxs.map(t => ({ ...t, section: 'INCOME' })),
    ...expenseTxs.map(t => ({ ...t, section: 'EXPENSE' })),
    ...withdrawalTxs.map(t => ({ ...t, section: 'WITHDRAWAL' }))
  ];

  if (allCategorizedTxs.length > 0) {
    const ITEMS_PER_PAGE = 12;
    for (let i = 0; i < allCategorizedTxs.length; i += ITEMS_PER_PAGE) {
      const chunk = allCategorizedTxs.slice(i, i + ITEMS_PER_PAGE);
      const txPage = createPageContainer();

      const chunkHtml = chunk.map(tx => renderTxCard(tx, tx.section)).join('');

      txPage.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${renderSubPageHeader(L.detailedTransactions)}
          <div style="display: flex; flex-direction: column; gap: 2px;">
            ${chunkHtml}
          </div>
        </div>

        <!-- FOOTER -->
        <div style="text-align: center; font-size: 9px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 6px;">
          ${L.generatedBy} • ${new Date().toLocaleString(isTamil ? 'ta-IN' : 'en-IN')}
        </div>
      `;

      pagesCanvases.push(await renderElementToCanvas(txPage));
    }
  }

  // =========================================================================
  // FINAL PAGE: CONSOLIDATED FINANCIAL SUMMARY & TOTAL MONEY
  // =========================================================================
  const finalPage = createPageContainer();

  finalPage.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${renderSubPageHeader(L.financialSummary)}

      <!-- CONSOLIDATED SUMMARY BOXES -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <!-- Financial Summary -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; font-size: 11.5px;">
          <div style="font-size: 12px; font-weight: 800; color: #1E293B; margin-bottom: 8px; text-transform: uppercase;">${L.financialSummary}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #166534;">
            <span>${L.totalIncome}:</span>
            <strong style="font-size: 12.5px;">+${formatCurrency(totalIncome)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #991B1B;">
            <span>${L.totalExpense}:</span>
            <strong style="font-size: 12.5px;">-${formatCurrency(totalExpense)}</strong>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 6px; display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; color: #1E293B;">
            <span>${L.netChange}:</span>
            <span style="color: ${netSavings >= 0 ? '#15803D' : '#DC2626'};">${netSavings >= 0 ? '+' : '-'}${formatCurrency(netSavings)}</span>
          </div>
        </div>

        <!-- Cash Summary -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; font-size: 11.5px;">
          <div style="font-size: 12px; font-weight: 800; color: #1E293B; margin-bottom: 8px; text-transform: uppercase;">${L.cashActivity}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>+ ${L.cashIncome}:</span>
            <strong style="font-size: 12px;">+${formatCurrency(cashIncome)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #4338CA;">
            <span>+ ${L.atmWithdrawal}:</span>
            <strong style="font-size: 12px;">+${formatCurrency(cashWithdrawal)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #991B1B;">
            <span>- ${L.cashExpense}:</span>
            <strong style="font-size: 12px;">-${formatCurrency(cashExpense)}</strong>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 6px; display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; color: #1E293B;">
            <span>${L.closingCash}:</span>
            <span style="color: #4338CA;">${formatCurrency(closingCash)}</span>
          </div>
        </div>
      </div>

      <!-- BANK / UPI SUMMARY & TRANSACTION SUMMARY -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <!-- Bank / UPI Summary -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; font-size: 11.5px;">
          <div style="font-size: 12px; font-weight: 800; color: #1E293B; margin-bottom: 8px; text-transform: uppercase;">${L.upiActivity}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>+ ${L.upiIncome}:</span>
            <strong style="font-size: 12px;">+${formatCurrency(upiIncome)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #991B1B;">
            <span>- ${L.upiExpense}:</span>
            <strong style="font-size: 12px;">-${formatCurrency(upiExpense)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #4338CA;">
            <span>- ${L.atmDebited}:</span>
            <strong style="font-size: 12px;">-${formatCurrency(cashWithdrawal)}</strong>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 6px; display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; color: #1E293B;">
            <span>Total Bank Balances:</span>
            <span>${formatCurrency(totalBankBalance)}</span>
          </div>
        </div>

        <!-- Transaction Counts Summary -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; font-size: 11.5px;">
          <div style="font-size: 12px; font-weight: 800; color: #1E293B; margin-bottom: 8px; text-transform: uppercase;">${L.statsSummary}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${L.totalTxs}:</span>
            <strong>${counts.totalTransactions || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>${L.incomeTxs}:</span>
            <strong>${counts.incomeCount || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #991B1B;">
            <span>${L.expenseTxs}:</span>
            <strong>${counts.expenseCount || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${L.cashTxs} / ${L.upiTxs}:</span>
            <strong>${counts.cashTxCount || 0} / ${counts.upiTxCount || 0}</strong>
          </div>
        </div>
      </div>

      <!-- FINAL TOTAL MONEY BOX -->
      <div style="background-color: #1E293B; border-radius: 8px; padding: 14px 18px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <div>
          <div style="font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase;">FINAL POSITION</div>
          <div style="font-size: 13px; color: #CBD5E1; margin-top: 2px;">
            Cash: <strong style="color: #FFFFFF;">${formatCurrency(closingCash)}</strong> &nbsp;|&nbsp; 
            Total Bank Balance: <strong style="color: #FFFFFF;">${formatCurrency(totalBankBalance)}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase;">${L.totalMoney}</div>
          <div style="font-size: 22px; font-weight: 900; color: #FFFFFF; margin-top: 2px;">${formatCurrency(totalMoney)}</div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align: center; font-size: 9.5px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px;">
      ${L.generatedBy} • ${new Date().toLocaleString(isTamil ? 'ta-IN' : 'en-IN')}
    </div>
  `;

  pagesCanvases.push(await renderElementToCanvas(finalPage));

  // =========================================================================
  // COMPOSE ALL PAGES INTO JSPDF WITH ACCURATE PAGE NUMBERS (Page X of Y)
  // =========================================================================
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = pagesCanvases.length;

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) doc.addPage();
    const imgData = pagesCanvases[i].toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

    // Overlay Page X of Y on bottom right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i + 1} of ${totalPages}`, pageWidth - 16, pageHeight - 5, { align: 'right' });
  }

  const filename = `Cashly_Range_Report_${fromDate}_to_${toDate}.pdf`;
  return await saveOrSharePdf(doc, filename, `Cashly Financial Report (${fromDate} to ${toDate})`);
}
