const fs = require("fs");
const path = require("path");

const {
  createEquipment,
  getEquipmentById,
  getAvailableEquipment,
  getMyEquipment,
  getMyEquipmentById,
  updateMyEquipment,
  deleteMyEquipment
} = require("../services/equipmentService");

/**
 * Delete files uploaded by multer when an operation fails.
 */
function cleanupUploadedFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  for (const file of files) {
    if (!file || !file.filename) {
      continue;
    }

    const filePath = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      "equipment",
      file.filename
    );

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error(
        "Failed to remove uploaded file:",
        filePath,
        cleanupError.message
      );
    }
  }
}

/**
 * Render equipment creation form.
 */
function renderCreateEquipment(req, res) {
  return res.render("equipment/new", {
    title: "Add Equipment",
    error: req.query.error || null,

    formData: {
      name: "",
      description: "",
      category: "",
      department: req.session.user.department || "",
      condition: "GOOD",
      quantity: "1",
      rentalFee: "0",
      securityDeposit: "0",
      borrowingTerms: ""
    }
  });
}

/**
 * Create new equipment.
 */
async function create(req, res) {
  try {
    const imagePaths = (req.files || []).map(
      (file) => `/uploads/equipment/${file.filename}`
    );

    await createEquipment(req.session.user.id, {
      ...req.body,
      images: imagePaths
    });

    return res.redirect(
      "/equipment/mine?success=Equipment+listed+successfully."
    );
  } catch (error) {
    cleanupUploadedFiles(req.files);

    return res.status(400).render("equipment/new", {
      title: "Add Equipment",
      error: error.message,

      formData: {
        name: req.body.name || "",
        description: req.body.description || "",
        category: req.body.category || "",

        department:
          req.body.department ||
          req.session.user.department ||
          "",

        condition: req.body.condition || "GOOD",
        quantity: req.body.quantity || "1",
        rentalFee: req.body.rentalFee || "0",
        securityDeposit:
          req.body.securityDeposit || "0",

        borrowingTerms:
          req.body.borrowingTerms || ""
      }
    });
  }
}

/**
 * Browse available equipment.
 */
async function browse(req, res, next) {
  try {
    const equipment = await getAvailableEquipment();

    return res.render("equipment/browse", {
      title: "Browse Equipment",
      equipment,

      currentUser: req.session.user,

      isOwnerView: false
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Show lender's own equipment.
 */
async function mine(req, res, next) {
  try {
    const equipment = await getMyEquipment(
      req.session.user.id
    );

    return res.render("equipment/browse", {
      title: "My Equipment",
      equipment,

      currentUser: req.session.user,

      isOwnerView: true,

      success: req.query.success || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Show equipment details.
 */
async function details(req, res, next) {
  try {
    const equipment = await getEquipmentById(
      req.params.id
    );

    return res.render("equipment/detail", {
      title: equipment.name,
      equipment,

      currentUser: req.session.user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Render equipment edit form.
 * Ownership is checked inside the service.
 */
async function renderEditEquipment(req, res, next) {
  try {
    const equipment = await getMyEquipmentById(
      req.session.user.id,
      req.params.id
    );

    return res.render("equipment/edit", {
      title: `Edit ${equipment.name}`,
      error: null,
      equipment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update lender's equipment.
 */
async function update(req, res, next) {
  try {
    const imagePaths = (req.files || []).map(
      (file) => `/uploads/equipment/${file.filename}`
    );

    await updateMyEquipment(
      req.session.user.id,
      req.params.id,
      {
        ...req.body,
        images: imagePaths
      }
    );

    return res.redirect(
      `/equipment/mine?success=${encodeURIComponent(
        "Equipment updated successfully."
      )}`
    );
  } catch (error) {
    /**
     * New files were already stored by multer.
     * Remove them when database update fails.
     */
    cleanupUploadedFiles(req.files);

    try {
      const equipment = await getMyEquipmentById(
        req.session.user.id,
        req.params.id
      );

      return res.status(400).render("equipment/edit", {
        title: `Edit ${equipment.name}`,
        error: error.message,

        equipment: {
          ...equipment,

          name:
            req.body.name ||
            equipment.name,

          description:
            req.body.description ||
            equipment.description,

          category:
            req.body.category ||
            equipment.category,

          department:
            req.body.department ||
            equipment.department,

          condition:
            req.body.condition ||
            equipment.condition,

          quantity:
            req.body.quantity ||
            equipment.quantity,

          rentalFee:
            req.body.rentalFee ??
            equipment.rentalFee,

          securityDeposit:
            req.body.securityDeposit ??
            equipment.securityDeposit,

          borrowingTerms:
            req.body.borrowingTerms ??
            equipment.borrowingTerms
        }
      });
    } catch (renderError) {
      next(renderError);
    }
  }
}

/**
 * Delete lender's equipment.
 */
async function remove(req, res, next) {
  try {
    await deleteMyEquipment(
      req.session.user.id,
      req.params.id
    );

    return res.redirect(
      `/equipment/mine?success=${encodeURIComponent(
        "Equipment deleted successfully."
      )}`
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderCreateEquipment,
  create,
  browse,
  mine,
  details,
  renderEditEquipment,
  update,
  remove
};