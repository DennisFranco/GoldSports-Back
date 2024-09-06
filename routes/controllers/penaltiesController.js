const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

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
      return res.status(500).send("Error al leer las sanciones");
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
      .findOne({ _id:  new ObjectId(req.params.id) });

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
    const newPenalty = { ...req.body };

    const result = await db.collection("penalties").insertOne(newPenalty);

    res.status(200).send({
      code: 200,
      message: "Sanción creada exitosamente",
      data: result.ops[0], // Devolver el objeto creado
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar una sanción por ID
const updatePenalty = async (req, res) => {
  try {
    const db = getDB();
    const updatedPenalty = { ...req.body };

    const result = await db
      .collection("penalties")
      .findOneAndUpdate(
        { _id:  new ObjectId(req.params.id) },
        { $set: updatedPenalty },
        { returnOriginal: false }
      );

    if (result.value) {
      res.status(200).send({
        code: 200,
        message: "Sanción actualizada exitosamente",
        data: result.value,
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
    const result = await db
      .collection("penalties")
      .findOneAndDelete({ _id:  new ObjectId(req.params.id) });

    if (result.value) {
      res.status(200).send({
        code: 200,
        message: "Sanción eliminada exitosamente",
        data: result.value,
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
