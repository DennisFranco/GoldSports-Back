const fs = require("fs");
const path = require("path");

const eventsPath = path.join(__dirname, "../../db/events.json");
const matchesPath = path.join(__dirname, "../../db/matches.json");
const playersPath = path.join(__dirname, "../../db/players.json");

const getJSONData = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};

const writeJSONData = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

// Obtener todos los eventos
const getAllEvents = async (req, res) => {
  const events = await getJSONData(eventsPath);

  try {
    if (events) {
      res.status(200).send({
        code: 200,
        message: "Events successfully obtained",
        data: events,
      });
    } else {
      return res.status(500).send("Error reading events from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un evento por ID
const getEventByID = async (req, res) => {
  const events = await getJSONData(eventsPath);

  try {
    if (events) {
      const event = events.find((e) => e.id === parseInt(req.params.id));
      if (event) {
        res.status(200).send({
          code: 200,
          message: "Event successfully obtained",
          data: event,
        });
      } else {
        res.status(404).send("Event not found");
      }
    } else {
      return res.status(500).send("Error reading events from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo evento
const createEvent = async (req, res) => {
  try {
    const events = await getJSONData(eventsPath);
    const matches = await getJSONData(matchesPath);
    const players = await getJSONData(playersPath);

    const newEvent = {
      id: events.length + 1,
      ...req.body,
    };
    events.push(newEvent);

    // Actualizar matches.json si id_event_type es 1 o 5
    const matchIndex = matches.findIndex((m) => m.id === newEvent.id_match);
    if (matchIndex !== -1) {
      if (newEvent.id_event_type === 5) {
        // Cambiar el estado del partido a 4
        matches[matchIndex].status = 4;
      } else if (newEvent.id_event_type === 1) {
        // Actualizar el resultado del partido
        const player = players.find((p) => p.id === newEvent.id_player);
        if (player) {
          const isLocalTeam = matches[matchIndex].local_team === player.id_team;
          if (isLocalTeam) {
            matches[matchIndex].local_result += 1;
          } else {
            matches[matchIndex].visiting_result += 1;
          }
        }
      }
    }

    await Promise.all([
      writeJSONData(eventsPath, events),
      writeJSONData(matchesPath, matches),
    ]);

    res.status(200).send({
      code: 200,
      message: "Event successfully created",
      data: newEvent,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un evento por ID
const updateEvent = async (req, res) => {
  try {
    const events = await getJSONData(eventsPath);
    const eventIndex = events.findIndex(
      (e) => e.id === parseInt(req.params.id)
    );
    if (eventIndex !== -1) {
      events[eventIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(eventsPath, events);
      res.status(200).send({
        code: 200,
        message: "Event successfully updated",
        data: events[eventIndex],
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
    const events = await getJSONData(eventsPath);
    const eventIndex = events.findIndex(
      (e) => e.id === parseInt(req.params.id)
    );
    if (eventIndex !== -1) {
      const deletedEvent = events.splice(eventIndex, 1);
      await writeJSONData(eventsPath, events);
      res.status(200).send({
        code: 200,
        message: "Event successfully deleted",
        data: deletedEvent,
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
