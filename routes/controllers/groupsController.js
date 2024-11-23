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
        message: "Grupos obtenidos exitosamente",
        data: groupsWithTournament,
      });
    } else {
      return res
        .status(500)
        .send("Error al obtener los grupos o torneos de la base de datos");
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
      .findOne({ id: parseInt(req.params.id) });
    const tournament = group
      ? await db.collection("tournaments").findOne({ id: group.id_tournament })
      : null;

    if (group) {
      res.status(200).send({
        code: 200,
        message: "Grupo obtenido exitosamente",
        data: {
          ...group,
          tournament: tournament ? tournament : null,
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
    const tournament = await db
      .collection("tournaments")
      .findOne({ id: parseInt(req.params.id) });

    if (!tournament) {
      return res.status(404).send("Torneo no encontrado");
    }

    const tournamentGroups = await db
      .collection("groups")
      .find({ id_tournament: tournament.id })
      .toArray();

    res.status(200).send({
      code: 200,
      message: "Grupos obtenidos exitosamente",
      data: tournamentGroups,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear un nuevo grupo
const createGroup = async (req, res) => {
  try {
    const db = getDB();

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("groups")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newGroup = {
      id: newId, // O utilizar una estrategia de generación de IDs de MongoDB
      ...req.body,
    };

    await db.collection("groups").insertOne(newGroup);

    res.status(200).send({
      code: 200,
      message: "Grupo creado exitosamente",
      data: newGroup,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
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
        message: "id_team debe ser un array no vacío y id_group es requerido",
      });
    }

    // Validar si el grupo existe
    const group = await db.collection("groups").findOne({ id: id_group });
    if (!group) {
      return res.status(404).send({
        code: 404,
        message: "Grupo no encontrado",
      });
    }

    // Obtener el último id de teams_groups
    const lastTeamGroup = await db
      .collection("teams_groups")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    let nextTeamGroupId =
      lastTeamGroup.length > 0 ? lastTeamGroup[0].id + 1 : 1;

    // Obtener el último id de classifications
    const lastClassification = await db
      .collection("classifications")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    let nextClassificationId =
      lastClassification.length > 0 ? lastClassification[0].id + 1 : 1;

    const newTeamGroups = [];
    const newClassifications = [];

    // Crear registros para cada id_team
    id_team.forEach((teamId) => {
      // Crear un nuevo registro en teams_groups
      const newTeamGroup = {
        id: nextTeamGroupId++, // Usar el id generado dinámicamente
        id_team: teamId,
        id_group,
      };
      newTeamGroups.push(newTeamGroup);

      // Crear un nuevo registro en classifications
      const newClassification = {
        id: nextClassificationId++, // Usar el id generado dinámicamente
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
        classified: 0,
      };
      newClassifications.push(newClassification);
    });

    // Insertar los nuevos registros en las colecciones de MongoDB
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
    const updatedGroup = await db
      .collection("groups")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedGroup) {
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
    const deletedGroup = await db
      .collection("groups")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedGroup) {
      res.status(200).send({
        code: 200,
        message: "Grupo eliminado exitosamente",
        data: deletedGroup,
      });
    } else {
      res.status(404).send("Grupo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar un equipo de un grupo y su clasificación asociada
const deleteTeamGroup = async (req, res) => {
  try {
    const db = getDB();
    const { id_team, id_group } = req.body;

    // Validar que los campos necesarios están presentes
    if (!id_team || !id_group) {
      return res.status(400).send({
        code: 400,
        message: "id_team e id_group son requeridos",
      });
    }

    // Verificar si el equipo está en el grupo
    const teamGroup = await db.collection("teams_groups").findOne({
      id_team: id_team,
      id_group: id_group,
    });

    if (!teamGroup) {
      return res.status(404).send({
        code: 404,
        message: "Equipo no encontrado en el grupo",
      });
    }

    // Eliminar el registro de teams_groups
    await db.collection("teams_groups").deleteOne({
      id_team: id_team,
      id_group: id_group,
    });

    // Eliminar el registro asociado de classifications
    await db.collection("classifications").deleteOne({
      id_team: id_team,
      id_group: id_group,
    });

    res.status(200).send({
      code: 200,
      message:
        "Equipo eliminado exitosamente del grupo y clasificación eliminada",
    });
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
  deleteTeamGroup,
  getGroupsByTournamentID,
};
