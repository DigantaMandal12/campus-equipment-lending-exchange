require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");

const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Transaction = require("../models/Transaction");


const TEST_BORROWER_EMAIL =
  "garinagaming90@gmail.com";

const TEST_EQUIPMENT_NAME =
  "Mousse";

const TEST_QUANTITY = 1;


/*
 * Create an ACTIVE borrowing whose
 * return deadline is within 24 hours.
 *
 * This script is ONLY for local Phase 4F testing.
 *
 * It does NOT create payment records,
 * fake UTR verification, or change user trust.
 */
async function createPhase4FTestTransaction() {

  await connectDB();

  const session =
    await mongoose.startSession();


  try {

    let createdTransaction = null;


    await session.withTransaction(
      async () => {

        /*
         * Find the real borrower.
         */
        const borrower =
          await User.findOne(
            {
              email:
                TEST_BORROWER_EMAIL
            }
          ).session(session);


        if (!borrower) {

          throw new Error(
            `Borrower not found: ${TEST_BORROWER_EMAIL}`
          );

        }


        /*
         * Find a real lender-owned equipment item.
         */
        const equipment =
          await Equipment.findOne(
            {
              name:
                TEST_EQUIPMENT_NAME,

              availableQuantity: {
                $gte:
                  TEST_QUANTITY
              },

              status:
                "AVAILABLE"
            }
          ).session(session);


        if (!equipment) {

          throw new Error(
            `No available equipment found for "${TEST_EQUIPMENT_NAME}".`
          );

        }


        /*
         * Prevent duplicate Phase 4F fixtures.
         */
        const existing =
          await Transaction.findOne(
            {
              borrower:
                borrower._id,

              equipment:
                equipment._id,

              status:
                "ACTIVE"
            }
          ).session(session);


        if (existing) {

          throw new Error(
            `An ACTIVE transaction already exists: ${existing._id}`
          );

        }


        /*
         * Atomically consume one available unit.
         */
        const updatedEquipment =
          await Equipment.findOneAndUpdate(
            {
              _id:
                equipment._id,

              status:
                "AVAILABLE",

              availableQuantity: {
                $gte:
                  TEST_QUANTITY
              }
            },
            {
              $inc: {
                availableQuantity:
                  -TEST_QUANTITY
              }
            },
            {
              new: true,
              session,
              runValidators: true
            }
          );


        if (!updatedEquipment) {

          throw new Error(
            "Unable to reserve equipment for the Phase 4F test."
          );

        }


        /*
         * Keep equipment status consistent.
         */
        await Equipment.updateOne(
          {
            _id:
              updatedEquipment._id
          },
          {
            $set: {
              status:
                updatedEquipment.availableQuantity >
                0
                  ? "AVAILABLE"
                  : "UNAVAILABLE"
            }
          },
          {
            session
          }
        );


        /*
         * Lender is the equipment owner.
         */
        const lender =
          await User.findById(
            equipment.owner
          ).session(session);


        if (!lender) {

          throw new Error(
            "Equipment owner/lender was not found."
          );

        }


        /*
         * Due date = 24 hours from now.
         *
         * This is deliberately inside the
         * 48-hour reminder window.
         */
        const requestDate =
          new Date();

        const requestedReturnDate =
          new Date(
            requestDate.getTime() +
            24 * 60 * 60 * 1000
          );


        const transaction =
          new Transaction(
            {
              borrower:
                borrower._id,

              lender:
                lender._id,

              equipment:
                equipment._id,

              quantity:
                TEST_QUANTITY,

              requestDate,

              requestedReturnDate,

              approvedDate:
                requestDate,

              handoverDate:
                requestDate,

              actualReturnDate:
                null,

              status:
                "ACTIVE",

              rentalFee:
                equipment.rentalFee || 0,

              securityDeposit:
                equipment.securityDeposit || 0,

              paymentStatus:
                "DEPOSIT_CONFIRMED",

              paymentReference:
                "PHASE4F-DEMO",

              depositRefundStatus:
                "NOT_APPLICABLE",

              returnedCondition:
                "",

              lateDays:
                0,

              damageReported:
                false,

              trustPointsChange:
                0
            }
          );


        createdTransaction =
          await transaction.save(
            {
              session
            }
          );

      }
    );


    console.log("");
    console.log(
      "=============================================="
    );

    console.log(
      "   PHASE 4F TEST TRANSACTION CREATED"
    );

    console.log(
      "=============================================="
    );

    console.log(
      `Transaction ID: ${createdTransaction._id}`
    );

    console.log(
      `Status: ${createdTransaction.status}`
    );

    console.log(
      `Payment: ${createdTransaction.paymentStatus}`
    );

    console.log(
      `Return date: ${createdTransaction.requestedReturnDate.toISOString()}`
    );

    console.log(
      "Due window: within 24 hours"
    );

    console.log(
      "Payment reference: PHASE4F-DEMO"
    );

    console.log(
      "=============================================="
    );

  } finally {

    await session.endSession();

  }

}


createPhase4FTestTransaction()
  .then(
    async () => {
      await mongoose.connection.close();
      process.exit(0);
    }
  )
  .catch(
    async (error) => {

      console.error("");
      console.error(
        "Phase 4F test fixture failed:"
      );

      console.error(
        error.message
      );

      await mongoose.connection.close();

      process.exit(1);

    }
  );