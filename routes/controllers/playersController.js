const { getDB } = require("../../config/db");

// Obtener todos los jugadores
const getAllPlayers = async (req, res) => {
  try {
    const db = getDB();
    const [players, teams, positions] = await Promise.all([
      db.collection("players").find().toArray(),
      db.collection("teams").find().toArray(),
      db.collection("positions").find().toArray(),
    ]);

    if (players) {
      const playersWithTeamAndPosition = players.map((player) => {
        const team = teams.find((team) => team.id === player.id_team);
        const position = positions.find((pos) => pos.id === player.position);

        return {
          ...player,
          team_name: team ? team.name : "Equipo Desconocido",
          position_name: position ? position.name : "Posición Desconocida",
        };
      });

      res.status(200).send({
        code: 200,
        message: "Jugadores obtenidos con éxito",
        data: playersWithTeamAndPosition,
      });
    } else {
      return res
        .status(500)
        .send("Error al obtener los jugadores de la base de datos");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Obtener un jugador por ID
const getPlayerByID = async (req, res) => {
  try {
    const db = getDB();
    const [
      players,
      teams,
      teamsGroups,
      groups,
      tournaments,
      positions,
      typesDocs,
      playerStats,
    ] = await Promise.all([
      db.collection("players").find().toArray(),
      db.collection("teams").find().toArray(),
      db.collection("teams_groups").find().toArray(),
      db.collection("groups").find().toArray(),
      db.collection("tournaments").find().toArray(),
      db.collection("positions").find().toArray(),
      db.collection("types_docs").find().toArray(),
      db.collection("player_stats").find().toArray(),
    ]);

    const player = players.find((p) => p.id === parseInt(req.params.id));
    if (player) {
      const team = teams.find((team) => team.id === player.id_team);
      const teamGroup = teamsGroups.find((tg) => tg.id_team === player.id_team);
      const group = teamGroup
        ? groups.find((g) => g.id === teamGroup.id_group)
        : null;
      const tournament = group
        ? tournaments.find((t) => t.id === group.id_tournament)
        : null;
      const stats = playerStats.filter((stat) => stat.id_player === player.id);

      const positionName =
        positions.find((pos) => pos.id === player.position)?.name ||
        "Posición Desconocida";
      const typeName =
        typesDocs.find((type) => type.id === player.type_id)?.name ||
        "Tipo de Documento Desconocido";

      res.status(200).send({
        code: 200,
        message: "Jugador obtenido con éxito",
        data: {
          ...player,
          position_name: positionName,
          type_name: typeName,
          team_name: team ? team.name : "Equipo Desconocido",
          tournament_name: tournament ? tournament.name : "Torneo Desconocido",
          tournament_year: tournament ? tournament.year : "Año Desconocido",
          stats,
        },
      });
    } else {
      res.status(404).send("Jugador no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

const addTournamentToPlayer = async (req, res) => {
  try {
    const db = getDB();
    const { playerId: playerIds, tournamentId, teamId } = req.body;

    // Mostrar los datos recibidos
    console.log("Datos recibidos:", { playerIds, tournamentId, teamId });

    // Validación inicial: verificar cuántos jugadores ya están inscritos en el torneo para este equipo
    const playersInTeam = await db
      .collection("players")
      .find({
        id_team: parseInt(teamId),
        tournaments: { $in: [parseInt(tournamentId)] },
      })
      .toArray();

    // Mostrar los jugadores ya inscritos en el equipo para el torneo
    console.log("Jugadores en el equipo inscritos en el torneo:", playersInTeam);

    const totalPlayersToEnroll = playersInTeam.length + playerIds.length;

    // Mostrar la cantidad total de jugadores que se intenta inscribir
    console.log("Total de jugadores a inscribir:", totalPlayersToEnroll);

    if (totalPlayersToEnroll > 25) {
      console.log("Supera el límite de 25 jugadores");
      return res.status(400).send({
        code: 400,
        message: `El equipo ya tiene ${playersInTeam.length} jugadores inscritos. No se pueden inscribir más de 25 jugadores en el torneo.`,
      });
    }

    const [players, categories, tournaments] = await Promise.all([
      db
        .collection("players")
        .find({ id: { $in: playerIds.map((id) => parseInt(id)) } })
        .toArray(),
      db.collection("categories").find().toArray(),
      db.collection("tournaments").find().toArray(),
    ]);

    // Mostrar jugadores, categorías y torneos obtenidos
    console.log("Jugadores encontrados:", players);
    console.log("Categorías encontradas:", categories);
    console.log("Torneos encontrados:", tournaments);

    const tournament = tournaments.find((t) => t.id === parseInt(tournamentId));
    if (!tournament) {
      console.log("Torneo no encontrado");
      return res.status(404).send("Torneo no encontrado");
    }

    const category = categories.find(
      (cat) => cat.id === tournament.id_category
    );
    if (!category) {
      console.log("Categoría no encontrada para el torneo");
      return res.status(400).send("Categoría no encontrada para el torneo");
    }

    const specialRules = category.special_rules;
    console.log("Reglas especiales:", specialRules);

    let jugadoresNoAgregados = [];

    for (const playerId of playerIds) {
      const player = players.find((p) => p.id === parseInt(playerId));
      
      // Mostrar jugador actual
      console.log(`Procesando jugador con ID ${playerId}:`, player);

      if (!player) {
        jugadoresNoAgregados.push(`Jugador con ID ${playerId} no encontrado`);
        continue;
      }

      const playerAge =
        new Date().getFullYear() - new Date(player.birth_date).getFullYear();
      let isValid = true;
      let message = "El jugador puede ser agregado al torneo";

      // Validación de reglas especiales
      if (player.position === 1) {
        if (
          specialRules.goalkeeper_age_range &&
          (playerAge < specialRules.goalkeeper_age_range.minimum_age ||
            playerAge > specialRules.goalkeeper_age_range.maximum_age)
        ) {
          isValid = false;
          message = `El portero ${player.name} no está dentro del rango de edad permitido`;
        }
      } else {
        if (specialRules.minimum_age && playerAge < specialRules.minimum_age) {
          let exception = false;
          if (specialRules.exception_age_ranges) {
            if (Array.isArray(specialRules.exception_age_ranges)) {
              exception = specialRules.exception_age_ranges.some((range) => {
                return (
                  playerAge >= range.minimum_age &&
                  playerAge <= range.maximum_age
                );
              });
            } else {
              const range = specialRules.exception_age_ranges;
              exception =
                playerAge >= range.minimum_age &&
                playerAge <= range.maximum_age;
            }
          }

          if (!exception) {
            isValid = false;
            message = `El jugador ${player.name} es demasiado joven para esta categoría`;
          }
        }

        if (specialRules.maximum_age && playerAge > specialRules.maximum_age) {
          isValid = false;
          message = `El jugador ${player.name} es demasiado mayor para esta categoría`;
        }

        if (specialRules.exception_age_ranges && isValid) {
          let isInExceptionRange = false;

          if (Array.isArray(specialRules.exception_age_ranges)) {
            isInExceptionRange = specialRules.exception_age_ranges.some(
              (range) => {
                return (
                  playerAge >= range.minimum_age &&
                  playerAge <= range.maximum_age
                );
              }
            );
          } else {
            const range = specialRules.exception_age_ranges;
            isInExceptionRange =
              playerAge >= range.minimum_age && playerAge <= range.maximum_age;
          }

          if (isInExceptionRange) {
            const playersInTournament = players.filter((p) =>
              p.tournaments.includes(parseInt(tournamentId))
            );

            const exceptionPlayersCount = playersInTournament.filter((p) => {
              const age =
                new Date().getFullYear() - new Date(p.birth_date).getFullYear();
              if (Array.isArray(specialRules.exception_age_ranges)) {
                return specialRules.exception_age_ranges.some((range) => {
                  return age >= range.minimum_age && age <= range.maximum_age;
                });
              } else {
                const range = specialRules.exception_age_ranges;
                return (
                  age >= range.minimum_age && age <= range.maximum_age
                );
              }
            }).length;

            if (exceptionPlayersCount >= specialRules.maximum_exceptions) {
              isValid = false;
              message = `El número máximo de jugadores excepcionales para la categoría ha sido alcanzado`;
            }
          }
        }
      }

      // Mostrar si el jugador es válido o no para el torneo
      console.log(`Jugador ${player.name} válido para torneo:`, isValid);

      if (!isValid) {
        jugadoresNoAgregados.push(message);
        continue;
      }

      if (!Array.isArray(player.tournaments)) {
        player.tournaments = [];
      }

      if (!player.tournaments.includes(parseInt(tournamentId))) {
        player.tournaments.push(parseInt(tournamentId));

        const playerStatsExists = await db.collection("player_stats").findOne({
          id_player: parseInt(playerId),
          id_tournament: parseInt(tournamentId),
        });

        if (!playerStatsExists) {
          const lastPlayerStat = await db
            .collection("player_stats")
            .find()
            .sort({ id: -1 })
            .limit(1)
            .toArray();

          const newPlayerStat = {
            id: lastPlayerStat.length > 0 ? lastPlayerStat[0].id + 1 : 1,
            id_player: parseInt(playerId),
            id_tournament: parseInt(tournamentId),
            games_played: 0,
            goals: 0,
            yellow_cards: 0,
            red_cards: 0,
          };

          await db.collection("player_stats").insertOne(newPlayerStat);
          console.log(`Estadísticas creadas para el jugador ${player.name}`);
        }

        await db
          .collection("players")
          .updateOne(
            { id: parseInt(playerId) },
            { $set: { tournaments: player.tournaments } }
          );
        console.log(`Jugador ${player.name} agregado al torneo`);
      } else {
        jugadoresNoAgregados.push(
          `El jugador ${player.name} ya está inscrito en el torneo`
        );
      }

      playersInTeam.push(player);
    }

    // Mostrar si hubo jugadores que no pudieron ser agregados
    console.log("Jugadores no agregados:", jugadoresNoAgregados);

    if (jugadoresNoAgregados.length > 0) {
      return res.status(200).send({
        code: 400,
        message: `Algunos jugadores no pudieron ser inscritos`,
        detalles: jugadoresNoAgregados,
      });
    }

    res.status(200).send({
      code: 200,
      message: "Todos los jugadores fueron inscritos correctamente",
    });
  } catch (err) {
    console.error("Error en el servidor:", err);
    res.status(500).send("Error del servidor");
  }
};

// Eliminar un torneo de un jugador
const removeTournamentFromPlayer = async (req, res) => {
  try {
    const db = getDB();
    const { playerId, tournamentId } = req.body;

    const players = await db.collection("players").find().toArray();

    const player = players.find((p) => p.id === parseInt(playerId));
    if (!player) {
      return res.status(404).send("Jugador no encontrado");
    }

    const tournamentIndex = player.tournaments.indexOf(parseInt(tournamentId));
    if (tournamentIndex === -1) {
      return res
        .status(400)
        .send("El jugador no está registrado en el torneo especificado");
    }

    // Eliminar el torneo de la lista de torneos del jugador
    player.tournaments.splice(tournamentIndex, 1);

    await db
      .collection("players")
      .updateOne(
        { id: parseInt(playerId) },
        { $set: { tournaments: player.tournaments } }
      );

    res.status(200).send({
      code: 200,
      message: "Torneo eliminado exitosamente del jugador",
      data: player,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Crear un nuevo jugador
const createPlayer = async (req, res) => {
  try {
    const db = getDB();
    const { number_id } = req.body;

    // Verificar si el jugador ya existe
    const playerExists = await db.collection("players").findOne({ number_id });

    if (playerExists) {
      // Buscar el equipo del jugador existente
      const team = await db.collection("teams").findOne({ id: playerExists.id_team });
      
      return res.status(400).send({
        code: 400,
        message: `El jugador asociado con el documento No. ${number_id} ya está registrado en el equipo ${team ? team.name : 'desconocido'}.`,
      });
    }

    // Obtener el último ID registrado y sumar 1 para el nuevo ID
    const lastPlayer = await db
      .collection("players")
      .find()
      .sort({ id: -1 }) // Ordenar en orden descendente por 'id'
      .limit(1)
      .toArray();

    const newId = lastPlayer.length > 0 ? lastPlayer[0].id + 1 : 1; // Si no hay jugadores, el primer ID será 1

    // Crear un nuevo jugador con el ID generado
    const newPlayer = {
      id: newId,
      ...req.body,
      created_by: req.user.id,
    };

    await db.collection("players").insertOne(newPlayer);

    res.status(200).send({
      code: 200,
      message: "Jugador creado con éxito",
      data: newPlayer,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};


// Actualizar un jugador por ID
const updatePlayer = async (req, res) => {
  try {
    const db = getDB();
    const playerId = parseInt(req.params.id);

    // Obtener el jugador existente para no modificar el campo 'tournaments'
    const existingPlayer = await db
      .collection("players")
      .findOne({ id: playerId });

    if (!existingPlayer) {
      return res.status(404).send("Jugador no encontrado");
    }

    // Crear un nuevo objeto que combine los datos existentes con los nuevos (excluyendo 'tournaments')
    const updatedData = {
      ...existingPlayer,
      ...req.body, // Solo sobrescribe los campos que vienen en el cuerpo de la petición
      tournaments: existingPlayer.tournaments, // Mantener intacto 'tournaments'
    };

    // Actualizar el jugador con los datos combinados
    const updatedPlayer = await db
      .collection("players")
      .findOneAndUpdate(
        { id: playerId },
        { $set: updatedData },
        { returnOriginal: false }
      );

    res.status(200).send({
      code: 200,
      message: "Jugador actualizado con éxito",
      data: updatedPlayer.value,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Eliminar un jugador por ID
const deletePlayer = async (req, res) => {
  try {
    const db = getDB();
    const deletedPlayer = await db
      .collection("players")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedPlayer) {
      res.status(200).send({
        code: 200,
        message: "Jugador eliminado con éxito",
        data: deletedPlayer,
      });
    } else {
      res.status(404).send("Jugador no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Eliminar todos los jugadores por ID de equipo
const deletePlayersByTeamID = async (req, res) => {
  try {
    const db = getDB();
    const { id_team } = req.params;

    const players = await db.collection("players").find().toArray();
    const filteredPlayers = players.filter(
      (player) => player.id_team !== parseInt(id_team)
    );

    if (filteredPlayers.length === players.length) {
      return res.status(404).send({
        code: 404,
        message:
          "No se encontraron jugadores para el ID de equipo especificado",
      });
    }

    await db.collection("players").deleteMany({ id_team: parseInt(id_team) });

    res.status(200).send({
      code: 200,
      message: "Jugadores eliminados con éxito",
    });
  } catch (err) {
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
