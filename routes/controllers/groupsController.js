const fs = require("fs");
const path = require("path");

const groupsPath = path.join(__dirname, "../../db/groups.json");
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");
const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);

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

// Obtener grupos por ID de torneo
const getGroupsByTournamentID = async (req, res) => {
  try {
    const [groups, tournaments] = await Promise.all([
      getJSONData(groupsPath),
      getJSONData(tournamentsPath),
    ]);

    const tournament = tournaments.find(
      (t) => t.id === parseInt(req.params.id)
    );
    if (!tournament) {
      return res.status(404).send("Tournament not found");
    }

    const tournamentGroups = groups.filter(
      (group) => group.id_tournament === tournament.id
    );

    res.status(200).send({
      code: 200,
      message: "Groups successfully obtained",
      data: tournamentGroups,
    });
  } catch (err) {
    console.error("Error in getGroupsByTournamentID:", err);
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

// Crear un nuevo registro en teams_groups
const createTeamGroup = async (req, res) => {
  try {
    const [teamsGroups, classifications, groups] = await Promise.all([
      getJSONData(teamsGroupsPath),
      getJSONData(classificationsPath),
      getJSONData(groupsPath),
    ]);

    const { id_team, id_group } = req.body;

    console.error(req.body);
    // Validar que los campos necesarios están presentes
    if (!Array.isArray(id_team) || id_team.length === 0 || !id_group) {
      return res.status(400).send({
        code: 400,
        message: "id_team must be a non-empty array and id_group is required",
      });
    }

    const group = groups.find((g) => g.id === id_group);
    if (!group) {
      return res.status(404).send({
        code: 404,
        message: "Group not found",
      });
    }

    const newTeamGroups = [];
    const newClassifications = [];

    id_team.forEach((id_team) => {
      // Crear un nuevo registro en teams_groups
      const newTeamGroup = {
        id: teamsGroups.length + 1 + newTeamGroups.length,
        id_team,
        id_group,
      };
      newTeamGroups.push(newTeamGroup);

      // Crear un nuevo registro en classifications
      const newClassification = {
        id: classifications.length + 1 + newClassifications.length,
        id_tournament: group.id_tournament,
        id_group,
        id_team,
        points: 0,
        matches_played: 0,
        matches_won: 0,
        tied_matches: 0,
        lost_matches: 0,
        favor_goals: 0,
        goals_against: 0,
        goal_difference: 0,
      };
      newClassifications.push(newClassification);
    });

    // Añadir los nuevos registros al array existente
    teamsGroups.push(...newTeamGroups);
    classifications.push(...newClassifications);

    // Escribir los datos actualizados en los archivos
    await Promise.all([
      writeJSONData(teamsGroupsPath, teamsGroups),
      writeJSONData(classificationsPath, classifications),
    ]);

    // Responder con los nuevos registros creados
    res.status(200).send({
      code: 200,
      message: "Team groups and classifications successfully created",
    });
  } catch (err) {
    console.error("Error in createTeamGroup:", err);
    res.status(500).send("Server error");
  }
};

module.exports = {
  createTeamGroup,
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
  createTeamGroup,
  updateGroup,
  deleteGroup,
  getGroupsByTournamentID,
};
