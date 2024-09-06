const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

// Obtener todas las categorías
const getAllCategories = async (req, res) => {
  try {
    const db = getDB();
    const categories = await db.collection("categories").find().toArray();

    res.status(200).send({
      code: 200,
      message: "Categorías obtenidas exitosamente",
      data: categories,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener una categoría por _id
const getCategoryByID = async (req, res) => {
  try {
    const db = getDB();
    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (category) {
      res.status(200).send({
        code: 200,
        message: "Categoría obtenida exitosamente",
        data: category,
      });
    } else {
      res.status(404).send("Categoría no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear una nueva categoría
const createCategory = async (req, res) => {
  try {
    const { name, description, special_rules } = req.body;

    // Validar campos requeridos
    if (!name || !description || !special_rules) {
      return res.status(400).send({
        code: 400,
        message:
          "Los campos 'nombre', 'descripción' y 'reglas especiales' son obligatorios",
      });
    }

    const db = getDB();

    const newCategory = {
      name,
      description,
      special_rules,
    };

    const result = await db.collection("categories").insertOne(newCategory);

    res.status(200).send({
      code: 200,
      message: "Categoría creada exitosamente",
      data: { _id: result.insertedId, ...newCategory },
    });
  } catch (err) {
    console.error("Error al crear categoría:", err);
    res.status(500).send("Error del servidor");
  }
};

// Actualizar una categoría por _id
const updateCategory = async (req, res) => {
  try {
    const db = getDB();
    const updatedCategory = await db
      .collection("categories")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedCategory.value) {
      res.status(200).send({
        code: 200,
        message: "Categoría actualizada exitosamente",
        data: updatedCategory.value,
      });
    } else {
      res.status(404).send("Categoría no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar una categoría por _id
const deleteCategory = async (req, res) => {
  try {
    const db = getDB();
    const result = await db
      .collection("categories")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount > 0) {
      res.status(200).send({
        code: 200,
        message: "Categoría eliminada exitosamente",
      });
    } else {
      res.status(404).send("Categoría no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllCategories,
  getCategoryByID,
  createCategory,
  updateCategory,
  deleteCategory,
};
