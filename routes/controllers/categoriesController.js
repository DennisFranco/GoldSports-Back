const { getDB } = require("../config/db");

// Obtener todas las categorías
const getAllCategories = async (req, res) => {
  try {
    const db = getDB();
    const categories = await db.collection("categories").find().toArray();

    if (categories) {
      res.status(200).send({
        code: 200,
        message: "Categories successfully obtained",
        data: categories,
      });
    } else {
      return res.status(500).send("Error fetching categories from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
        message: "Category successfully obtained",
        data: category,
      });
    } else {
      res.status(404).send("Category not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
        message: "Name, description, and special_rules are required fields",
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
      message: "Category successfully created",
      data: newCategory,
    });
  } catch (err) {
    console.error("Error in createCategory:", err);
    res.status(500).send("Server error");
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

    if (updatedCategory.value) {
      res.status(200).send({
        code: 200,
        message: "Category successfully updated",
        data: updatedCategory.value,
      });
    } else {
      res.status(404).send("Category not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
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

    if (deletedCategory.value) {
      res.status(200).send({
        code: 200,
        message: "Category successfully deleted",
        data: deletedCategory.value,
      });
    } else {
      res.status(404).send("Category not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllCategories,
  getCategoryByID,
  createCategory,
  updateCategory,
  deleteCategory,
};
