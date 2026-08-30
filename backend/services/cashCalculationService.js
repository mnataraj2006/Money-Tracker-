const { Transaction, CashCount, DailyClosing } = require('../db_mongo');

/**
 * Single Source of Truth for Physical Cash Calculation & History Reconciliation
 */
class CashCalculationService {
  /**
   * Get the latest closed physical cash strictly before targetDate
   */
  static async getPreviousClosingCash(userId, targetDate) {
    try {
      const [prevClosing, latestCount] = await Promise.all([
        DailyClosing.findOne({
          userId,
          date: { $lt: targetDate },
          isClosed: true
        })
          .sort({ date: -1 })
          .select('date physicalCash expectedClosingCash')
          .lean(),
        CashCount.findOne({
          userId,
          date: { $lt: targetDate }
        })
          .sort({ date: -1, createdAt: -1 })
          .select('date physicalCash')
          .lean()
      ]);

      if (prevClosing && latestCount) {
        if (latestCount.date > prevClosing.date) {
          return latestCount.physicalCash;
        }
        return prevClosing.physicalCash !== undefined && prevClosing.physicalCash !== null
          ? prevClosing.physicalCash
          : prevClosing.expectedClosingCash;
      }

      if (prevClosing) {
        return prevClosing.physicalCash !== undefined && prevClosing.physicalCash !== null
          ? prevClosing.physicalCash
          : prevClosing.expectedClosingCash;
      }

      if (latestCount) return latestCount.physicalCash;

      return 0;
    } catch (err) {
      console.error('Error fetching previous closing cash:', err);
      return 0;
    }
  }

  /**
   * Compute Expected Cash for a given target date
   * Formula: Previous Closing + CASH Income - CASH Expense
   */
  static async getExpectedCash(userId, targetDate) {
    try {
      const previousDayCash = await this.getPreviousClosingCash(userId, targetDate);

      // Fast MongoDB aggregation for today's cash income & expense
      const agg = await Transaction.aggregate([
        {
          $match: {
            userId,
            date: targetDate,
            paymentMethod: 'CASH'
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]);

      let todayCashIncome = 0;
      let todayCashExpense = 0;

      agg.forEach(item => {
        if (item._id === 'INCOME') todayCashIncome = item.total;
        if (item._id === 'EXPENSE') todayCashExpense = item.total;
      });

      const expectedCash = previousDayCash + todayCashIncome - todayCashExpense;

      const [countRow, closingRow] = await Promise.all([
        CashCount.findOne({ userId, date: targetDate }).sort({ createdAt: -1 }).lean(),
        DailyClosing.findOne({ userId, date: targetDate }).lean()
      ]);

      let physicalCash = null;
      let hasCounted = false;
      if (countRow) {
        physicalCash = countRow.physicalCash;
        hasCounted = true;
      } else if (closingRow && closingRow.isClosed && closingRow.physicalCash !== undefined && closingRow.physicalCash !== null) {
        physicalCash = closingRow.physicalCash;
        hasCounted = true;
      }

      const difference = hasCounted ? (physicalCash - expectedCash) : 0;
      let status = 'NOT_COUNTED';

      if (hasCounted) {
        if (difference === 0) status = 'TALLIED';
        else if (difference < 0) status = 'SHORT';
        else status = 'EXTRA';
      }

      return {
        date: targetDate,
        previousDayCash,
        todayCashIncome,
        todayCashExpense,
        expectedCash,
        physicalCash,
        difference,
        status,
        hasCounted,
        isClosed: closingRow ? closingRow.isClosed : false,
        lastCheckDate: countRow ? countRow.createdAt : null,
        counts: countRow || null
      };
    } catch (err) {
      console.error('Error in getExpectedCash service:', err);
      throw err;
    }
  }

  /**
   * Recalculate daily closings forward from a given start date
   */
  static async recalculateDailyClosingsFrom(userId, startDate) {
    try {
      const affectedClosings = await DailyClosing.find({
        userId,
        date: { $gte: startDate }
      }).sort({ date: 1 });

      for (let closing of affectedClosings) {
        const openingCash = await this.getPreviousClosingCash(userId, closing.date);
        
        const agg = await Transaction.aggregate([
          {
            $match: {
              userId,
              date: closing.date,
              paymentMethod: 'CASH'
            }
          },
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' }
            }
          }
        ]);

        let cashIncome = 0;
        let cashExpense = 0;
        agg.forEach(item => {
          if (item._id === 'INCOME') cashIncome = item.total;
          if (item._id === 'EXPENSE') cashExpense = item.total;
        });

        const expectedClosingCash = openingCash + cashIncome - cashExpense;
        const countRow = await CashCount.findOne({ userId, date: closing.date }).sort({ createdAt: -1 }).lean();

        let physicalCash;
        if (countRow) {
          physicalCash = countRow.physicalCash;
        } else if (closing.isClosed && closing.physicalCash !== undefined && closing.physicalCash !== null) {
          physicalCash = closing.physicalCash;
        } else {
          physicalCash = expectedClosingCash;
        }

        const difference = physicalCash - expectedClosingCash;

        let status = 'TALLIED';
        if (difference < 0) status = 'SHORT';
        if (difference > 0) status = 'EXTRA';

        closing.openingCash = openingCash;
        closing.cashIncome = cashIncome;
        closing.cashExpense = cashExpense;
        closing.expectedClosingCash = expectedClosingCash;
        closing.physicalCash = physicalCash;
        closing.difference = difference;
        closing.status = status;
        await closing.save();
      }
    } catch (err) {
      console.error('Error recalculating daily closings:', err);
    }
  }
}

module.exports = CashCalculationService;
