const {
  createEquipment,
  getEquipmentById,
  getAvailableEquipment,
  getMyEquipment,
  getMyEquipmentById,
  updateMyEquipment,
  deleteMyEquipment
} = require("../services/equipmentService");

function renderCreateEquipment(
  req,
  res
) {
  return res.render(
    "equipment/new",
    {
      title: "Add Equipment",
      error:
        req.query.error || null,
      formData: {
        name: "",
        description: "",
        category: "",
        department:
          req.session.user.department || "",
        condition: "GOOD",
        quantity: "1",
        rentalFee: "0",
        securityDeposit: "0",
        borrowingTerms: ""
      }
    }
  );
}

async function create(
  req,
  res
) {
  try {
    await createEquipment(
      req.session.user.id,
      req.body
    );

    return res.redirect(
      "/equipment/mine?success=Equipment+listed+successfully."
    );
  } catch (error) {
    return res.status(400).render(
      "equipment/new",
      {
        title: "Add Equipment",
        error: error.message,
        formData: {
          name:
            req.body.name || "",
          description:
            req.body.description || "",
          category:
            req.body.category || "",
          department:
            req.body.department ||
            req.session.user.department ||
            "",
          condition:
            req.body.condition ||
            "GOOD",
          quantity:
            req.body.quantity || "1",
          rentalFee:
            req.body.rentalFee || "0",
          securityDeposit:
            req.body.securityDeposit ||
            "0",
          borrowingTerms:
            req.body.borrowingTerms ||
            ""
        }
      }
    );
  }
}

async function browse(
  req,
  res,
  next
) {
  try {
    const equipment =
      await getAvailableEquipment();

    return res.render(
      "equipment/browse",
      {
        title: "Browse Equipment",
        equipment,
        currentUser:
          req.session.user,
        isOwnerView: false
      }
    );
  } catch (error) {
    next(error);
  }
}

async function mine(
  req,
  res,
  next
) {
  try {
    const equipment =
      await getMyEquipment(
        req.session.user.id
      );

    return res.render(
      "equipment/browse",
      {
        title: "My Equipment",
        equipment,
        currentUser:
          req.session.user,
        isOwnerView: true,
        success:
          req.query.success || null
      }
    );
  } catch (error) {
    next(error);
  }
}

async function details(
  req,
  res,
  next
) {
  try {
    const equipment =
      await getEquipmentById(
        req.params.id
      );

    return res.render(
      "equipment/detail",
      {
        title: equipment.name,
        equipment,
        currentUser:
          req.session.user
      }
    );
  } catch (error) {
    next(error);
  }
}

async function renderEditEquipment(
  req,
  res,
  next
) {
  try {
    const equipment =
      await getMyEquipmentById(
        req.session.user.id,
        req.params.id
      );

    return res.render(
      "equipment/edit",
      {
        title: `Edit ${equipment.name}`,
        error: null,
        equipment
      }
    );
  } catch (error) {
    next(error);
  }
}

async function update(
  req,
  res,
  next
) {
  try {
    await updateMyEquipment(
      req.session.user.id,
      req.params.id,
      req.body
    );

    return res.redirect(
      `/equipment/mine?success=${encodeURIComponent(
        "Equipment updated successfully."
      )}`
    );
  } catch (error) {
    try {
      const equipment =
        await getMyEquipmentById(
          req.session.user.id,
          req.params.id
        );

      return res.status(400).render(
        "equipment/edit",
        {
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
        }
      );
    } catch (renderError) {
      next(renderError);
    }
  }
}

async function remove(
  req,
  res,
  next
) {
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