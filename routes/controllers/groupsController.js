const fs = require("fs");
const path = require("path");

const groupsPath = path.join(__dirname, "../../db/groups.json");
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");

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

// Obtener todos los grupos con información del torneo
const getAllGroups = async (req, res) => {
  try {
    const [groups, tournaments] = await Promise.all([
      getJSONData(groupsPath),
      getJSONData(tournamentsPath),
    ]);

    if (groups && tournaments) {
      const groupsWithTournament = groups.map((group) => {
        const tournament = tournaments.find(
          (t) => t.id === group.id_tournament
        );
        return {
          ...group,
          tournament: tournament ? tournament : null,
        };
      });

      res.status(200).send({
        code: 200,
        message: "Groups successfully obtained",
        data: groupsWithTournament,
      });
    } else {
      return res
        .status(500)
        .send("Error reading groups or tournaments from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un grupo por ID
const getGroupByID = async (req, res) => {
  try {
    const [groups, tournaments] = await Promise.all([
      getJSONData(groupsPath),
      getJSONData(tournamentsPath),
    ]);

    if (groups && tournaments) {
      const group = groups.find((g) => g.id === parseInt(req.params.id));
      if (group) {
        const tournament = tournaments.find(
          (t) => t.id === group.id_tournament
        );
        res.status(200).send({
          code: 200,
          message: "Group successfully obtained",
          data: {
            ...group,
            tournament: tournament ? tournament : null,
          },
        });
      } else {
        res.status(404).send("Group not found");
      }
    } else {
      return res
        .status(500)
        .send("Error reading groups or tournaments from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo grupo
const createGroup = async (req, res) => {
  try {
    const groups = await getJSONData(groupsPath);
    const newGroup = {
      id: groups.length + 1,
      ...req.body,
    };
    groups.push(newGroup);
    await writeJSONData(groupsPath, groups);
    res.status(200).send({
      code: 200,
      message: "Group successfully created",
      data: newGroup,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un grupo por ID
const updateGroup = async (req, res) => {
  try {
    const groups = await getJSONData(groupsPath);
    const groupIndex = groups.findIndex(
      (g) => g.id === parseInt(req.params.id)
    );
    if (groupIndex !== -1) {
      groups[groupIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(groupsPath, groups);
      res.status(200).send({
        code: 200,
        message: "Group successfully updated",
        data: groups[groupIndex],
      });
    } else {
      res.status(404).send("Group not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un grupo por ID
const deleteGroup = async (req, res) => {
  try {
    const groups = await getJSONData(groupsPath);
    const groupIndex = groups.findIndex(
      (g) => g.id === parseInt(req.params.id)
    );
    if (groupIndex !== -1) {
      const deletedGroup = groups.splice(groupIndex, 1);
      await writeJSONData(groupsPath, groups);
      res.status(200).send({
        code: 200,
        message: "Group successfully deleted",
        data: deletedGroup,
      });
    } else {
      res.status(404).send("Group not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllGroups,
  getGroupByID,
  createGroup,
  updateGroup,
  deleteGroup,
};
