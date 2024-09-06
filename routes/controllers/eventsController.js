const { getDB } = require("../../config/db");

// Obtener todos los eventos
const getAllEvents = async (req, res) => {
  try {
    const db = getDB();
    const events = await db.collection("events").find().toArray();

    if (events) {
      res.status(200).send({
        code: 200,
        message: "Events successfully obtained",
        data: events,
      });
    } else {
      return res.status(500).send("Error fetching events from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
        message: "Event successfully obtained",
        data: event,
      });
    } else {
      res.status(404).send("Event not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
    const classifications = await db
      .collection("classifications")
      .find()
      .toArray();
    const penalties = await db.collection("penalties").find().toArray();
    const playerStats = await db.collection("player_stats").find().toArray();

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

    const newEvent = {
      id: events.length + 1,
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

    if (!playerStat) {
      playerStat = {
        id: playerStats.length + 1,
        id_player: newEvent.id_player,
        id_tournament: newEvent.id_tournament,
        games_played: 0,
        goals: 0,
        yellow_cards: 0,
        red_cards: 0,
      };
      await db.collection("player_stats").insertOne(playerStat);
    }

    if (newEvent.id_event_type === 1) {
      playerStat.goals += 1;
    } else if (newEvent.id_event_type === 2) {
      playerStat.yellow_cards += 1;

      if (yellowCardEvents.length + 1 >= 2) {
        const penalty = {
          id: penalties.length + 1,
          id_player: newEvent.id_player,
          id_tournament: newEvent.id_tournament,
          date: new Date().toISOString().split("T")[0],
          description: "Suspendido por acumulación de tarjetas amarillas",
          sanction_duration: 1,
          status: "Vigente",
        };
        await db.collection("penalties").insertOne(penalty);
      }
    } else if (newEvent.id_event_type === 3) {
      playerStat.red_cards += 1;

      const penalty = {
        id: penalties.length + 1,
        id_player: newEvent.id_player,
        id_tournament: newEvent.id_tournament,
        date: new Date().toISOString().split("T")[0],
        description: "Suspendido por tarjeta roja directa",
        sanction_duration: 1,
        status: "Vigente",
      };
      await db.collection("penalties").insertOne(penalty);
    }

    await db
      .collection("player_stats")
      .updateOne({ id: playerStat.id }, { $set: playerStat });

    res.status(200).send({
      code: 200,
      message: "Event successfully created",
      data: newEvent,
    });
  } catch (err) {
    console.error("Error in createEvent:", err);
    res.status(500).send("Server error");
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

    if (updatedEvent.value) {
      res.status(200).send({
        code: 200,
        message: "Event successfully updated",
        data: updatedEvent.value,
      });
    } else {
      res.status(404).send("Event not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un evento por ID
const deleteEvent = async (req, res) => {
  try {
    const db = getDB();
    const deletedEvent = await db
      .collection("events")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedEvent.value) {
      res.status(200).send({
        code: 200,
        message: "Event successfully deleted",
        data: deletedEvent.value,
      });
    } else {
      res.status(404).send("Event not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllEvents,
  getEventByID,
  createEvent,
  updateEvent,
  deleteEvent,
};