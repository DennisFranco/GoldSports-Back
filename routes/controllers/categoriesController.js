const fs = require("fs");
const path = require("path");

const categoriesPath = path.join(__dirname, "../../db/categories.json");

const getJSONData = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};

const writeJSONData = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

// Obtener todas las categorías
const getAllCategories = async (req, res) => {
  try {
    const categories = await getJSONData(categoriesPath);

    if (categories) {
      res.status(200).send({
        code: 200,
        message: "Categories successfully obtained",
        data: categories,
      });
    } else {
      return res.status(500).send("Error reading categories from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener una categoría por ID
const getCategoryByID = async (req, res) => {
  try {
    const categories = await getJSONData(categoriesPath);

    if (categories) {
      const category = categories.find((c) => c.id === parseInt(req.params.id));
      if (category) {
        res.status(200).send({
          code: 200,
          message: "Category successfully obtained",
          data: category,
        });
      } else {
        res.status(404).send("Category not found");
      }
    } else {
      return res.status(500).send("Error reading categories from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear una nueva categoría
const createCategory = async (req, res) => {
  try {
    const categories = await getJSONData(categoriesPath);
    const { name, description, special_rules } = req.body;

    // Validar campos requeridos
    if (!name || !description || !special_rules) {
      return res.status(400).send({
        code: 400,
        message: "Name, description, and special_rules are required fields",
      });
    }

    // Crear nueva categoría
    const newCategory = {
      id: categories.length + 1,
      name,
      description,
      special_rules,
    };

    // Agregar categoría al array
    categories.push(newCategory);

    // Escribir datos actualizados en el archivo
    await writeJSONData(categoriesPath, categories);

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
    const categories = await getJSONData(categoriesPath);
    const categoryIndex = categories.findIndex(
      (c) => c.id === parseInt(req.params.id)
    );
    if (categoryIndex !== -1) {
      categories[categoryIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(categoriesPath, categories);
      res.status(200).send({
        code: 200,
        message: "Category successfully updated",
        data: categories[categoryIndex],
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
    const categories = await getJSONData(categoriesPath);
    const categoryIndex = categories.findIndex(
      (c) => c.id === parseInt(req.params.id)
    );
    if (categoryIndex !== -1) {
      const deletedCategory = categories.splice(categoryIndex, 1);
      await writeJSONData(categoriesPath, categories);
      res.status(200).send({
        code: 200,
        message: "Category successfully deleted",
        data: deletedCategory,
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
