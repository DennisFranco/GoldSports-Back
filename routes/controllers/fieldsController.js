const { ObjectId } = require("mongodb");
const { getDB } = require("../../config/db");

// Obtener todas las canchas
const getAllFields = async (req, res) => {
  try {
    const db = getDB();
    const fields = await db.collection("fields").find().toArray();

    if (fields) {
      res.status(200).send({
        code: 200,
        message: "Canchas obtenidas exitosamente",
        data: fields,
      });
    } else {
      return res
        .status(500)
        .send("Error al leer las canchas de la base de datos");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener una cancha por ID
const getFieldByID = async (req, res) => {
  try {
    const db = getDB();
    const field = await db
      .collection("fields")
      .findOne({ _id:  new ObjectId(req.params.id) });

    if (field) {
      res.status(200).send({
        code: 200,
        message: "Cancha obtenida exitosamente",
        data: field,
      });
    } else {
      res.status(404).send("Cancha no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear una nueva cancha
const createField = async (req, res) => {
  try {
    const db = getDB();
    const newField = { ...req.body };

    const result = await db.collection("fields").insertOne(newField);
    res.status(200).send({
      code: 200,
      message: "Cancha creada exitosamente",
      data: result.ops[0],
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar una cancha por ID
const updateField = async (req, res) => {
  try {
    const db = getDB();
    const fieldId = new ObjectId(req.params.id);
    const updatedField = req.body;

    const result = await db
      .collection("fields")
      .updateOne({ _id: fieldId }, { $set: updatedField });

    if (result.matchedCount > 0) {
      res.status(200).send({
        code: 200,
        message: "Cancha actualizada exitosamente",
        data: updatedField,
      });
    } else {
      res.status(404).send("Cancha no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar una cancha por ID
const deleteField = async (req, res) => {
  try {
    const db = getDB();
    const fieldId = new ObjectId(req.params.id);

    const result = await db.collection("fields").deleteOne({ _id: fieldId });

    if (result.deletedCount > 0) {
      res.status(200).send({
        code: 200,
        message: "Cancha eliminada exitosamente",
      });
    } else {
      res.status(404).send("Cancha no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllFields,
  getFieldByID,
  createField,
  updateField,
  deleteField,
};