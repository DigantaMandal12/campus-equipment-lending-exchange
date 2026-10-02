const mongoose =
  require("mongoose");

const User =
  require("../models/User");

const TRUST_SCORE_CONFIG =
  require("../config/trust");


function normalizeUserId(userId) {

  if (
    userId instanceof
    mongoose.Types.ObjectId
  ) {

    return userId;

  }


  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {

    const error =
      new Error(
        "Invalid user ID."
      );

    error.statusCode = 400;

    throw error;
  }


  return new mongoose.Types.ObjectId(
    userId
  );
}


/*
 * Keep trust score inside
 * the configured 0–100 range.
 */
function clampTrustScore(
  score
) {

  return Math.min(
    TRUST_SCORE_CONFIG.MAX_SCORE,
    Math.max(
      TRUST_SCORE_CONFIG.MIN_SCORE,
      score
    )
  );

}


/*
 * Calculate trust-point change
 * without modifying the database.
 *
 * latePenaltyUnits is intentionally
 * configurable because the specification
 * defines -5 per reasonable penalty unit
 * but does not define how many units every
 * late return must contain.
 */
function calculateTrustPoints({
  onTimeReturn = false,
  latePenaltyUnits = 0,
  damageSeverity = "NONE",
  seriousViolation = false
} = {}) {

  let points = 0;


  if (
    onTimeReturn
  ) {

    points +=
      TRUST_SCORE_CONFIG
        .ON_TIME_RETURN_POINTS;

  }


  if (
    Number.isFinite(
      latePenaltyUnits
    ) &&
    latePenaltyUnits > 0
  ) {

    points +=
      TRUST_SCORE_CONFIG
        .LATE_RETURN_POINTS_PER_UNIT *
      Math.floor(
        latePenaltyUnits
      );

  }


  const normalizedDamage =
    String(
      damageSeverity || "NONE"
    )
      .trim()
      .toUpperCase();


  if (
    normalizedDamage ===
    "MINOR"
  ) {

    points +=
      TRUST_SCORE_CONFIG
        .MINOR_DAMAGE_POINTS;

  }


  if (
    normalizedDamage ===
    "MAJOR"
  ) {

    points +=
      TRUST_SCORE_CONFIG
        .MAJOR_DAMAGE_POINTS;

  }


  if (
    seriousViolation
  ) {

    points +=
      TRUST_SCORE_CONFIG
        .SERIOUS_VIOLATION_POINTS;

  }


  return points;
}


/*
 * Calculate what the user's new score
 * would be without changing MongoDB.
 */
function calculateNewTrustScore({
  currentScore,
  pointsChange
}) {

  const numericScore =
    Number.isFinite(
      Number(currentScore)
    )
      ? Number(currentScore)
      : TRUST_SCORE_CONFIG.STARTING_SCORE;


  return clampTrustScore(
    numericScore +
    Number(pointsChange || 0)
  );
}


/*
 * Atomically apply trust points to a user.
 *
 * MongoDB update pipeline is used so the
 * 0–100 boundary is enforced inside the
 * database update itself.
 */
async function applyTrustPoints({
  userId,
  pointsChange,
  session = null
}) {

  const normalizedUserId =
    normalizeUserId(
      userId
    );


  const numericPoints =
    Number(pointsChange);


  if (
    !Number.isFinite(
      numericPoints
    )
  ) {

    const error =
      new Error(
        "Trust-point change must be a valid number."
      );

    error.statusCode = 400;

    throw error;
  }


  const updateOptions = {};


  if (
    session
  ) {

    updateOptions.session =
      session;

  }


  const updatedUser =
    await User.findOneAndUpdate(
      {
        _id:
          normalizedUserId
      },

      [
        {
          $set: {
            trustScore: {
              $max: [
                TRUST_SCORE_CONFIG.MIN_SCORE,

                {
                  $min: [
                    TRUST_SCORE_CONFIG.MAX_SCORE,

                    {
                      $add: [
                        {
                          $ifNull: [
                            "$trustScore",
                            TRUST_SCORE_CONFIG.STARTING_SCORE
                          ]
                        },

                        numericPoints
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      ],

      {
        new: true,
        ...updateOptions
      }
    )
      .select(
        "_id name role trustScore"
      )
      .lean();


  if (
    !updatedUser
  ) {

    const error =
      new Error(
        "User not found while updating trust score."
      );

    error.statusCode = 404;

    throw error;
  }


  return updatedUser;
}


/*
 * Convenience method:
 * calculate points and apply them.
 */
async function applyTrustEvent({
  userId,
  onTimeReturn = false,
  latePenaltyUnits = 0,
  damageSeverity = "NONE",
  seriousViolation = false,
  session = null
}) {

  const pointsChange =
    calculateTrustPoints({
      onTimeReturn,
      latePenaltyUnits,
      damageSeverity,
      seriousViolation
    });


  const user =
    await applyTrustPoints({
      userId,
      pointsChange,
      session
    });


  return {
    pointsChange,
    trustScore:
      user.trustScore,
    user
  };
}


/*
 * Read current trust score.
 */
async function getTrustScore(
  userId
) {

  const normalizedUserId =
    normalizeUserId(
      userId
    );


  const user =
    await User.findById(
      normalizedUserId
    )
      .select(
        "_id name role trustScore"
      )
      .lean();


  if (
    !user
  ) {

    const error =
      new Error(
        "User not found."
      );

    error.statusCode = 404;

    throw error;
  }


  const score =
    typeof user.trustScore ===
    "number"
      ? clampTrustScore(
          user.trustScore
        )
      : TRUST_SCORE_CONFIG.STARTING_SCORE;


  return score;
}


module.exports = {

  TRUST_SCORE_CONFIG,

  clampTrustScore,

  calculateTrustPoints,

  calculateNewTrustScore,

  applyTrustPoints,

  applyTrustEvent,

  getTrustScore

};