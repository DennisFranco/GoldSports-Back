const fs = require("fs");
const path = require("path");

const matchSheetPath = path.join(__dirname, "../../db/match_sheet.json");

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

// Obtener todas las hojas de partido
const getAllMatchSheets = async (req, res) => {
  const matchSheets = await getJSONData(matchSheetPath);

  try {
    if (matchSheets) {
      res.status(200).send({
        code: 200,
        message: "Match sheets successfully obtained",
        data: matchSheets,
      });
    } else {
      return res.status(500).send("Error reading match sheets from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener una hoja de partido por ID
const getMatchSheetByID = async (req, res) => {
  const matchSheets = await getJSONData(matchSheetPath);

  try {
    if (matchSheets) {
      const matchSheet = matchSheets.find(
        (ms) => ms.id === parseInt(req.params.id)
      );
      if (matchSheet) {
        res.status(200).send({
          code: 200,
          message: "Match sheet successfully obtained",
          data: matchSheet,
        });
      } else {
        res.status(404).send("Match sheet not found");
      }
    } else {
      return res.status(500).send("Error reading match sheets from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear una nueva hoja de partido
const createMatchSheet = async (req, res) => {
  try {
    const matchSheets = await getJSONData(matchSheetPath);
    const newMatchSheet = {
      id: matchSheets.length + 1,
      ...req.body,
    };
    matchSheets.push(newMatchSheet);
    await writeJSONData(matchSheetPath, matchSheets);
    res.status(200).send({
      code: 200,
      message: "Match sheet successfully created",
      data: newMatchSheet,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar una hoja de partido por ID
const updateMatchSheet = async (req, res) => {
  try {
    const matchSheets = await getJSONData(matchSheetPath);
    const matchSheetIndex = matchSheets.findIndex(
      (ms) => ms.id === parseInt(req.params.id)
    );
    if (matchSheetIndex !== -1) {
      matchSheets[matchSheetIndex] = {
        id: parseInt(req.params.id),
        ...req.body,
      };
      await writeJSONData(matchSheetPath, matchSheets);
      res.status(200).send({
        code: 200,
        message: "Match sheet successfully updated",
        data: matchSheets[matchSheetIndex],
      });
    } else {
      res.status(404).send("Match sheet not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar una hoja de partido por ID
const deleteMatchSheet = async (req, res) => {
  try {
    const matchSheets = await getJSONData(matchSheetPath);
    const matchSheetIndex = matchSheets.findIndex(
      (ms) => ms.id === parseInt(req.params.id)
    );
    if (matchSheetIndex !== -1) {
      const deletedMatchSheet = matchSheets.splice(matchSheetIndex, 1);
      await writeJSONData(matchSheetPath, matchSheets);
      res.status(200).send({
        code: 200,
        message: "Match sheet successfully deleted",
        data: deletedMatchSheet,
      });
    } else {
      res.status(404).send("Match sheet not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllMatchSheets,
  getMatchSheetByID,
  createMatchSheet,
  updateMatchSheet,
  deleteMatchSheet,
};
