const { getDB } = require("../config/db");

// Obtener todas las sanciones
const getAllPenalties = async (req, res) => {
  try {
    const db = getDB();
    const penalties = await db.collection("penalties").find().toArray();

    if (penalties) {
      res.status(200).send({
        code: 200,
        message: "Penalties successfully obtained",
        data: penalties,
      });
    } else {
      return res.status(500).send("Error fetching penalties from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
        message: "Penalty successfully obtained",
        data: penalty,
      });
    } else {
      res.status(404).send("Penalty not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear una nueva sanción
const createPenalty = async (req, res) => {
  try {
    const db = getDB();
    const penalties = await db.collection("penalties").find().toArray();

    const newPenalty = {
      id: penalties.length + 1, // O usar un enfoque más robusto para IDs
      ...req.body,
    };

    await db.collection("penalties").insertOne(newPenalty);

    res.status(200).send({
      code: 200,
      message: "Penalty successfully created",
      data: newPenalty,
    });
  } catch (err) {
    res.status(500).send("Server error");
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

    if (updatedPenalty.value) {
      res.status(200).send({
        code: 200,
        message: "Penalty successfully updated",
        data: updatedPenalty.value,
      });
    } else {
      res.status(404).send("Penalty not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar una sanción por ID
const deletePenalty = async (req, res) => {
  try {
    const db = getDB();
    const deletedPenalty = await db
      .collection("penalties")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedPenalty.value) {
      res.status(200).send({
        code: 200,
        message: "Penalty successfully deleted",
        data: deletedPenalty.value,
      });
    } else {
      res.status(404).send("Penalty not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllPenalties,
  getPenaltyByID,
  createPenalty,
  updatePenalty,
  deletePenalty,
};
