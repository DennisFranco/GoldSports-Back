const fs = require("fs");
const path = require("path");

const teamsPath = path.join(__dirname, "../../db/teams.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");

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

// Obtener todos los equipos
const getAllTeams = async (req, res) => {
  const teams = await getJSONData(teamsPath);

  try {
    if (teams) {
      res.status(200).send({
        code: 200,
        message: "Teams successfully obtained",
        data: teams,
      });
    } else {
      return res.status(500).send("Error reading teams from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un equipo por ID
const getTeamByID = async (req, res) => {
  const teams = await getJSONData(teamsPath);

  try {
    if (teams) {
      const team = teams.find((t) => t.id === parseInt(req.params.id));
      if (team) {
        res.status(200).send({
          code: 200,
          message: "Team successfully obtained",
          data: team,
        });
      } else {
        res.status(404).send("Team not found");
      }
    } else {
      return res.status(500).send("Error reading teams from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo equipo
const createTeam = async (req, res) => {
  try {
    const teams = await getJSONData(teamsPath);
    const newTeam = {
      id: teams.length + 1,
      ...req.body,
    };
    teams.push(newTeam);
    await writeJSONData(teamsPath, teams);
    res.status(200).send({
      code: 200,
      message: "Team successfully created",
      data: newTeam,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un equipo por ID
const updateTeam = async (req, res) => {
  try {
    const teams = await getJSONData(teamsPath);
    const teamIndex = teams.findIndex((t) => t.id === parseInt(req.params.id));
    if (teamIndex !== -1) {
      teams[teamIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(teamsPath, teams);
      res.status(200).send({
        code: 200,
        message: "Team successfully updated",
        data: teams[teamIndex],
      });
    } else {
      res.status(404).send("Team not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un equipo por ID
const deleteTeam = async (req, res) => {
  try {
    const teams = await getJSONData(teamsPath);
    const teamIndex = teams.findIndex((t) => t.id === parseInt(req.params.id));
    if (teamIndex !== -1) {
      const deletedTeam = teams.splice(teamIndex, 1);
      await writeJSONData(teamsPath, teams);
      res.status(200).send({
        code: 200,
        message: "Team successfully deleted",
        data: deletedTeam,
      });
    } else {
      res.status(404).send("Team not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener equipos por torneo
const getTeamsByTournament = async (req, res) => {
  try {
    const { id_tournament } = req.params;

    const teams = await getJSONData(teamsPath);
    const teamsGroups = await getJSONData(teamsGroupsPath);
    const groups = await getJSONData(groupsPath);

    // Filtrar grupos por torneo
    const tournamentGroups = groups.filter(
      (group) => group.id_tournament === parseInt(id_tournament)
    );

    // Obtener ids de los grupos del torneo
    const groupIds = tournamentGroups.map((group) => group.id);

    // Filtrar equipos por grupos del torneo
    const tournamentTeamsGroups = teamsGroups.filter((tg) =>
      groupIds.includes(tg.id_group)
    );

    // Obtener ids de los equipos del torneo
    const teamIds = tournamentTeamsGroups.map((tg) => tg.id_team);

    // Filtrar equipos por ids
    const tournamentTeams = teams
      .filter((team) => teamIds.includes(team.id))
      .map((team) => ({
        id: team.id,
        name: team.name,
      }));

    res.status(200).send({
      code: 200,
      message: "Teams successfully obtained for the tournament",
      data: tournamentTeams,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllTeams,
  getTeamByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByTournament,
};
