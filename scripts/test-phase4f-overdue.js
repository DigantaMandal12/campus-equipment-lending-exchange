require("dotenv").config();

const mongoose = require("mongoose");

const connectDB =
  require("../config/db");

const Transaction =
  require("../models/Transaction");

const {
  runDueDateReminderJob
} = require("../services/dueDateService");


const PHASE4F_PAYMENT_REFERENCE =
  "PHASE4F-DEMO";


async function run() {

  await connectDB();

  try {

    console.log("");

    console.log(
      "=============================================="
    );

    console.log(
      "   PHASE 4F OVERDUE TEST"
    );

    console.log(
      "=============================================="
    );


    /*
     * Find the dedicated Phase 4F test transaction.
     *
     * IMPORTANT:
     * We intentionally do NOT filter by status.
     *
     * The previous test may have already changed
     * ACTIVE -> OVERDUE.
     */
    const transaction =
      await Transaction.findOne({
        paymentReference:
          PHASE4F_PAYMENT_REFERENCE
      });


    if (!transaction) {

      throw new Error(
        `Phase 4F test transaction was not found using paymentReference "${PHASE4F_PAYMENT_REFERENCE}".`
      );

    }


    console.log(
      `Transaction: ${transaction._id}`
    );

    console.log(
      `Previous status: ${transaction.status}`
    );


    /*
     * Create an artificial overdue date.
     *
     * One hour in the past.
     */
    const overdueDate =
      new Date(
        Date.now() -
        60 * 60 * 1000
      );


    /*
     * IMPORTANT:
     *
     * This is a TEST FIXTURE reset.
     *
     * We directly update MongoDB instead of using
     * transaction.save() because Mongoose validation
     * correctly prevents a requestedReturnDate that
     * is earlier than requestDate.
     *
     * We reset ONLY the dedicated PHASE4F-DEMO
     * transaction.
     */
    const resetResult =
      await Transaction.collection.updateOne(
        {
          _id:
            transaction._id,

          paymentReference:
            PHASE4F_PAYMENT_REFERENCE
        },

        {
          $set: {
            status:
              "ACTIVE",

            requestedReturnDate:
              overdueDate
          }
        }
      );


    if (
      resetResult.matchedCount !== 1
    ) {

      throw new Error(
        "Could not find the Phase 4F test transaction during reset."
      );

    }


    console.log(
      `Temporary due date: ${overdueDate.toISOString()}`
    );

    console.log(
      "Test transaction reset to ACTIVE."
    );


    /*
     * Run the REAL production reminder logic.
     */
    console.log("");

    console.log(
      "Running due-date reminder job..."
    );


    const result =
      await runDueDateReminderJob();


    /*
     * Load the transaction again after
     * the production job has completed.
     */
    const updated =
      await Transaction.findById(
        transaction._id
      ).lean();


    if (!updated) {

      throw new Error(
        "Phase 4F transaction could not be found after reminder job."
      );

    }


    /*
     * Display job result.
     */
    console.log("");

    console.log(
      "JOB RESULT"
    );

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );


    /*
     * Display final transaction state.
     */
    console.log("");

    console.log(
      "TRANSACTION AFTER JOB"
    );

    console.log(
      JSON.stringify(
        {
          _id:
            updated._id.toString(),

          status:
            updated.status,

          paymentStatus:
            updated.paymentStatus,

          requestedReturnDate:
            updated.requestedReturnDate
        },
        null,
        2
      )
    );


    /*
     * Verify the real production logic.
     *
     * Expected:
     *
     * ACTIVE
     *   ↓
     * reminder job
     *   ↓
     * OVERDUE
     */
    if (
      updated.status ===
      "OVERDUE"
    ) {

      console.log("");

      console.log(
        "✅ PHASE 4F OVERDUE TEST PASSED"
      );

      console.log(
        "ACTIVE → OVERDUE works correctly."
      );

    } else {

      throw new Error(
        `Expected OVERDUE but received ${updated.status}.`
      );

    }

  } finally {

    /*
     * Close MongoDB connection.
     */
    await mongoose.connection.close();

  }

}


run()
  .catch(
    async (error) => {

      console.error("");

      console.error(
        "❌ PHASE 4F OVERDUE TEST FAILED"
      );

      console.error(
        error.message
      );


      try {

        await mongoose.connection.close();

      } catch (_) {}


      process.exit(1);

    }
  );