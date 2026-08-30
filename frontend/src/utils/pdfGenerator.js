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
 * 1. SINGLE-DAY FINANCIAL REPORT PDF GENERATOR
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
      const descHtml = tx.description ? `<span style="color: #64748B; font-size: 10px; margin-left: 4px;">(${tx.description})</span>` : '';
      const methodLabel = tx.paymentMethod === 'CASH' ? 'CASH' : 'UPI';
      const accountLabel = tx.paymentMethod === 'CASH' ? '—' : (tx.accountName || 'Bank');
      const isPos = type === 'INCOME' || type === 'WITHDRAWAL';
      const amtColor = type === 'INCOME' ? '#16A34A' : (type === 'EXPENSE' ? '#DC2626' : '#4338CA');
      const amtText = formatSignedCurrency(tx.amount, isPos);
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

      return `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 4px 6px; font-size: 11px; color: #64748B; text-align: center;">${timeStr}</td>
          <td style="padding: 4px 6px; font-size: 11.5px; font-weight: 700; color: #1E293B;">${title}${descHtml}</td>
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
    const descHtml = tx.description ? `<span style="color: #64748B; font-size: 10px; margin-left: 4px;">(${tx.description})</span>` : '';
    const transferRoute = `${tx.accountName || 'Bank'} → CASH`;
    const amtText = '+' + formatCurrency(tx.amount);
    const bg = idx % 2 === 0 ? '#EEF2FF' : '#F5F3FF';
    return `
      <tr style="background-color: ${bg}; border-bottom: 1px solid #E0E7FF;">
        <td style="padding: 4px 6px; font-size: 11px; color: #4338CA; text-align: center;">${timeStr}</td>
        <td style="padding: 4px 6px; font-size: 11.5px; font-weight: 700; color: #312E81;">${title}${descHtml}</td>
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
 * 2. DATE RANGE MULTI-DAY FINANCIAL REPORT PDF GENERATOR
 * Generates comprehensive Period Summary + Day-wise Summary Table + Day-wise Detailed Breakdowns
 */
