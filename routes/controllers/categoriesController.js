const { getDB } = require("../../config/db");

// Obtener todas las categorías
const getAllCategories = async (req, res) => {
  try {
    const db = getDB();
    const categories = await db.collection("categories").find().toArray();

    if (categories) {
      res.status(200).send({
        code: 200,
        message: "Categorías obtenidas exitosamente",
        data: categories,
      });
    } else {
      return res
        .status(500)
        .send("Error al obtener las categorías de la base de datos");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener una categoría por ID
const getCategoryByID = async (req, res) => {
  try {
    const db = getDB();
    const category = await db
      .collection("categories")
      .findOne({ id: parseInt(req.params.id) });

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
    const db = getDB();
    const { name, description, special_rules } = req.body;

    // Validar campos requeridos
    if (!name || !description || !special_rules) {
      return res.status(400).send({
        code: 400,
        message:
          "Nombre, descripción y reglas especiales son campos obligatorios",
      });
    }

    // Obtener el último ID y generar uno nuevo
    const lastCategory = await db
      .collection("categories")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastCategory ? lastCategory.id + 1 : 1;

    // Crear nueva categoría
    const newCategory = {
      id: newId,
      name,
      description,
      special_rules,
    };

    // Insertar nueva categoría en la base de datos
    await db.collection("categories").insertOne(newCategory);

    res.status(200).send({
      code: 200,
      message: "Categoría creada exitosamente",
      data: newCategory,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar una categoría por ID
const updateCategory = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updatedCategory = await db
      .collection("categories")
      .findOneAndUpdate(
        { id: parseInt(id) },
        { $set: { ...req.body } },
        { returnOriginal: false }
      );

    if (updatedCategory) {
      res.status(200).send({
        code: 200,
        message: "Categoría actualizada exitosamente",
        data: updatedCategory,
      });
    } else {
      res.status(404).send("Categoría no encontrada");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar una categoría por ID
const deleteCategory = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const deletedCategory = await db
      .collection("categories")
      .findOneAndDelete({ id: parseInt(id) });

    if (deletedCategory) {
      res.status(200).send({
        code: 200,
        message: "Categoría eliminada exitosamente",
        data: deletedCategory,
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
