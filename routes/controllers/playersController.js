const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

// Obtener todos los jugadores
const getAllPlayers = async (req, res) => {
  try {
    const db = getDB();
    const playersCollection = db.collection("players");
    const teamsCollection = db.collection("teams");
    const positionsCollection = db.collection("positions");

    const players = await playersCollection.find().toArray();
    const teams = await teamsCollection.find().toArray();
    const positions = await positionsCollection.find().toArray();

    const playersWithTeamAndTournament = players.map((player) => {
      const team = teams.find((team) => team._id.equals(player.id_team));
      const position = positions.find((pos) => pos._id.equals(player.position));

      return {
        ...player,
        team_name: team ? team.name : "Unknown Team",
        position_name: position ? position.name : "Unknown Position",
      };
    });

    res.status(200).send({
      code: 200,
      message: "Jugadores obtenidos correctamente",
      data: playersWithTeamAndTournament,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener un jugador por ID
const getPlayerByID = async (req, res) => {
  try {
    const db = getDB();
    const playersCollection = db.collection("players");
    const teamsCollection = db.collection("teams");
    const teamsGroupsCollection = db.collection("teams_groups");
    const groupsCollection = db.collection("groups");
    const tournamentsCollection = db.collection("tournaments");
    const positionsCollection = db.collection("positions");
    const typesDocsCollection = db.collection("types_docs");
    const playerStatsCollection = db.collection("player_stats");

    const player = await playersCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!player) {
      return res.status(404).send("Jugador no encontrado");
    }

    const team = await teamsCollection.findOne({
      _id: new ObjectId(player.id_team),
    });
    const teamGroup = await teamsGroupsCollection.findOne({
      id_team: player.id_team,
    });
    const group = teamGroup
      ? await groupsCollection.findOne({
          _id: new ObjectId(teamGroup.id_group),
        })
      : null;
    const tournament = group
      ? await tournamentsCollection.findOne({
          _id: new ObjectId(group.id_tournament),
        })
      : null;
    const stats = await playerStatsCollection
      .find({ id_player: player._id })
      .toArray();

    const positionName = await positionsCollection.findOne({
      _id: new ObjectId(player.position),
    });
    const typeName = await typesDocsCollection.findOne({
      _id: new ObjectId(player.type_id),
    });

    res.status(200).send({
      code: 200,
      message: "Jugador obtenido correctamente",
      data: {
        ...player,
        position_name: positionName ? positionName.name : "Unknown Position",
        type_name: typeName ? typeName.name : "Unknown Document Type",
        team_name: team ? team.name : "Unknown Team",
        tournament_name: tournament ? tournament.name : "Unknown Tournament",
        tournament_year: tournament ? tournament.year : "Unknown Year",
        stats,
      },
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear un nuevo jugador
const createPlayer = async (req, res) => {
  try {
    const db = getDB();
    const playersCollection = db.collection("players");
    const { number_id } = req.body;

    // Verificar si el jugador ya existe
    const playerExists = await playersCollection.findOne({ number_id });
    if (playerExists) {
      return res.status(400).send({
        code: 400,
        message: "El jugador con este número de identificación ya existe",
      });
    }

    // Crear un nuevo jugador
    const newPlayer = { ...req.body };
    const result = await playersCollection.insertOne(newPlayer);

    res.status(200).send({
      code: 200,
      message: "Jugador creado correctamente",
      data: result.ops[0],
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar un jugador por ID
const updatePlayer = async (req, res) => {
  try {
    const db = getDB();
    const playersCollection = db.collection("players");

    const result = await playersCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body },
      { returnOriginal: false }
    );

    if (!result.value) {
      return res.status(404).send("Jugador no encontrado");
    }

    res.status(200).send({
      code: 200,
      message: "Jugador actualizado correctamente",
      data: result.value,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar un jugador por ID
const deletePlayer = async (req, res) => {
  try {
    const db = getDB();
    const playersCollection = db.collection("players");

    const result = await playersCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        code: 404,
        message: "Jugador no encontrado",
      });
    }

    res.status(200).send({
      code: 200,
      message: "Jugador eliminado correctamente",
    });
  } catch (err) {
    console.error("Error al eliminar jugador:", err);
    res.status(500).send("Error del servidor");
  }
};

// Eliminar todos los jugadores por ID de equipo
const deletePlayersByTeamID = async (req, res) => {
  try {
    const db = getDB();
    const playersCollection = db.collection("players");
    const { id_team } = req.params;

    const result = await playersCollection.deleteMany({
      id_team: new ObjectId(id_team),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        code: 404,
        message: "No se encontraron jugadores para el equipo especificado",
      });
    }

    res.status(200).send({
      code: 200,
      message: "Jugadores eliminados correctamente",
    });
  } catch (err) {
    console.error("Error al eliminar jugadores por ID de equipo:", err);
    res.status(500).send("Error del servidor");
  }
};

// Agregar torneo a un jugador
const addTournamentToPlayer = async (req, res) => {
  try {
    const { playerId, tournamentId } = req.body;
    const db = getDB();
    const playersCollection = db.collection("players");
    const tournamentsCollection = db.collection("tournaments");
    const categoriesCollection = db.collection("categories");

    const player = await playersCollection.findOne({
      _id: new ObjectId(playerId),
    });
    if (!player) {
      return res.status(404).send("Jugador no encontrado");
    }

    const tournament = await tournamentsCollection.findOne({
      _id: new ObjectId(tournamentId),
    });
    if (!tournament) {
      return res.status(404).send("Torneo no encontrado");
    }

    const category = await categoriesCollection.findOne({
      _id: new ObjectId(tournament.id_category),
    });
    if (!category) {
      return res.status(400).send("Categoría no encontrada para el torneo");
    }

    const specialRules = category.special_rules;
    const playerAge =
      new Date().getFullYear() - new Date(player.birth_date).getFullYear();

    // Validaciones
    let isValid = true;
    let message = "El jugador puede ser añadido al torneo";

    if (player.position === 1) {
      if (
        specialRules.goalkeeper_age_range &&
        (playerAge < specialRules.goalkeeper_age_range.minimum_age ||
          playerAge > specialRules.goalkeeper_age_range.maximum_age)
      ) {
        isValid = false;
        message = "El portero no cumple con el rango de edad permitido";
      }
    } else {
      if (specialRules.minimum_age && playerAge < specialRules.minimum_age) {
        const exception = specialRules.exception_age_ranges
          ? specialRules.exception_age_ranges.some(
              (range) =>
                playerAge >= range.minimum_age && playerAge <= range.maximum_age
            )
          : false;

        if (!exception) {
          isValid = false;
          message =
            "El jugador es demasiado joven para esta categoría y no está dentro de los rangos de excepción de edad";
        }
      }

      if (specialRules.maximum_age && playerAge > specialRules.maximum_age) {
        isValid = false;
        message = "El jugador es demasiado mayor para esta categoría";
      }

      if (specialRules.exception_age_ranges && isValid) {
        const playersInTournament = await playersCollection
          .find({ tournaments: new ObjectId(tournamentId) })
          .toArray();

        const exceptionPlayersCount = playersInTournament.filter((p) => {
          const age =
            new Date().getFullYear() - new Date(p.birth_date).getFullYear();
          return specialRules.exception_age_ranges.some(
            (range) => age >= range.minimum_age && age <= range.maximum_age
          );
        }).length;

        if (exceptionPlayersCount >= specialRules.maximum_exceptions) {
          isValid = false;
          message =
            "Se ha alcanzado el número máximo de jugadores con excepción de edad para esta categoría";
        }
      }
    }

    if (!isValid) {
      return res.status(400).send({ code: 400, message });
    }

    if (!player.tournaments.includes(tournamentId)) {
      await playersCollection.updateOne(
        { _id: new ObjectId(playerId) },
        { $push: { tournaments: new ObjectId(tournamentId) } }
      );
    }

    res.status(200).send({
      code: 200,
      message: "Torneo agregado exitosamente al jugador",
    });
  } catch (err) {
    console.error("Error en addTournamentToPlayer:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Eliminar torneo de un jugador
const removeTournamentFromPlayer = async (req, res) => {
  try {
    const { playerId, tournamentId } = req.body;
    const db = getDB();
    const playersCollection = db.collection("players");

    const player = await playersCollection.findOne({
      _id: new ObjectId(playerId),
    });
    if (!player) {
      return res.status(404).send("Jugador no encontrado");
    }

    if (!player.tournaments.includes(tournamentId)) {
      return res
        .status(400)
        .send("El jugador no está registrado en el torneo especificado");
    }

    await playersCollection.updateOne(
      { _id: new ObjectId(playerId) },
      { $pull: { tournaments: new ObjectId(tournamentId) } }
    );

    res.status(200).send({
      code: 200,
      message: "Torneo eliminado exitosamente del jugador",
    });
  } catch (err) {
    console.error("Error en removeTournamentFromPlayer:", err);
    res.status(500).send("Error en el servidor");
  }
};

module.exports = {
  getAllPlayers,
  getPlayerByID,
  createPlayer,
  updatePlayer,
  deletePlayer,
  addTournamentToPlayer,
  removeTournamentFromPlayer,
  deletePlayersByTeamID,
};
