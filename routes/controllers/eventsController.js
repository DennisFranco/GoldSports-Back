const { ObjectId } = require("mongodb");
const { getDB } = require("../../config/db");

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
      res.status(500).send("Error al leer los eventos de la base de datos");
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
      .findOne({ _id:  new ObjectId(req.params.id) });

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

    // Verificar si el jugador ya tiene una tarjeta roja o dos amarillas
    const playerEvents = await db
      .collection("events")
      .find({
        id_player:  new ObjectId(id_player),
        id_match:  new ObjectId(id_match),
      })
      .toArray();

    const redCardEvent = playerEvents.find(
      (event) => event.id_event_type === "66da8614ad4a8cc7df6ac87b"
    );
    const yellowCardEvents = playerEvents.filter(
      (event) => event.id_event_type === "66da8614ad4a8cc7df6ac87a"
    );

    if (redCardEvent || yellowCardEvents.length >= 2) {
      return res.status(400).send({
        code: 400,
        message:
          "El jugador ya está expulsado y no puede tener más eventos en este partido.",
      });
    }

    const newEvent = {
      id_player:  new ObjectId(id_player),
      id_match:  new ObjectId(id_match),
      id_event_type:  new ObjectId(id_event_type),
    };

    await db.collection("events").insertOne(newEvent);

    // Actualizar el resultado del partido
    const match = await db
      .collection("matches")
      .findOne({ _id:  new ObjectId(id_match) });
    const player = await db
      .collection("players")
      .findOne({ _id:  new ObjectId(id_player) });

    if (id_event_type === "66da8614ad4a8cc7df6ac879") {
      const isLocalTeam =
        match.local_team.toString() === player.id_team.toString();
      const updatedScore = isLocalTeam
        ? { local_result: match.local_result + 1 }
        : { visiting_result: match.visiting_result + 1 };

      await db
        .collection("matches")
        .updateOne({ _id:  new ObjectId(id_match) }, { $set: updatedScore });
    }

    // Otros tipos de eventos
    if (id_event_type === "66da8614ad4a8cc7df6ac87d") {
      await db
        .collection("matches")
        .updateOne(
          { _id:  new ObjectId(id_match) },
          { $set: { status: "66dab91fa45789574acff524" } }
        );
    } else if (id_event_type === 7) {
      await db
        .collection("matches")
        .updateOne(
          { _id:  new ObjectId(id_match) },
          { $set: { status: "66dab91fa45789574acff525" } }
        );
      // Actualizar clasificaciones
      await updateClassifications(db, match);
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

// Actualizar clasificaciones
const updateClassifications = async (db, match) => {
  const localTeam = await db.collection("classifications").findOne({
    id_team:  new ObjectId(match.local_team),
    id_tournament:  new ObjectId(match.id_tournament),
  });
  const visitingTeam = await db.collection("classifications").findOne({
    id_team:  new ObjectId(match.visiting_team),
    id_tournament:  new ObjectId(match.id_tournament),
  });

  if (localTeam && visitingTeam) {
    await db
      .collection("classifications")
      .updateMany(
        { _id: { $in: [localTeam._id, visitingTeam._id] } },
        { $inc: { matches_played: 1 } }
      );

    const updates = [
      {
        id: localTeam._id,
        favor_goals: match.local_result,
        goals_against: match.visiting_result,
        points:
          match.local_result > match.visiting_result
            ? 3
            : match.local_result === match.visiting_result
            ? 1
            : 0,
      },
      {
        id: visitingTeam._id,
        favor_goals: match.visiting_result,
        goals_against: match.local_result,
        points:
          match.visiting_result > match.local_result
            ? 3
            : match.visiting_result === match.local_result
            ? 1
            : 0,
      },
    ];

    for (const update of updates) {
      await db.collection("classifications").updateOne(
        { _id: update.id },
        {
          $inc: {
            favor_goals: update.favor_goals,
            goals_against: update.goals_against,
            points: update.points,
          },
        }
      );
    }
  }
};

// Actualizar un evento por ID
const updateEvent = async (req, res) => {
  try {
    const db = getDB();
    const eventId = new ObjectId(req.params.id);
    const updatedEvent = req.body;

    const result = await db
      .collection("events")
      .updateOne({ _id: eventId }, { $set: updatedEvent });

    if (result.matchedCount > 0) {
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
    const eventId = new ObjectId(req.params.id);

    const result = await db.collection("events").deleteOne({ _id: eventId });

    if (result.deletedCount > 0) {
      res.status(200).send({
        code: 200,
        message: "Evento eliminado exitosamente",
      });
    } else {
      res.status(404).send("Evento no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllEvents,
  getEventByID,
  createEvent,
  updateEvent,
  deleteEvent,
};
