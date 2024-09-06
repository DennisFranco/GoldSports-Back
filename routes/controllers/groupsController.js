const { ObjectId } = require("mongodb");
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
          (t) => t._id.toString() === group.id_tournament.toString()
        );
        return {
          ...group,
          tournament: tournament || null,
        };
      });

      res.status(200).send({
        code: 200,
        message: "Grupos obtenidos exitosamente",
        data: groupsWithTournament,
      });
    } else {
      return res
        .status(500)
        .send("Error al leer los grupos o torneos de la base de datos");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener un grupo por ID
const getGroupByID = async (req, res) => {
  try {
    const db = getDB();
    const group = await db
      .collection("groups")
      .findOne({ _id:  new ObjectId(req.params.id) });
    const tournament = await db
      .collection("tournaments")
      .findOne({ _id:  new ObjectId(group.id_tournament) });

    if (group) {
      res.status(200).send({
        code: 200,
        message: "Grupo obtenido exitosamente",
        data: {
          ...group,
          tournament: tournament || null,
        },
      });
    } else {
      res.status(404).send("Grupo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener grupos por ID de torneo
const getGroupsByTournamentID = async (req, res) => {
  try {
    const db = getDB();
    const tournamentId = new ObjectId(req.params.id);

    const tournament = await db
      .collection("tournaments")
      .findOne({ _id: tournamentId });
    if (!tournament) {
      return res.status(404).send("Torneo no encontrado");
    }

    const groups = await db
      .collection("groups")
      .find({ id_tournament: tournamentId })
      .toArray();

    res.status(200).send({
      code: 200,
      message: "Grupos obtenidos exitosamente",
      data: groups,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear un nuevo grupo
const createGroup = async (req, res) => {
  try {
    const db = getDB();
    const newGroup = {
      ...req.body,
      id_tournament: new ObjectId(req.body.id_tournament),
    };

    const result = await db.collection("groups").insertOne(newGroup);
    res.status(200).send({
      code: 200,
      message: "Grupo creado exitosamente",
      data: result[0],
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear un nuevo registro en teams_groups
const createTeamGroup = async (req, res) => {
  console.log(req.body);
  try {
    const db = getDB();
    const { id_team, id_group } = req.body;

    if (!Array.isArray(id_team) || id_team.length === 0 || !id_group) {
      return res.status(400).send({
        code: 400,
        message:
          "El campo id_team debe ser un array no vacío, y id_group es requerido",
      });
    }

    const group = await db
      .collection("groups")
      .findOne({ _id:  new ObjectId(id_group) });
    if (!group) {
      return res.status(404).send({
        code: 404,
        message: "Grupo no encontrado",
      });
    }

    const newTeamGroups = id_team.map((teamId) => ({
      id_team: new ObjectId(teamId),
      id_group:  new ObjectId(id_group),
    }));

    const newClassifications = id_team.map((teamId) => ({
      id_tournament: group.id_tournament,
      id_group:  new ObjectId(id_group),
      id_team:  new ObjectId(teamId),
      points: 0,
      matches_played: 0,
      matches_won: 0,
      tied_matches: 0,
      lost_matches: 0,
      favor_goals: 0,
      goals_against: 0,
      goal_difference: 0,
    }));

    await db.collection("teams_groups").insertMany(newTeamGroups);
    await db.collection("classifications").insertMany(newClassifications);

    res.status(200).send({
      code: 200,
      message: "Equipos y clasificaciones creados exitosamente",
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar un grupo por ID
const updateGroup = async (req, res) => {
  try {
    const db = getDB();
    const groupId = new ObjectId(req.params.id);
    const updatedGroup = req.body;

    const result = await db
      .collection("groups")
      .updateOne({ _id: groupId }, { $set: updatedGroup });

    if (result.matchedCount > 0) {
      res.status(200).send({
        code: 200,
        message: "Grupo actualizado exitosamente",
        data: updatedGroup,
      });
    } else {
      res.status(404).send("Grupo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar un grupo por ID
const deleteGroup = async (req, res) => {
  try {
    const db = getDB();
    const groupId = new ObjectId(req.params.id);

    const result = await db.collection("groups").deleteOne({ _id: groupId });

    if (result.deletedCount > 0) {
      res.status(200).send({
        code: 200,
        message: "Grupo eliminado exitosamente",
      });
    } else {
      res.status(404).send("Grupo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
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
