const fs = require("fs");
const path = require("path");

const penaltiesPath = path.join(__dirname, "../../db/penalties.json");

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

// Obtener todas las sanciones
const getAllPenalties = async (req, res) => {
  try {
    const penalties = await getJSONData(penaltiesPath);
    if (penalties) {
      res.status(200).send({
        code: 200,
        message: "Penalties successfully obtained",
        data: penalties,
      });
    } else {
      return res.status(500).send("Error reading penalties from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener una sanción por ID
const getPenaltyByID = async (req, res) => {
  try {
    const penalties = await getJSONData(penaltiesPath);
    if (penalties) {
      const penalty = penalties.find((p) => p.id === parseInt(req.params.id));
      if (penalty) {
        res.status(200).send({
          code: 200,
          message: "Penalty successfully obtained",
          data: penalty,
        });
      } else {
        res.status(404).send("Penalty not found");
      }
    } else {
      return res.status(500).send("Error reading penalties from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear una nueva sanción
const createPenalty = async (req, res) => {
  try {
    const penalties = await getJSONData(penaltiesPath);
    const newPenalty = {
      id: penalties.length + 1,
      ...req.body,
    };
    penalties.push(newPenalty);
    await writeJSONData(penaltiesPath, penalties);
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
    const penalties = await getJSONData(penaltiesPath);
    const penaltyIndex = penalties.findIndex(
      (p) => p.id === parseInt(req.params.id)
    );
    if (penaltyIndex !== -1) {
      penalties[penaltyIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(penaltiesPath, penalties);
      res.status(200).send({
        code: 200,
        message: "Penalty successfully updated",
        data: penalties[penaltyIndex],
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
    const penalties = await getJSONData(penaltiesPath);
    const penaltyIndex = penalties.findIndex(
      (p) => p.id === parseInt(req.params.id)
    );
    if (penaltyIndex !== -1) {
      const deletedPenalty = penalties.splice(penaltyIndex, 1);
      await writeJSONData(penaltiesPath, penalties);
      res.status(200).send({
        code: 200,
        message: "Penalty successfully deleted",
        data: deletedPenalty,
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
