const fs = require("fs");
const path = require("path");

const refereesPath = path.join(__dirname, "../../db/referees.json");

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

// Obtener todos los árbitros
const getAllReferees = async (req, res) => {
  const referees = await getJSONData(refereesPath);

  try {
    if (referees) {
      res.status(200).send({
        code: 200,
        message: "Referees successfully obtained",
        data: referees,
      });
    } else {
      return res.status(500).send("Error reading referees from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un árbitro por ID
const getRefereeByID = async (req, res) => {
  const referees = await getJSONData(refereesPath);

  try {
    if (referees) {
      const referee = referees.find((r) => r.id === parseInt(req.params.id));
      if (referee) {
        res.status(200).send({
          code: 200,
          message: "Referee successfully obtained",
          data: referee,
        });
      } else {
        res.status(404).send("Referee not found");
      }
    } else {
      return res.status(500).send("Error reading referees from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo árbitro
const createReferee = async (req, res) => {
  try {
    const referees = await getJSONData(refereesPath);
    const newReferee = {
      id: referees.length + 1,
      ...req.body,
    };
    referees.push(newReferee);
    await writeJSONData(refereesPath, referees);
    res.status(200).send({
      code: 200,
      message: "Referee successfully created",
      data: newReferee,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un árbitro por ID
const updateReferee = async (req, res) => {
  try {
    const referees = await getJSONData(refereesPath);
    const refereeIndex = referees.findIndex(
      (r) => r.id === parseInt(req.params.id)
    );
    if (refereeIndex !== -1) {
      referees[refereeIndex] = {
        id: parseInt(req.params.id),
        ...req.body,
      };
      await writeJSONData(refereesPath, referees);
      res.status(200).send({
        code: 200,
        message: "Referee successfully updated",
        data: referees[refereeIndex],
      });
    } else {
      res.status(404).send("Referee not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un árbitro por ID
const deleteReferee = async (req, res) => {
  try {
    const referees = await getJSONData(refereesPath);
    const refereeIndex = referees.findIndex(
      (r) => r.id === parseInt(req.params.id)
    );
    if (refereeIndex !== -1) {
      const deletedReferee = referees.splice(refereeIndex, 1);
      await writeJSONData(refereesPath, referees);
      res.status(200).send({
        code: 200,
        message: "Referee successfully deleted",
        data: deletedReferee,
      });
    } else {
      res.status(404).send("Referee not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllReferees,
  getRefereeByID,
  createReferee,
  updateReferee,
  deleteReferee,
};
