const { getDB } = require("../../config/db");

// Obtener todas las canchas
const getAllFields = async (req, res) => {
  try {
    const db = getDB();
    const fields = await db.collection("fields").find().toArray();

    if (fields) {
      res.status(200).send({
        code: 200,
        message: "Fields successfully obtained",
        data: fields,
      });
    } else {
      return res.status(500).send("Error fetching fields from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
        message: "Field successfully obtained",
        data: field,
      });
    } else {
      res.status(404).send("Field not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear una nueva cancha
const createField = async (req, res) => {
  try {
    const db = getDB();
    const fields = await db.collection("fields").find().toArray();

    const newField = {
      id: fields.length + 1, // Puedes usar un enfoque para asegurar IDs únicos.
      ...req.body,
    };

    await db.collection("fields").insertOne(newField);

    res.status(200).send({
      code: 200,
      message: "Field successfully created",
      data: newField,
    });
  } catch (err) {
    res.status(500).send("Server error");
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
        message: "Field successfully updated",
        data: updatedField,
      });
    } else {
      res.status(404).send("Field not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
        message: "Field successfully deleted",
        data: deletedField,
      });
    } else {
      res.status(404).send("Field not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllFields,
  getFieldByID,
  createField,
  updateField,
  deleteField,
};