export async function generateDateRangeFinancialReport({ fromDate, toDate, rangeData, user, language = 'en' }) {
  const isTamil = language === 'ta';
  const fromFormatted = formatDateDisplay(fromDate, isTamil);
  const toFormatted = formatDateDisplay(toDate, isTamil);
  const periodTitle = `${fromFormatted} – ${toFormatted}`;

  const totalIncome = rangeData.totalIncome || 0;
  const totalExpense = rangeData.totalExpense || 0;
  const netSavings = rangeData.netSavings || (totalIncome - totalExpense);
  const cashIncome = rangeData.cashIncome || 0;
  const cashExpense = rangeData.cashExpense || 0;
  const cashWithdrawal = rangeData.cashWithdrawal || 0;
  const netCashChange = rangeData.netCashChange || (cashIncome - cashExpense + cashWithdrawal);
  const upiIncome = rangeData.upiIncome || 0;
  const upiExpense = rangeData.upiExpense || 0;
  const netUpiChange = rangeData.netUpiChange || (upiIncome - upiExpense - cashWithdrawal);

  const bankAccounts = rangeData.bankAccounts || [];
  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (parseFloat(b.expectedBalance) || 0), 0);
  const dailyBreakdown = rangeData.dailyBreakdown || [];

  const L = {
    title: 'CASHLY',
    subtitle: isTamil ? 'தேதி வரம்பு நிதி அறிக்கை' : 'Date Range Financial Statement',
    periodSummary: isTamil ? 'கால சுருக்கம்' : 'PERIOD SUMMARY',
    totalIncome: isTamil ? 'மொத்த வரவு' : 'TOTAL INCOME',
    totalExpense: isTamil ? 'மொத்த செலவு' : 'TOTAL EXPENSE',
    netSavings: isTamil ? 'நிகர சேமிப்பு' : 'NET SAVINGS',
    cashFlow: isTamil ? 'ரொக்க இயக்கம்' : 'CASH FLOW MOVEMENT',
    bankingFlow: isTamil ? 'வங்கி / UPI இயக்கம்' : 'BANK & UPI MOVEMENT',
    dayWiseTable: isTamil ? 'நாள் வாரியான சுருக்கம்' : 'DAY-WISE CONSOLIDATED SUMMARY',
    dayWiseDetails: isTamil ? 'நாள் வாரியான பரிவர்த்தனை விவரங்கள்' : 'DAY-WISE DETAILED TRANSACTIONS',
    date: isTamil ? 'தேதி' : 'Date',
    income: isTamil ? 'வரவு' : 'Income',
    expense: isTamil ? 'செலவு' : 'Expense',
    withdrawals: isTamil ? 'ரொக்க எடுப்பு' : 'ATM Withdrawal',
    net: isTamil ? 'நிகர தொகை' : 'Net',
    status: isTamil ? 'நிலை' : 'Status',
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
    totalDays: isTamil ? 'மொத்த நாட்கள்' : 'Total Days',
    totalRecords: isTamil ? 'பரிவர்த்தனைகள்' : 'Transactions',
    noActivity: isTamil ? 'இந்த காலத்திற்கு பரிவர்த்தனைகள் எதுவும் இல்லை' : 'No transactions recorded for this period'
  };

  // Helper to create standard page container
  const createPageContainer = (pageNum, totalPagesEst = '') => {
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

  const pagesCanvases = [];

  // ================= PAGE 1: PERIOD SUMMARY & DAY-WISE SUMMARY TABLE =================
  const page1 = createPageContainer(1);

  // Day-wise Summary Table Rows
  const daySummaryRowsHtml = dailyBreakdown.length === 0
    ? `<tr><td colspan="6" style="text-align: center; padding: 12px; color: #94A3B8; font-style: italic;">${L.noActivity}</td></tr>`
    : dailyBreakdown.map((d, idx) => {
        const dFormatted = formatDateDisplay(d.date, isTamil);
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        const netColor = d.net >= 0 ? '#15803D' : '#DC2626';
        const statusBadge = d.isClosed
          ? '<span style="color: #15803D; font-weight: 800;">✓ CLOSED</span>'
          : (d.physicalCash !== null ? '<span style="color: #4338CA; font-weight: 800;">COUNTED</span>' : '<span style="color: #94A3B8;">OPEN</span>');

        return `
          <tr style="background-color: ${bg}; border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 6px 8px; font-weight: 700; color: #1E293B;">${dFormatted}</td>
            <td style="padding: 6px 8px; text-align: right; color: #15803D; font-weight: 700;">+${formatCurrency(d.income)}</td>
            <td style="padding: 6px 8px; text-align: right; color: #DC2626; font-weight: 700;">-${formatCurrency(d.expense)}</td>
            <td style="padding: 6px 8px; text-align: right; color: #4338CA; font-weight: 700;">+${formatCurrency(d.cashWithdrawal)}</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: ${netColor};">${d.net >= 0 ? '+' : '-'}${formatCurrency(d.net)}</td>
            <td style="padding: 6px 8px; text-align: center; font-size: 10px;">${statusBadge}</td>
          </tr>
        `;
      }).join('');

  page1.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <!-- 1. HEADER -->
      <div style="background-color: #1E293B; border-radius: 8px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; color: #FFFFFF;">
        <div>
          <div style="font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">${L.title}</div>
          <div style="font-size: 12px; color: #CBD5E1; font-weight: 600; margin-top: 1px;">${L.subtitle}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF;">${periodTitle}</div>
          <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">${dailyBreakdown.length} ${L.totalDays} • ${rangeData.transactions?.length || 0} ${L.totalRecords}</div>
        </div>
      </div>

      <!-- 2. PERIOD TOTALS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 12px; text-align: center;">
          <div style="font-size: 10.5px; font-weight: 800; color: #166534; text-transform: uppercase;">${L.totalIncome}</div>
          <div style="font-size: 18px; font-weight: 900; color: #15803D; margin-top: 2px;">${formatCurrency(totalIncome)}</div>
        </div>
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 12px; text-align: center;">
          <div style="font-size: 10.5px; font-weight: 800; color: #991B1B; text-transform: uppercase;">${L.totalExpense}</div>
          <div style="font-size: 18px; font-weight: 900; color: #DC2626; margin-top: 2px;">${formatCurrency(totalExpense)}</div>
        </div>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; text-align: center;">
          <div style="font-size: 10.5px; font-weight: 800; color: #1E293B; text-transform: uppercase;">${L.netSavings}</div>
          <div style="font-size: 18px; font-weight: 900; color: ${netSavings >= 0 ? '#15803D' : '#DC2626'}; margin-top: 2px;">
            ${netSavings >= 0 ? '+' : '-'}${formatCurrency(netSavings)}
          </div>
        </div>
      </div>

      <!-- 3. CASH & BANKING MOVEMENT -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <!-- Left: Cash Movement -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; margin-bottom: 6px; text-transform: uppercase;">${L.cashFlow}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>+ Cash Income:</span>
            <span style="font-weight: 700;">+${formatCurrency(cashIncome)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #4338CA;">
            <span>+ ATM Withdrawals:</span>
            <span style="font-weight: 700;">+${formatCurrency(cashWithdrawal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #991B1B;">
            <span>- Cash Expenses:</span>
            <span style="font-weight: 700;">-${formatCurrency(cashExpense)}</span>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 4px; display: flex; justify-content: space-between; font-weight: 800; color: #1E293B; font-size: 12px;">
            <span>Net Cash Movement:</span>
            <span style="color: ${netCashChange >= 0 ? '#15803D' : '#DC2626'};">${netCashChange >= 0 ? '+' : '-'}${formatCurrency(netCashChange)}</span>
          </div>
        </div>

        <!-- Right: Banking & UPI Movement -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; margin-bottom: 6px; text-transform: uppercase;">${L.bankingFlow}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #166534;">
            <span>+ UPI / Bank Inflow:</span>
            <span style="font-weight: 700;">+${formatCurrency(upiIncome)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #991B1B;">
            <span>- UPI / Bank Outflow:</span>
            <span style="font-weight: 700;">-${formatCurrency(upiExpense)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #4338CA;">
            <span>- ATM Cash Debited:</span>
            <span style="font-weight: 700;">-${formatCurrency(cashWithdrawal)}</span>
          </div>
          <div style="border-top: 1.5px solid #CBD5E1; padding-top: 4px; display: flex; justify-content: space-between; font-weight: 800; color: #1E293B; font-size: 12px;">
            <span>Total Bank Balance:</span>
            <span>${formatCurrency(totalBankBalance)}</span>
          </div>
        </div>
      </div>

      <!-- 4. DAY-WISE SUMMARY TABLE -->
      <div style="margin-top: 4px;">
        <div style="font-size: 12.5px; font-weight: 800; color: #1E293B; text-transform: uppercase; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px;">
          ${L.dayWiseTable}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #1E293B; color: #FFFFFF;">
              <th style="padding: 6px 8px; text-align: left;">${L.date}</th>
              <th style="padding: 6px 8px; text-align: right;">${L.income}</th>
              <th style="padding: 6px 8px; text-align: right;">${L.expense}</th>
              <th style="padding: 6px 8px; text-align: right;">${L.withdrawals}</th>
              <th style="padding: 6px 8px; text-align: right;">${L.net}</th>
              <th style="padding: 6px 8px; text-align: center;">${L.status}</th>
            </tr>
          </thead>
          <tbody>
            ${daySummaryRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #F1F5F9; font-weight: 800; color: #0F172A; border-top: 2px solid #CBD5E1;">
              <td style="padding: 6px 8px;">Total (${dailyBreakdown.length} Days)</td>
              <td style="padding: 6px 8px; text-align: right; color: #15803D;">+${formatCurrency(totalIncome)}</td>
              <td style="padding: 6px 8px; text-align: right; color: #DC2626;">-${formatCurrency(totalExpense)}</td>
              <td style="padding: 6px 8px; text-align: right; color: #4338CA;">+${formatCurrency(cashWithdrawal)}</td>
              <td style="padding: 6px 8px; text-align: right; color: ${netSavings >= 0 ? '#15803D' : '#DC2626'};">${netSavings >= 0 ? '+' : '-'}${formatCurrency(netSavings)}</td>
              <td style="padding: 6px 8px; text-align: center;">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 5. FOOTER -->
    <div style="margin-top: 12px;">
      <div style="background-color: #1E293B; border-radius: 8px; padding: 10px 16px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase;">PERIOD NET POSITION</div>
          <div style="font-size: 12px; color: #CBD5E1; margin-top: 2px;">
            Net Cash: <strong style="color: #FFFFFF;">${formatCurrency(netCashChange)}</strong> &nbsp;|&nbsp; 
            Total Bank Balance: <strong style="color: #FFFFFF;">${formatCurrency(totalBankBalance)}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase;">TOTAL SAVINGS</div>
          <div style="font-size: 18px; font-weight: 900; color: #FFFFFF; margin-top: 1px;">${netSavings >= 0 ? '+' : '-'}${formatCurrency(netSavings)}</div>
        </div>
      </div>

      <div style="text-align: center; font-size: 9.5px; color: #94A3B8; margin-top: 8px;">
        ${L.generatedBy} • ${new Date().toLocaleString(isTamil ? 'ta-IN' : 'en-IN')}
      </div>
    </div>
  `;

  pagesCanvases.push(await renderElementToCanvas(page1));

  // ================= PAGE 2+: DAY-WISE DETAILED TRANSACTIONS =================
  // Split days into manageable pages (e.g. 2-3 days per page depending on transaction volume)
  if (dailyBreakdown.length > 0) {
    const daysWithTxs = dailyBreakdown.filter(d => (d.transactions && d.transactions.length > 0));
    
    if (daysWithTxs.length > 0) {
      // Chunk days into pages
      const dayChunks = [];
      let currentChunk = [];
      let currentTxCount = 0;

      daysWithTxs.forEach(d => {
        const count = d.transactions.length;
        if (currentChunk.length > 0 && (currentTxCount + count > 10 || currentChunk.length >= 2)) {
          dayChunks.push(currentChunk);
          currentChunk = [];
          currentTxCount = 0;
        }
        currentChunk.push(d);
        currentTxCount += count;
      });
      if (currentChunk.length > 0) {
        dayChunks.push(currentChunk);
      }

      for (let chunkIdx = 0; chunkIdx < dayChunks.length; chunkIdx++) {
        const chunkDays = dayChunks[chunkIdx];
        const detailPage = createPageContainer(chunkIdx + 2);

        const daysContentHtml = chunkDays.map(d => {
          const dFormatted = formatDateDisplay(d.date, isTamil);
          const incomeList = d.transactions.filter(t => t.type === 'INCOME');
          const expenseList = d.transactions.filter(t => t.type === 'EXPENSE');
          const withdrawalList = d.transactions.filter(t => t.type === 'CASH_WITHDRAWAL');

          const buildRows = (list, type) => {
            if (list.length === 0) return '';
            return list.map((tx, idx) => {
              const timeStr = formatTime(tx.createdAt || tx.date);
              const title = (tx.transactionName && tx.transactionName.trim()) ? tx.transactionName.trim() : (type === 'WITHDRAWAL' ? 'Cash Withdrawal' : 'Transaction');
              const method = tx.paymentMethod === 'CASH' ? 'CASH' : 'UPI';
              const account = tx.paymentMethod === 'CASH' ? '—' : (tx.accountName || 'Bank');
              const isPos = type === 'INCOME' || type === 'WITHDRAWAL';
              const amtColor = type === 'INCOME' ? '#16A34A' : (type === 'EXPENSE' ? '#DC2626' : '#4338CA');
              const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              return `
                <tr style="background-color: ${bg}; border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 3px 6px; font-size: 10.5px; color: #64748B; text-align: center; width: 55px;">${timeStr}</td>
                  <td style="padding: 3px 6px; font-size: 11px; font-weight: 700; color: #1E293B;">${title}</td>
                  <td style="padding: 3px 6px; font-size: 9.5px; font-weight: 800; text-align: center; width: 55px; color: ${tx.paymentMethod === 'CASH' ? '#15803D' : '#4338CA'};">${method}</td>
                  <td style="padding: 3px 6px; font-size: 10.5px; color: #475569; width: 110px;">${account}</td>
                  <td style="padding: 3px 6px; font-size: 11px; font-weight: 800; text-align: right; width: 80px; color: ${amtColor};">${formatSignedCurrency(tx.amount, isPos)}</td>
                </tr>
              `;
            }).join('');
          };

          const withdrawalRows = withdrawalList.map((tx, idx) => {
            const timeStr = formatTime(tx.createdAt || tx.date);
            const title = (tx.transactionName && tx.transactionName.trim()) ? tx.transactionName.trim() : 'Cash Withdrawal';
            const route = `${tx.accountName || 'Bank'} → CASH`;
            return `
              <tr style="background-color: #EEF2FF; border-bottom: 1px solid #E0E7FF;">
                <td style="padding: 3px 6px; font-size: 10.5px; color: #4338CA; text-align: center; width: 55px;">${timeStr}</td>
                <td style="padding: 3px 6px; font-size: 11px; font-weight: 700; color: #312E81;">${title}</td>
                <td style="padding: 3px 6px; font-size: 9.5px; font-weight: 800; text-align: center; width: 55px; color: #4338CA;">TRANSFER</td>
                <td style="padding: 3px 6px; font-size: 10.5px; font-weight: 700; color: #4338CA; width: 110px;">${route}</td>
                <td style="padding: 3px 6px; font-size: 11px; font-weight: 800; text-align: right; width: 80px; color: #4338CA;">+${formatCurrency(tx.amount)}</td>
              </tr>
            `;
          }).join('');

          return `
            <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; background-color: #FFFFFF;">
              <!-- Day Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 4px; margin-bottom: 4px;">
                <div style="font-size: 12px; font-weight: 800; color: #0F172A;">${dFormatted}</div>
                <div style="font-size: 11px; font-weight: 700; color: #475569;">
                  Income: <strong style="color: #15803D;">+${formatCurrency(d.income)}</strong> &nbsp;|&nbsp; 
                  Expense: <strong style="color: #DC2626;">-${formatCurrency(d.expense)}</strong> &nbsp;|&nbsp; 
                  Net: <strong style="color: ${d.net >= 0 ? '#15803D' : '#DC2626'};">${d.net >= 0 ? '+' : '-'}${formatCurrency(d.net)}</strong>
                </div>
              </div>

              <!-- Day Transactions Table -->
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${buildRows(incomeList, 'INCOME')}
                  ${buildRows(expenseList, 'EXPENSE')}
                  ${withdrawalRows}
                </tbody>
              </table>
            </div>
          `;
        }).join('');

        detailPage.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- Top Header -->
            <div style="background-color: #1E293B; border-radius: 8px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; color: #FFFFFF;">
              <div style="font-size: 13px; font-weight: 800;">${L.dayWiseDetails}</div>
              <div style="font-size: 11.5px; color: #CBD5E1;">${periodTitle}</div>
            </div>

            <!-- List of Days in this chunk -->
            <div style="display: flex; flex-direction: column;">
              ${daysContentHtml}
            </div>
          </div>

          <!-- Bottom Page Footer -->
          <div style="text-align: center; font-size: 9.5px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 6px;">
            ${L.generatedBy} • ${new Date().toLocaleString(isTamil ? 'ta-IN' : 'en-IN')}
          </div>
        `;

        pagesCanvases.push(await renderElementToCanvas(detailPage));
      }
    }
  }

  // Combine into multi-page jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 0; i < pagesCanvases.length; i++) {
    if (i > 0) doc.addPage();
    const imgData = pagesCanvases[i].toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }

  const filename = `Cashly_Range_Report_${fromDate}_to_${toDate}.pdf`;
  return await saveOrSharePdf(doc, filename, `Cashly Statement (${fromDate} to ${toDate})`);
}
