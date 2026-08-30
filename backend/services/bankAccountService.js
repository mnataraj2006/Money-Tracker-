const { BankAccount, Transaction, AccountBalanceCheck } = require('../db_mongo');

class BankAccountService {
  /**
   * Get balance calculation and metadata for all bank accounts of a user
   */
  static async getAllAccountsSummary(userId) {
    try {
      const accounts = await BankAccount.find({ userId }).sort({ createdAt: 1 }).lean();
      if (!accounts || accounts.length === 0) {
        return [];
      }

      const accountIds = accounts.map(a => a.id);

      // Fast aggregation: sum income & expense grouped by accountId and type
      const [txAgg, checks] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              userId,
              accountId: { $in: accountIds }
            }
          },
          {
            $group: {
              _id: { accountId: '$accountId', type: '$type' },
              total: { $sum: '$amount' }
            }
          }
        ]),
        AccountBalanceCheck.find({ userId, accountId: { $in: accountIds } })
          .sort({ checkedAt: -1 })
          .lean()
      ]);

      // Build quick lookup maps
      const totalsMap = {};
      txAgg.forEach(item => {
        const accId = item._id.accountId;
        const type = item._id.type;
        if (!totalsMap[accId]) {
          totalsMap[accId] = { income: 0, expense: 0 };
        }
        if (type === 'INCOME') totalsMap[accId].income += item.total;
        if (type === 'EXPENSE') totalsMap[accId].expense += item.total;
      });

      const lastCheckMap = {};
      checks.forEach(chk => {
        if (!lastCheckMap[chk.accountId]) {
          lastCheckMap[chk.accountId] = chk;
        }
      });

      return accounts.map(acc => {
        const totals = totalsMap[acc.id] || { income: 0, expense: 0 };
        const opening = acc.openingBalance || 0;
        const expectedBalance = opening + totals.income - totals.expense;
        const lastCheck = lastCheckMap[acc.id] || null;

        return {
          id: acc.id,
          name: acc.name,
          openingBalance: opening,
          totalIncome: totals.income,
          totalExpense: totals.expense,
          expectedBalance,
          lastCheck,
          createdAt: acc.createdAt,
          updatedAt: acc.updatedAt
        };
      });
    } catch (err) {
      console.error('Error in BankAccountService.getAllAccountsSummary:', err);
      throw err;
    }
  }

  /**
   * Get single account summary with transactions and verification history
   */
  static async getAccountSummary(userId, accountId) {
    try {
      const account = await BankAccount.findOne({ id: accountId, userId }).lean();
      if (!account) return null;

      const [txAgg, recentTxs, recentChecks] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              userId,
              accountId
            }
          },
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' }
            }
          }
        ]),
        Transaction.find({ userId, accountId })
          .sort({ date: -1, createdAt: -1 })
          .limit(100)
          .select('id type amount name transactionName category paymentMethod accountId description date createdAt')
          .lean(),
        AccountBalanceCheck.find({ userId, accountId })
          .sort({ checkedAt: -1 })
          .limit(10)
          .lean()
      ]);

      let totalIncome = 0;
      let totalExpense = 0;
      txAgg.forEach(item => {
        if (item._id === 'INCOME') totalIncome = item.total;
        if (item._id === 'EXPENSE') totalExpense = item.total;
      });

      const openingBalance = account.openingBalance || 0;
      const expectedBalance = openingBalance + totalIncome - totalExpense;

      return {
        id: account.id,
        name: account.name,
        openingBalance,
        totalIncome,
        totalExpense,
        expectedBalance,
        lastCheck: recentChecks.length > 0 ? recentChecks[0] : null,
        recentChecks,
        transactions: recentTxs,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    } catch (err) {
      console.error('Error in BankAccountService.getAccountSummary:', err);
      throw err;
    }
  }
}

module.exports = BankAccountService;
