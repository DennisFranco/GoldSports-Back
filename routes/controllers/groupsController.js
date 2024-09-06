const { getDB } = require("../../config/db");

// Obtener todos los grupos con información del torneo
const getAllGroups = async (req, res) => {
  try {
    const db = getDB();
    const groups = await db.collection("groups").find().toArray();
    const tournaments = await db.collection("tournaments").find().toArray();

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
        .send("Error fetching groups or tournaments from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un grupo por ID
const getGroupByID = async (req, res) => {
  try {
    const db = getDB();
    const group = await db
      .collection("groups")
      .findOne({ id: parseInt(req.params.id) });
    const tournament = group
      ? await db.collection("tournaments").findOne({ id: group.id_tournament })
      : null;

    if (group) {
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
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener grupos por ID de torneo
const getGroupsByTournamentID = async (req, res) => {
  try {
    const db = getDB();
    const tournament = await db
      .collection("tournaments")
      .findOne({ id: parseInt(req.params.id) });

    if (!tournament) {
      return res.status(404).send("Tournament not found");
    }

    const tournamentGroups = await db
      .collection("groups")
      .find({ id_tournament: tournament.id })
      .toArray();

    res.status(200).send({
      code: 200,
      message: "Groups successfully obtained",
      data: tournamentGroups,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo grupo
const createGroup = async (req, res) => {
  try {
    const db = getDB();
    const groups = await db.collection("groups").find().toArray();

    const newGroup = {
      id: groups.length + 1, // O utilizar una estrategia de generación de IDs de MongoDB
      ...req.body,
    };

    await db.collection("groups").insertOne(newGroup);

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
    const db = getDB();
    const { id_team, id_group } = req.body;

    // Validar que los campos necesarios están presentes
    if (!Array.isArray(id_team) || id_team.length === 0 || !id_group) {
      return res.status(400).send({
        code: 400,
        message: "id_team must be a non-empty array and id_group is required",
      });
    }

    const group = await db.collection("groups").findOne({ id: id_group });
    if (!group) {
      return res.status(404).send({
        code: 404,
        message: "Group not found",
      });
    }

    const newTeamGroups = [];
    const newClassifications = [];

    id_team.forEach((teamId) => {
      // Crear un nuevo registro en teams_groups
      const newTeamGroup = {
        id: newTeamGroups.length + 1,
        id_team: teamId,
        id_group,
      };
      newTeamGroups.push(newTeamGroup);

      // Crear un nuevo registro en classifications
      const newClassification = {
        id: newClassifications.length + 1,
        id_tournament: group.id_tournament,
        id_group,
        id_team: teamId,
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

    // Insertar los nuevos registros en las colecciones de MongoDB
    await db.collection("teams_groups").insertMany(newTeamGroups);
    await db.collection("classifications").insertMany(newClassifications);

    res.status(200).send({
      code: 200,
      message: "Team groups and classifications successfully created",
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un grupo por ID
const updateGroup = async (req, res) => {
  try {
    const db = getDB();
    const updatedGroup = await db
      .collection("groups")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedGroup.value) {
      res.status(200).send({
        code: 200,
        message: "Group successfully updated",
        data: updatedGroup.value,
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
    const db = getDB();
    const deletedGroup = await db
      .collection("groups")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedGroup.value) {
      res.status(200).send({
        code: 200,
        message: "Group successfully deleted",
        data: deletedGroup.value,
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
