"use strict";

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB =
  require("../config/db");

const User =
  require("../models/User");

const Equipment =
  require("../models/Equipment");

const Transaction =
  require("../models/Transaction");

const {
  confirmReturn
} = require("../services/returnService");

const TEST_REFERENCE =
  `PHASE5C-DEMO-${Date.now()}`;

async function run() {
  let createdTransaction = null;

  let borrowerId = null;
  let equipmentId = null;

  let originalTrustScore = null;
  let originalAvailableQuantity = null;
  let originalEquipmentStatus = null;

  try {
    console.log("\n==============================================");
    console.log("        PHASE 5C TRUST INTEGRATION TEST");
    console.log("==============================================\n");

    await connectDB();

    console.log("✅ MongoDB connected.");

    /*
     * Find an existing transaction to use as a safe fixture.
     * We do NOT modify the original transaction.
     */
    let baseTransaction =
      await Transaction.findOne({
        paymentStatus: "DEPOSIT_CONFIRMED"
      }).sort({
        createdAt: -1
      });

    if (!baseTransaction) {
      throw new Error(
        "No transaction with DEPOSIT_CONFIRMED was found."
      );
    }

    const borrower =
      await User.findById(
        baseTransaction.borrower
      );

    if (!borrower) {
      throw new Error(
        "Borrower for fixture transaction was not found."
      );
    }

    const equipment =
      await Equipment.findById(
        baseTransaction.equipment
      );

    if (!equipment) {
      throw new Error(
        "Equipment for fixture transaction was not found."
      );
    }

    const lenderId =
      baseTransaction.lender;

    borrowerId =
      borrower._id;

    equipmentId =
      equipment._id;

    originalTrustScore =
      borrower.trustScore;

    originalAvailableQuantity =
      equipment.availableQuantity;

    originalEquipmentStatus =
      equipment.status;

    /*
     * We intentionally start at 100 so
     * MINOR_DAMAGE produces an observable -10.
     */
    await User.updateOne(
      { _id: borrower._id },
      {
        $set: {
          trustScore: 100
        }
      }
    );

    console.log(
      `✅ Borrower fixture: ${borrower._id}`
    );

    console.log(
      `✅ Lender fixture: ${lenderId}`
    );

    console.log(
      `✅ Equipment fixture: ${equipment._id}`
    );

    /*
     * Simulate one borrowed unit.
     */
    const quantity =
      Number(baseTransaction.quantity) || 1;

    if (
      equipment.availableQuantity <
      quantity
    ) {
      throw new Error(
        `Not enough available equipment quantity for test. Available=${equipment.availableQuantity}, required=${quantity}`
      );
    }

    equipment.availableQuantity -=
      quantity;

    equipment.status =
      equipment.availableQuantity > 0
        ? "AVAILABLE"
        : "UNAVAILABLE";

    await equipment.save();

    console.log(
      `✅ Simulated checkout of ${quantity} unit(s).`
    );

    /*
     * Clone the transaction instead of modifying
     * the existing Phase 4 transaction.
     */
    const transactionData =
      baseTransaction.toObject();

    delete transactionData._id;
    delete transactionData.createdAt;
    delete transactionData.updatedAt;

    transactionData.status =
      "RETURN_REQUESTED";

    transactionData.paymentStatus =
      "DEPOSIT_CONFIRMED";

    transactionData.paymentReference =
      TEST_REFERENCE;

    transactionData.requestDate =
      new Date(
        Date.now() - 60 * 60 * 1000
      );

    transactionData.requestedReturnDate =
      new Date(
        Date.now() + 60 * 60 * 1000
      );

    transactionData.actualReturnDate =
      null;

    transactionData.returnedCondition =
      undefined;

    transactionData.lateDays =
      0;

    transactionData.damageReported =
      false;

    transactionData.trustPointsChange =
      0;

    transactionData.depositRefundStatus =
      "PENDING";

    const testTransaction =
      new Transaction(
        transactionData
      );

    createdTransaction =
      await testTransaction.save();

    console.log(
      `✅ Created Phase 5C test transaction: ${createdTransaction._id}`
    );

    console.log(
      "\nTesting MINOR_DAMAGE return..."
    );

    /*
     * MINOR_DAMAGE should:
     * trust points = -10
     * trustScore 100 -> 90
     */
    const result =
      await confirmReturn(
        lenderId,
        createdTransaction._id,
        "MINOR_DAMAGE"
      );

    console.log("\nRETURN RESULT");
    console.log("------------------------------");

    console.log(
      `Transaction status: ${result.status}`
    );

    console.log(
      `Returned condition: ${result.returnedCondition}`
    );

    console.log(
      `Late days: ${result.lateDays}`
    );

    console.log(
      `Trust points change: ${result.trustPointsChange}`
    );

    const updatedBorrower =
      await User.findById(
        borrower._id
      ).select(
        "name email trustScore"
      );

    const updatedEquipment =
      await Equipment.findById(
        equipment._id
      ).select(
        "quantity availableQuantity status"
      );

    console.log(
      `Borrower trust score: ${updatedBorrower.trustScore}`
    );

    console.log(
      `Equipment available quantity: ${updatedEquipment.availableQuantity}`
    );

    let failures = 0;

    if (
      result.status !== "RETURNED"
    ) {
      failures++;
      console.error(
        "❌ Transaction did not become RETURNED."
      );
    } else {
      console.log(
        "✅ Transaction became RETURNED."
      );
    }

    if (
      result.returnedCondition !==
      "MINOR_DAMAGE"
    ) {
      failures++;
      console.error(
        "❌ Returned condition is incorrect."
      );
    } else {
      console.log(
        "✅ Returned condition recorded correctly."
      );
    }

    if (
      result.trustPointsChange !==
      -10
    ) {
      failures++;
      console.error(
        `❌ Expected trustPointsChange=-10, got ${result.trustPointsChange}.`
      );
    } else {
      console.log(
        "✅ trustPointsChange = -10."
      );
    }

    if (
      updatedBorrower.trustScore !==
      90
    ) {
      failures++;
      console.error(
        `❌ Expected trustScore=90, got ${updatedBorrower.trustScore}.`
      );
    } else {
      console.log(
        "✅ Borrower trustScore changed 100 → 90."
      );
    }

    if (
      updatedEquipment.availableQuantity !==
      originalAvailableQuantity
    ) {
      failures++;
      console.error(
        `❌ Equipment quantity was not restored correctly. Expected ${originalAvailableQuantity}, got ${updatedEquipment.availableQuantity}.`
      );
    } else {
      console.log(
        "✅ Equipment quantity restored correctly."
      );
    }

    console.log("\n==============================================");

    if (failures === 0) {
      console.log(
        "✅ PHASE 5C INTEGRATION TEST PASSED"
      );
    } else {
      console.error(
        `❌ PHASE 5C INTEGRATION TEST FAILED (${failures} failure(s))`
      );
      process.exitCode = 1;
    }

  } catch (error) {
    console.error(
      "\n❌ PHASE 5C TEST ERROR"
    );

    console.error(
      error.message
    );

    process.exitCode = 1;

  } finally {
    /*
     * Cleanup everything created by the test.
     */
    try {
      if (createdTransaction) {
        await Transaction.deleteOne({
          _id: createdTransaction._id
        });

        console.log(
          "🧹 Test transaction removed."
        );
      }

      if (
        equipmentId &&
        originalAvailableQuantity !== null
      ) {
        await Equipment.updateOne(
          { _id: equipmentId },
          {
            $set: {
              availableQuantity:
                originalAvailableQuantity,

              status:
                originalEquipmentStatus
            }
          }
        );

        console.log(
          "🧹 Equipment state restored."
        );
      }

      if (
        borrowerId &&
        originalTrustScore !== null
      ) {
        await User.updateOne(
          { _id: borrowerId },
          {
            $set: {
              trustScore:
                originalTrustScore
            }
          }
        );

        console.log(
          "🧹 Borrower trust score restored."
        );
      }
    } catch (cleanupError) {
      console.error(
        "⚠️ Cleanup error:",
        cleanupError.message
      );
    }

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );
  }
}

run();