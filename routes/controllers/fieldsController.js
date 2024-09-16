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
        .send("Error al obtener las canchas de la base de datos");
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
      .findOne({ id: parseInt(req.params.id) });

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

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("fields")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newField = {
      id: newId, // Puedes usar un enfoque para asegurar IDs únicos.
      ...req.body,
    };

    await db.collection("fields").insertOne(newField);

    res.status(200).send({
      code: 200,
      message: "Cancha creada exitosamente",
      data: newField,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar una cancha por ID
const updateField = async (req, res) => {
  try {
    const db = getDB();
    const updatedField = await db
      .collection("fields")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedField) {
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
    const deletedField = await db
      .collection("fields")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedField) {
      res.status(200).send({
        code: 200,
        message: "Cancha eliminada exitosamente",
        data: deletedField,
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
