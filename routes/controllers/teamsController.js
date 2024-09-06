const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

// Obtener todos los equipos
const getAllTeams = async (req, res) => {
  try {
    const db = getDB();
    const teams = await db.collection("teams").find().toArray();

    if (teams.length) {
      res.status(200).send({
        code: 200,
        message: "Equipos obtenidos exitosamente",
        data: teams,
      });
    } else {
      res.status(500).send("Error al leer equipos");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Obtener un equipo por ID con información completa
const getTeamByID = async (req, res) => {
  try {
    const db = getDB();
    const [
      teams,
      players,
      matches,
      classifications,
      penalties,
      places,
      groups,
      playerStats,
      tournaments,
      teamsGroups,
      categories,
      positions,
    ] = await Promise.all([
      db.collection("teams").find().toArray(),
      db.collection("players").find().toArray(),
      db.collection("matches").find().toArray(),
      db.collection("classifications").find().toArray(),
      db.collection("penalties").find().toArray(),
      db.collection("fields").find().toArray(),
      db.collection("groups").find().toArray(),
      db.collection("player_stats").find().toArray(),
      db.collection("tournaments").find().toArray(),
      db.collection("teams_groups").find().toArray(),
      db.collection("categories").find().toArray(),
      db.collection("positions").find().toArray(),
    ]);

    const team = teams.find((t) => t._id.toString() === req.params.id);
    if (!team) {
      return res.status(404).send("Equipo no encontrado");
    }

    const plantillaPlayers = players
      .filter((p) => p.id_team.toString() === team._id.toString())
      .map((player) => {
        const stats =
          playerStats.find(
            (ps) =>
              ps.id_player.toString() === player._id.toString() &&
              ps.id_tournament.toString() === team.id_tournament.toString()
          ) || {};
        const position = positions.find(
          (pos) => pos._id.toString() === player.position.toString()
        );
        return {
          ...player,
          matches_played: stats.games_played || 0,
          goals: stats.goals || 0,
          yellow_cards: stats.yellow_cards || 0,
          red_cards: stats.red_cards || 0,
          position_name: position ? position.name : "Posición desconocida",
        };
      });

    const plantilla = {
      name: team.name,
      yearFoundation: team.yearFoundation,
      manager_name: team.manager_name,
      manager_phone: team.manager_phone,
      logo: team.logo,
      players: plantillaPlayers,
    };

    // Obtener sanciones
    const playerIds = new Set(
      plantillaPlayers.map((player) => player._id.toString())
    );
    const sanciones = penalties
      .filter((p) => playerIds.has(p.id_player.toString()))
      .map((penalty) => {
        const player = players.find(
          (p) => p._id.toString() === penalty.id_player.toString()
        );
        return {
          ...penalty,
          player_name: player ? player.name : "Jugador desconocido",
        };
      });

    // Obtener partidos
    const partidos = matches
      .filter(
        (match) =>
          match.local_team.toString() === team._id.toString() ||
          match.visiting_team.toString() === team._id.toString()
      )
      .reduce((acc, match) => {
        const date = match.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        const localTeamName =
          teams.find((t) => t._id.toString() === match.local_team.toString())
            ?.name || "Equipo desconocido";
        const visitingTeamName =
          teams.find((t) => t._id.toString() === match.visiting_team.toString())
            ?.name || "Equipo desconocido";
        const placeName =
          places.find((p) => p._id.toString() === match.place?.toString())
            ?.name || "Lugar desconocido";

        acc[date].push({
          ...match,
          local_team: localTeamName,
          visiting_team: visitingTeamName,
          place: placeName,
        });
        return acc;
      }, {});

    // Obtener clasificación
    const formattedClassifications = {};
    const teamGroups = teamsGroups.filter(
      (tg) => tg.id_team.toString() === team._id.toString()
    );

    teamGroups.forEach((teamGroup) => {
      const group = groups.find(
        (g) => g._id.toString() === teamGroup.id_group.toString()
      );
      const tournament = tournaments.find(
        (t) => t._id.toString() === group.id_tournament.toString()
      );
      const category = categories.find(
        (c) => c._id.toString() === tournament.id_category.toString()
      );

      const tournamentName = `${tournament.name} (${tournament.year}, ${
        category?.name || "Categoría desconocida"
      })`;
      const groupId = group._id.toString();

      if (!formattedClassifications[tournament._id]) {
        formattedClassifications[tournament._id] = {
          name: tournamentName,
          groups: {},
        };
      }

      if (!formattedClassifications[tournament._id].groups[groupId]) {
        formattedClassifications[tournament._id].groups[groupId] = {
          name: group.name,
          classifications: [],
        };
      }

      const groupTeams = teamsGroups
        .filter((tg) => tg.id_group.toString() === group._id.toString())
        .map((tg) =>
          teams.find((t) => t._id.toString() === tg.id_team.toString())
        );

      groupTeams.forEach((groupTeam) => {
        const classification = classifications.find(
          (cls) =>
            cls.id_group.toString() === group._id.toString() &&
            cls.id_team.toString() === groupTeam._id.toString()
        );

        formattedClassifications[tournament._id].groups[
          groupId
        ].classifications.push({
          team: groupTeam.name,
          points: classification ? classification.points : 0,
          matches_played: classification ? classification.matches_played : 0,
          matches_won: classification ? classification.matches_won : 0,
          tied_matches: classification ? classification.tied_matches : 0,
          lost_matches: classification ? classification.lost_matches : 0,
          favor_goals: classification ? classification.favor_goals : 0,
          goals_against: classification ? classification.goals_against : 0,
          goal_difference: classification ? classification.goal_difference : 0,
        });
      });
    });

    // Obtener torneos
    const teamTournaments = teamsGroups
      .filter((tg) => tg.id_team.toString() === team._id.toString())
      .map((tg) => {
        const group = groups.find(
          (g) => g._id.toString() === tg.id_group.toString()
        );
        const tournament = tournaments.find(
          (t) => t._id.toString() === group.id_tournament.toString()
        );
        const category = categories.find(
          (c) => c._id.toString() === tournament.id_category.toString()
        );

        return tournament
          ? {
              id: tournament._id,
              name: tournament.name,
              year: tournament.year,
              category: category?.name || "Categoría desconocida",
            }
          : null;
      })
      .filter((tournament) => tournament !== null);

    const response = {
      PLANTILLA: plantilla,
      SANCIONES: sanciones,
      PARTIDOS: partidos,
      CLASIFICACIÓN: formattedClassifications,
      TORNEOS: teamTournaments,
    };

    res.status(200).send({
      code: 200,
      message: "Equipo obtenido exitosamente",
      data: response,
    });
  } catch (err) {
    console.error("Error en getTeamByID:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Obtener jugadores por torneo y equipo
const getPlayersByTournamentAndTeam = async (req, res) => {
  try {
    const db = getDB();
    const { tournamentId, teamId } = req.params;

    const players = await db
      .collection("players")
      .find({
        tournaments: new ObjectId(tournamentId),
        id_team: new ObjectId(teamId),
      })
      .toArray();

    const filteredPlayers = players.map((player) => ({
      id: player._id,
      name: player.name,
      age: new Date().getFullYear() - new Date(player.birth_date).getFullYear(),
    }));

    res.status(200).send({
      code: 200,
      message: "Jugadores obtenidos exitosamente",
      data: filteredPlayers,
    });
  } catch (err) {
    console.error("Error en getPlayersByTournamentAndTeam:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Crear un nuevo equipo
const createTeam = async (req, res) => {
  try {
    const db = getDB();
    const newTeam = {
      ...req.body,
    };

    const result = await db.collection("teams").insertOne(newTeam);

    res.status(200).send({
      code: 200,
      message: "Equipo creado exitosamente",
      data: result.ops[0],
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Actualizar un equipo por ID
const updateTeam = async (req, res) => {
  try {
    const db = getDB();
    const teamId = req.params.id;

    const updatedTeam = await db
      .collection("teams")
      .findOneAndUpdate(
        { _id: new ObjectId(teamId) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedTeam.value) {
      res.status(200).send({
        code: 200,
        message: "Equipo actualizado exitosamente",
        data: updatedTeam.value,
      });
    } else {
      res.status(404).send("Equipo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Eliminar un equipo por ID
const deleteTeam = async (req, res) => {
  try {
    const db = getDB();
    const teamId = req.params.id;

    const deletedTeam = await db.collection("teams").findOneAndDelete({
      _id: new ObjectId(teamId),
    });

    if (deletedTeam.value) {
      res.status(200).send({
        code: 200,
        message: "Equipo eliminado exitosamente",
        data: deletedTeam.value,
      });
    } else {
      res.status(404).send("Equipo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Obtener equipos por torneo
const getTeamsByTournament = async (req, res) => {
  try {
    const db = getDB();
    const { id_tournament } = req.params;

    // Obtener los grupos del torneo
    const groups = await db
      .collection("groups")
      .find({ id_tournament: new ObjectId(id_tournament) })
      .toArray();

    const groupIds = groups.map((group) => group._id);

    // Obtener equipos asociados a los grupos del torneo
    const teamsGroups = await db
      .collection("teams_groups")
      .find({ id_group: { $in: groupIds } })
      .toArray();

    const teamIds = teamsGroups.map((tg) => tg.id_team);

    // Obtener los detalles de los equipos
    const teams = await db
      .collection("teams")
      .find({ _id: { $in: teamIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const tournamentTeams = teams.map((team) => ({
      id: team._id,
      name: team.name,
    }));

    res.status(200).send({
      code: 200,
      message: "Equipos obtenidos exitosamente para el torneo",
      data: tournamentTeams,
    });
  } catch (err) {
    console.error("Error en getTeamsByTournament:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Obtener equipos sin registro en teams_groups para un torneo específico
const getTeamsWithoutGroup = async (req, res) => {
  try {
    const db = getDB();
    const { tournamentId } = req.params;

    // Obtener grupos en el torneo específico
    const groups = await db
      .collection("groups")
      .find({ id_tournament: new ObjectId(tournamentId) })
      .toArray();

    const groupIds = groups.map((g) => g._id);

    // Obtener equipos ya asociados a esos grupos
    const teamsInGroups = await db
      .collection("teams_groups")
      .find({ id_group: { $in: groupIds } })
      .toArray();

    const teamIdsInGroups = teamsInGroups.map((tg) => new ObjectId(tg.id_team));

    // Obtener equipos que no están en esos grupos
    const teamsWithoutGroup = await db
      .collection("teams")
      .find({ _id: { $nin: teamIdsInGroups } })
      .toArray();

    res.status(200).send({
      code: 200,
      message: "Equipos sin grupo obtenidos exitosamente",
      data: teamsWithoutGroup,
    });
  } catch (err) {
    console.error("Error en getTeamsWithoutGroup:", err);
    res.status(500).send("Error en el servidor");
  }
};

module.exports = {
  getAllTeams,
  getTeamByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByTournament,
  getTeamsWithoutGroup,
  getPlayersByTournamentAndTeam,
};
