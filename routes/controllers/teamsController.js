const { getDB } = require("../../config/db");

const getAllTeams = async (req, res) => {
  try {
    const db = getDB();

    // Definir el filtro según el rol del usuario
    const filter = req.user.role === 1 ? {} : { created_by: req.user.id };

    // Obtener los equipos con el filtro aplicado
    const teams = await db.collection("teams").find(filter).toArray();

    if (teams) {
      res.status(200).send({
        code: 200,
        message: "Equipos obtenidos con éxito",
        data: teams,
      });
    } else {
      return res.status(500).send({
        code: 500,
        message: "Error al obtener los equipos de la base de datos",
      });
    }
  } catch (err) {
    res.status(500).send({
      code: 500,
      message: "Error del servidor",
      error: err.message,
    });
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

    const team = teams.find((t) => t.id === parseInt(req.params.id));
    if (!team) {
      return res.status(404).send("Equipo no encontrado");
    }

    const plantillaPlayers = players
      .filter((p) => p.id_team === team.id)
      .map((player) => {
        const stats =
          playerStats.find(
            (ps) =>
              ps.id_player === player.id &&
              ps.id_tournament === team.id_tournament
          ) || {};
        const position = positions.find((pos) => pos.id === player.position);
        return {
          ...player,
          matches_played: stats.games_played || 0,
          goals: stats.goals || 0,
          yellow_cards: stats.yellow_cards || 0,
          red_cards: stats.red_cards || 0,
          position_name: position ? position.name : "Unknown Position",
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

    const playerIds = new Set(plantillaPlayers.map((player) => player.id));
    const sanciones = penalties
      .filter((p) => playerIds.has(p.id_player))
      .map((penalty) => {
        const player = players.find((p) => p.id === penalty.id_player);
        return {
          ...penalty,
          player_name: player ? player.name : "Unknown Player",
        };
      });

    const partidos = matches
      .filter(
        (match) =>
          match.local_team === team.id || match.visiting_team === team.id
      )
      .reduce((acc, match) => {
        const date = match.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        const localTeamName =
          teams.find((t) => t.id === match.local_team)?.name || "Unknown Team";
        const visitingTeamName =
          teams.find((t) => t.id === match.visiting_team)?.name ||
          "Unknown Team";

        acc[date].push({
          ...match,
          local_team: localTeamName,
          visiting_team: visitingTeamName,
          place:
            places.find((p) => p.id === match.place)?.name || "Unknown Place",
        });
        return acc;
      }, {});

    const formattedClassifications = {};
    const teamGroups = teamsGroups.filter((tg) => tg.id_team === team.id);

    teamGroups.forEach((teamGroup) => {
      const group = groups.find((g) => g.id === teamGroup.id_group);
      const tournament = tournaments.find((t) => t.id === group.id_tournament);
      const category = tournament
        ? categories.find((c) => c.id === tournament.id_category)
        : null;

      const tournamentId = tournament ? tournament.id : "Unknown Tournament";
      const tournamentName = tournament
        ? `${tournament.name} (${tournament.year}, ${
            category ? category.name : "Unknown Category"
          })`
        : "Unknown Tournament";
      const groupId = group ? group.id : "Unknown Group";
      const groupName = group ? group.name : "Unknown Group";

      if (!formattedClassifications[tournamentId]) {
        formattedClassifications[tournamentId] = {
          name: tournamentName,
          groups: {},
        };
      }

      if (!formattedClassifications[tournamentId].groups[groupId]) {
        formattedClassifications[tournamentId].groups[groupId] = {
          name: groupName,
          classifications: [],
        };
      }

      const groupTeams = teamsGroups
        .filter((tg) => tg.id_group === group.id)
        .map((tg) => teams.find((t) => t.id === tg.id_team));

      groupTeams.forEach((groupTeam) => {
        const classification = classifications.find(
          (cls) => cls.id_group === group.id && cls.id_team === groupTeam.id
        );

        formattedClassifications[tournamentId].groups[
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

    for (const tournamentId in formattedClassifications) {
      for (const groupId in formattedClassifications[tournamentId].groups) {
        formattedClassifications[tournamentId].groups[
          groupId
        ].classifications.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_difference !== a.goal_difference)
            return b.goal_difference - a.goal_difference;
          if (b.favor_goals !== a.favor_goals)
            return b.favor_goals - a.favor_goals;
          return a.goals_against - b.goals_against;
        });
      }
    }

    const teamTournaments = teamsGroups
      .filter((tg) => tg.id_team === team.id)
      .map((tg) => {
        const group = groups.find((g) => g.id === tg.id_group);
        const tournament = group
          ? tournaments.find((t) => t.id === group.id_tournament)
          : null;
        const category = tournament
          ? categories.find((c) => c.id === tournament.id_category)
          : null;
        return tournament
          ? {
              id: tournament.id,
              name: tournament.name,
              year: tournament.year,
              category: category ? category.name : "Unknown Category",
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
      message: "Equipo obtenido con éxito",
      data: response,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener jugadores por torneo y equipo
const getPlayersByTournamentAndTeam = async (req, res) => {
  try {
    const { tournamentId, teamId } = req.params;
    const db = getDB();
    const players = await db.collection("players").find().toArray();

    const filteredPlayers = players
      .filter(
        (player) =>
          player.tournaments.includes(parseInt(tournamentId)) &&
          player.id_team === parseInt(teamId)
      )
      .map((player) => ({
        id: player.id,
        name: player.name,
        age:
          new Date().getFullYear() - new Date(player.birth_date).getFullYear(),
      }));

    res.status(200).send({
      code: 200,
      message: "Jugadores obtenidos con éxito",
      data: filteredPlayers,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear un nuevo equipo
const createTeam = async (req, res) => {
  try {
    const db = getDB();

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("teams")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newTeam = {
      id: newId,
      ...req.body,
      created_by: req.user.id,
    };
    await db.collection("teams").insertOne(newTeam);

    res.status(200).send({
      code: 200,
      message: "Equipo creado con éxito",
      data: newTeam,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar un equipo por ID
const updateTeam = async (req, res) => {
  try {
    const db = getDB();
    const updatedTeam = await db
      .collection("teams")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );
    if (updatedTeam) {
      res.status(200).send({
        code: 200,
        message: "Equipo actualizado con éxito",
        data: updatedTeam,
      });
    } else {
      res.status(404).send("Equipo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar un equipo por ID
const deleteTeam = async (req, res) => {
  try {
    const db = getDB();
    const deletedTeam = await db
      .collection("teams")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedTeam) {
      res.status(200).send({
        code: 200,
        message: "Equipo eliminado con éxito",
        data: deletedTeam,
      });
    } else {
      res.status(404).send("Equipo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener equipos por torneo
const getTeamsByTournament = async (req, res) => {
  try {
    const { id_tournament } = req.params;
    const db = getDB();

    const [teams, teamsGroups, groups] = await Promise.all([
      db.collection("teams").find().toArray(),
      db.collection("teams_groups").find().toArray(),
      db.collection("groups").find().toArray(),
    ]);

    const tournamentGroups = groups.filter(
      (group) => group.id_tournament === parseInt(id_tournament)
    );

    const groupIds = tournamentGroups.map((group) => group.id);

    const tournamentTeamsGroups = teamsGroups.filter((tg) =>
      groupIds.includes(tg.id_group)
    );

    const teamIds = tournamentTeamsGroups.map((tg) => tg.id_team);

    const tournamentTeams = teams
      .filter((team) => teamIds.includes(team.id))
      .map((team) => ({
        id: team.id,
        name: team.name,
      }));

    res.status(200).send({
      code: 200,
      message: "Equipos obtenidos con éxito para el torneo",
      data: tournamentTeams,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener equipos sin registro en teams_groups para un torneo específico
const getTeamsWithoutGroup = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const db = getDB();

    const [teams, teamsGroups, groups] = await Promise.all([
      db.collection("teams").find().toArray(),
      db.collection("teams_groups").find().toArray(),
      db.collection("groups").find().toArray(),
    ]);

    const groupsInTournament = new Set(
      groups
        .filter((g) => g.id_tournament === parseInt(tournamentId))
        .map((g) => g.id)
    );

    const teamsInGroups = new Set(
      teamsGroups
        .filter((tg) => groupsInTournament.has(tg.id_group))
        .map((tg) => tg.id_team)
    );

    const teamsWithoutGroup = teams.filter(
      (team) => !teamsInGroups.has(team.id)
    );

    res.status(200).send({
      code: 200,
      message: "Equipos sin grupo obtenidos con éxito",
      data: teamsWithoutGroup,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
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
