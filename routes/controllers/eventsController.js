const { getDB } = require("../../config/db");
const twilio = require("twilio");

// Cargar variables de entorno
require("dotenv").config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Obtener todos los eventos
const getAllEvents = async (req, res) => {
  try {
    const db = getDB();
    const events = await db.collection("events").find().toArray();

    if (events) {
      res.status(200).send({
        code: 200,
        message: "Eventos obtenidos exitosamente",
        data: events,
      });
    } else {
      return res
        .status(500)
        .send("Error al obtener los eventos de la base de datos");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener un evento por ID
const getEventByID = async (req, res) => {
  try {
    const db = getDB();
    const event = await db
      .collection("events")
      .findOne({ id: parseInt(req.params.id) });

    if (event) {
      res.status(200).send({
        code: 200,
        message: "Evento obtenido exitosamente",
        data: event,
      });
    } else {
      res.status(404).send("Evento no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear un nuevo evento
const createEvent = async (req, res) => {
  try {
    const db = getDB();
    const { id_player, id_match, id_event_type } = req.body;

    const events = await db.collection("events").find().toArray();
    const matches = await db.collection("matches").find().toArray();
    const players = await db.collection("players").find().toArray();
    const tournaments = await db.collection("tournaments").find().toArray();
    const classifications = await db
      .collection("classifications")
      .find()
      .toArray();
    const playerStats = await db.collection("player_stats").find().toArray();

    const tournament = tournaments.find(
      (t) => t.id === parseInt(req.body.id_tournament)
    );
    if (!tournament) {
      return res.status(404).send("Torneo no encontrado");
    }

    // Verificar si el jugador ya tiene un evento de tipo 3 (tarjeta roja) o dos eventos de tipo 2 (tarjetas amarillas) en este partido
    const playerEvents = events.filter(
      (event) => event.id_player === id_player && event.id_match === id_match
    );

    const redCardEvent = playerEvents.find(
      (event) => event.id_event_type === 3
    );
    const yellowCardEvents = playerEvents.filter(
      (event) => event.id_event_type === 2
    );

    if (redCardEvent || yellowCardEvents.length >= 2) {
      return res.status(400).send({
        code: 400,
        message:
          "El jugador ya está expulsado y no puede tener más eventos en este partido.",
      });
    }

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("events")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newEvent = {
      id: newId,
      ...req.body,
    };

    await db.collection("events").insertOne(newEvent);

    // Actualizar el resultado del partido y las estadísticas si el tipo de evento es relevante
    if (newEvent.id_event_type === 1) {
      // Actualizar resultado del partido
      const match = matches.find((m) => m.id === newEvent.id_match);
      const player = players.find((p) => p.id === newEvent.id_player);

      if (match && player) {
        const isLocalTeam = match.local_team === player.id_team;
        if (isLocalTeam) {
          match.local_result += 1;
        } else {
          match.visiting_result += 1;
        }
        await db
          .collection("matches")
          .updateOne({ id: match.id }, { $set: match });
      }
    }

    // Si el tipo de evento es tarjeta roja o amarilla, actualizar estadísticas
    let playerStat = playerStats.find(
      (ps) =>
        ps.id_player === newEvent.id_player &&
        ps.id_tournament === newEvent.id_tournament
    );

    if (
      !playerStat &&
      (newEvent.id_event_type === 1 ||
        newEvent.id_event_type === 2 ||
        newEvent.id_event_type === 3)
    ) {
      const lastID = await db
        .collection("player_stats")
        .findOne({}, { sort: { id: -1 } });
      const newIdStats = lastID ? lastID.id + 1 : 1;

      playerStat = {
        id: newIdStats,
        id_player: newEvent.id_player,
        id_tournament: newEvent.id_tournament,
        games_played: 0,
        goals: 0,
        yellow_cards: 0,
        red_cards: 0,
      };
      await db.collection("player_stats").insertOne(playerStat);
    }

    const lastIDPenalty = await db
      .collection("penalties")
      .findOne({}, { sort: { id: -1 } });

    const newIdPenalty = lastIDPenalty ? lastIDPenalty.id + 1 : 1;

    if (newEvent.id_event_type === 1) {
      playerStat.goals += 1;
    } else if (newEvent.id_event_type === 2) {
      playerStat.yellow_cards += 1;

      if (yellowCardEvents.length + 1 >= 2) {
        const penalty = {
          id: newIdPenalty,
          id_match: newEvent.id_match,
          id_player: newEvent.id_player,
          id_tournament: newEvent.id_tournament,
          date: new Date().toISOString().split("T")[0],
          description: "Suspendido por acumulación de tarjetas amarillas",
          sanction_duration: 1,
          status: "Vigente",
        };
        await db.collection("penalties").insertOne(penalty);

        // Cambiar el estado del jugador a 3
        await db
          .collection("players")
          .updateOne({ id: newEvent.id_player }, { $set: { status: 3 } });
      }
    } else if (newEvent.id_event_type === 3) {
      playerStat.red_cards += 1;

      const penalty = {
        id: newIdPenalty,
        id_match: newEvent.id_match,
        id_player: newEvent.id_player,
        id_tournament: newEvent.id_tournament,
        date: new Date().toISOString().split("T")[0],
        description: "Suspendido por tarjeta roja directa",
        sanction_duration: 1,
        status: "Vigente",
      };
      await db.collection("penalties").insertOne(penalty);

      // Cambiar el estado del jugador a 3
      await db
        .collection("players")
        .updateOne({ id: newEvent.id_player }, { $set: { status: 3 } });
    } else if (newEvent.id_event_type === 7) {
      // Lógica para cuando el id_event_type es 7 (finalización del partido)
      const match = matches.find((m) => m.id === newEvent.id_match);

      if (match) {
        // Cambiar el estado del partido a "finalizado"
        match.status = 5;

        const localTeam = classifications.find(
          (c) =>
            c.id_team === match.local_team &&
            c.id_tournament === match.id_tournament
        );
        const visitingTeam = classifications.find(
          (c) =>
            c.id_team === match.visiting_team &&
            c.id_tournament === match.id_tournament
        );

        if (localTeam && visitingTeam) {
          // Actualizar partidos jugados
          localTeam.matches_played += 1;
          visitingTeam.matches_played += 1;

          // Actualizar goles a favor y en contra
          localTeam.favor_goals += match.local_result;
          localTeam.goals_against += match.visiting_result;
          visitingTeam.favor_goals += match.visiting_result;
          visitingTeam.goals_against += match.local_result;

          // Actualizar diferencia de goles
          localTeam.goal_difference =
            localTeam.favor_goals - localTeam.goals_against;
          visitingTeam.goal_difference =
            visitingTeam.favor_goals - visitingTeam.goals_against;

          // Actualizar puntos, partidos ganados, empatados y perdidos
          if (tournament.id_category === 1) {
            if (match.local_result > match.visiting_result) {
              localTeam.points += 2;
              localTeam.matches_won += 1;
              visitingTeam.lost_matches += 1;
            } else if (match.local_result < match.visiting_result) {
              visitingTeam.points += 2;
              visitingTeam.matches_won += 1;
              localTeam.lost_matches += 1;
            } else {
              localTeam.points += 1;
              visitingTeam.points += 1;
              localTeam.tied_matches += 1;
              visitingTeam.tied_matches += 1;
            }

            localTeam.points += req.body.teamAProtocol ? 2 : 0;
            localTeam.points += req.body.teamAConduct ? 2 : 0;
            visitingTeam.points += req.body.teamBProtocol ? 2 : 0;
            visitingTeam.points += req.body.teamBConduct ? 2 : 0;
          } else {
            if (match.local_result > match.visiting_result) {
              localTeam.points += 3;
              localTeam.matches_won += 1;
              visitingTeam.lost_matches += 1;
            } else if (match.local_result < match.visiting_result) {
              visitingTeam.points += 3;
              visitingTeam.matches_won += 1;
              localTeam.lost_matches += 1;
            } else {
              localTeam.points += 1;
              visitingTeam.points += 1;
              localTeam.tied_matches += 1;
              visitingTeam.tied_matches += 1;
            }
          }

          await db.collection("classifications").updateOne(
            {
              id_team: localTeam.id_team,
              id_tournament: localTeam.id_tournament,
            },
            { $set: localTeam }
          );
          await db.collection("classifications").updateOne(
            {
              id_team: visitingTeam.id_team,
              id_tournament: visitingTeam.id_tournament,
            },
            { $set: visitingTeam }
          );
        }

        await db
          .collection("matches")
          .updateOne({ id: match.id }, { $set: { status: match.status } });
      }
    }

    if (
      playerStat &&
      (newEvent.id_event_type === 1 ||
        newEvent.id_event_type === 2 ||
        newEvent.id_event_type === 3)
    ) {
      await db
        .collection("player_stats")
        .updateOne({ id: playerStat.id }, { $set: playerStat });
    }

    res.status(200).send({
      code: 200,
      message: "Evento creado exitosamente",
      data: newEvent,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar un evento por ID
const updateEvent = async (req, res) => {
  try {
    const db = getDB();
    const updatedEvent = await db
      .collection("events")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedEvent) {
      res.status(200).send({
        code: 200,
        message: "Evento actualizado exitosamente",
        data: updatedEvent,
      });
    } else {
      res.status(404).send("Evento no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar un evento por ID
const deleteEvent = async (req, res) => {
  try {
    const db = getDB();
    const deletedEvent = await db
      .collection("events")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedEvent) {
      res.status(200).send({
        code: 200,
        message: "Evento eliminado exitosamente",
        data: deletedEvent,
      });
    } else {
      res.status(404).send("Evento no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

const sendMessage = async (req, res) => {
  const { to } = req.body;

  try {
    const db = getDB();
    const [match, teams, players, events, matchPlayersNumbers, penalties] =
      await Promise.all([
        db.collection("matches").findOne({ id: parseInt(req.params.id) }),
        db.collection("teams").find().toArray(),
        db.collection("players").find().toArray(),
        db.collection("events").find().toArray(),
        db.collection("match_players_numbers").find().toArray(),
        db.collection("penalties").find().toArray(),
      ]);

    if (!match) {
      return res.status(404).send("Partido no encontrado");
    }

    const homeTeam = teams.find((t) => t.id === match.local_team);
    const awayTeam = teams.find((t) => t.id === match.visiting_team);

    if (!homeTeam || !awayTeam) {
      return res.status(404).send("Equipos no encontrados");
    }

    // Filtrar eventos de goles por equipo
    const homeTeamGoals = events.filter(
      (e) => e.id_event_type === "goal" && homeTeam.id === e.id_team
    );
    const awayTeamGoals = events.filter(
      (e) => e.id_event_type === "goal" && awayTeam.id === e.id_team
    );

    // Filtrar eventos de tarjetas amarillas y rojas
    const yellowCards = events.filter((e) => e.id_event_type === "yellow_card");
    const redCards = events.filter((e) => e.id_event_type === "red_card");

    // Obtener nombres de los goleadores
    const homeScorers = homeTeamGoals
      .map((goal) => {
        const player = players.find((p) => p.id === goal.id_player);
        return player ? player.name : "Jugador desconocido";
      })
      .join(", ");

    const awayScorers = awayTeamGoals
      .map((goal) => {
        const player = players.find((p) => p.id === goal.id_player);
        return player ? player.name : "Jugador desconocido";
      })
      .join(", ");

    // Obtener nombres de jugadores con tarjetas
    const yellowCardPlayers =
      yellowCards
        .map((card) => {
          const player = players.find((p) => p.id === card.id_player);
          return player ? player.name : "Jugador desconocido";
        })
        .join(", ") || "Ninguna";

    const redCardPlayers =
      redCards
        .map((card) => {
          const player = players.find((p) => p.id === card.id_player);
          return player ? player.name : "Jugador desconocido";
        })
        .join(", ") || "Ninguna";

    // Crear el mensaje con el formato
    const message =
      `${homeTeam.name} ${match.local_result} - ${awayTeam.name} ${match.visiting_result}\n` +
      `Eventos:\nGoles ${homeTeam.name}: ${homeScorers}\n` +
      `Goles ${awayTeam.name}: ${awayScorers}\n` +
      `Tarjetas amarillas: ${yellowCardPlayers}\n` +
      `Tarjetas rojas: ${redCardPlayers}`;

    // Enviar el mensaje usando Twilio
    client.messages
      .create({
        body: message,
        from: "whatsapp:+14155238886",
        to: `whatsapp:${to}`,
      })
      .then((msg) => res.status(200).json({ success: true, sid: msg.sid }))
      .catch((err) =>
        res.status(500).json({ success: false, error: err.message })
      );
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

module.exports = {
  getAllEvents,
  getEventByID,
  createEvent,
  updateEvent,
  deleteEvent,
  sendMessage,
};
