const { getDB } = require("../../config/db");

// Obtener todas las sanciones
const getAllPenalties = async (req, res) => {
  try {
    const db = getDB();
    const penalties = await db.collection("penalties").find().toArray();

    if (penalties) {
      res.status(200).send({
        code: 200,
        message: "Sanciones obtenidas exitosamente",
        data: penalties,
      });
    } else {
      return res
        .status(500)
        .send("Error al obtener las sanciones de la base de datos");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener una sanción por ID
const getPenaltyByID = async (req, res) => {
  try {
    const db = getDB();
    const penalty = await db
      .collection("penalties")
      .findOne({ id: parseInt(req.params.id) });

    if (penalty) {
      res.status(200).send({
        code: 200,
        message: "Sanción obtenida exitosamente",
        data: penalty,
      });
    } else {
      res.status(404).send("Sanción no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear una nueva sanción
const createPenalty = async (req, res) => {
  try {
    const db = getDB();

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("penalties")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newPenalty = {
      id: newId, // O usar un enfoque más robusto para IDs
      ...req.body,
    };

    await db.collection("penalties").insertOne(newPenalty);

    res.status(200).send({
      code: 200,
      message: "Sanción creada exitosamente",
      data: newPenalty,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar una sanción por ID
const updatePenalty = async (req, res) => {
  try {
    const db = getDB();
    const updatedPenalty = await db
      .collection("penalties")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedPenalty) {
      res.status(200).send({
        code: 200,
        message: "Sanción actualizada exitosamente",
        data: updatedPenalty,
      });
    } else {
      res.status(404).send("Sanción no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar una sanción por ID
const deletePenalty = async (req, res) => {
  try {
    const db = getDB();
    const deletedPenalty = await db
      .collection("penalties")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedPenalty) {
      res.status(200).send({
        code: 200,
        message: "Sanción eliminada exitosamente",
        data: deletedPenalty,
      });
    } else {
      res.status(404).send("Sanción no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllPenalties,
  getPenaltyByID,
  createPenalty,
  updatePenalty,
  deletePenalty,
};
