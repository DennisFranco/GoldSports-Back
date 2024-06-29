const fs = require("fs");
const path = require("path");

const fieldsPath = path.join(__dirname, "../../db/fields.json");

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

// Obtener todas las canchas
const getAllFields = async (req, res) => {
  const fields = await getJSONData(fieldsPath);

  try {
    if (fields) {
      res.status(200).send({
        code: 200,
        message: "Fields successfully obtained",
        data: fields,
      });
    } else {
      return res.status(500).send("Error reading users from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener una cancha por ID
const getFieldByID = async (req, res) => {
  const fields = await getJSONData(fieldsPath);

  try {
    if (fields) {
      const field = fields.find((c) => c.id === parseInt(req.params.id));
      if (field) {
        res.status(200).send({
          code: 200,
          message: "Fields successfully obtained",
          data: field,
        });
      } else {
        res.status(404).send("Soccer field not found");
      }
    } else {
      return res.status(500).send("Error reading users from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear una nueva cancha
const createField = async (req, res) => {
  try {
    const fields = await getJSONData(fieldsPath);
    const newField = {
      id: fields.length + 1,
      ...req.body,
    };
    fields.push(newField);
    await writeJSONData(fieldsPath, fields);
    res.status(201).send({
      code: 201,
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
    const fields = await getJSONData(fieldsPath);
    const fieldIndex = fields.findIndex(
      (c) => c.id === parseInt(req.params.id)
    );
    if (fieldIndex !== -1) {
      fields[fieldIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(fieldsPath, fields);
      res.status(200).send({
        code: 200,
        message: "Field successfully updated",
        data: fields[fieldIndex],
      });
    } else {
      res.status(404).send("Soccer field not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar una cancha por ID
const deleteField = async (req, res) => {
  try {
    const fields = await getJSONData(fieldsPath);
    const fieldIndex = fields.findIndex(
      (c) => c.id === parseInt(req.params.id)
    );
    if (fieldIndex !== -1) {
      const deletedField = fields.splice(fieldIndex, 1);
      await writeJSONData(fieldsPath, fields);
      res.status(200).send({
        code: 200,
        message: "Field successfully deleted",
        data: deletedField,
      });
    } else {
      res.status(404).send("Soccer field not found");
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
