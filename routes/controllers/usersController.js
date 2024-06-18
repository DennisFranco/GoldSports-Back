const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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

const getAllUsers = async (req, res) => {
  try {
    const usersPath = path.join(__dirname, "../../db/users.json");
    const rolesPath = path.join(__dirname, "../../db/roles.json");

    const users = await getJSONData(usersPath);
    const roles = await getJSONData(rolesPath);

    if (users) {
      // Combinar los usuarios con sus roles
      const usersWithRoles = users.map((user) => {
        // Encontrar el rol que corresponde al usuario
        const rol = roles.find((rol) => rol.id === user.role);
        // Agregar el nombre del rol al objeto del usuario
        return {
          ...user,
          nameRole: rol ? rol.name : "Role not found",
        };
      });

      res.status(200).send({
        code: 200,
        message: "Users successfully obtained",
        data: usersWithRoles,
      });
    } else {
      return res.status(500).send("Error reading users from file");
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const getAllRoles = async (req, res) => {
  try {
    const rolesPath = path.join(__dirname, "../../db/roles.json");
    const roles = await getJSONData(rolesPath);

    if (roles) {
      res.status(200).send({
        code: 200,
        message: "Successfully obtained roles",
        data: roles,
      });
    } else {
      return res.status(500).send("Error reading roles from file");
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const loginUser = async (req, res) => {
  console.log("llega", req.body);
  const { email, password } = req.body; // Recibir nombre y contraseña del cuerpo de la solicitud
  try {
    const usersPath = path.join(__dirname, "../../db/users.json");
    const users = await getJSONData(usersPath);

    // Buscar el usuario por correo electrónico
    const user = users.find((user) => user.email === email);

    if (!user) {
      return res.status(401).send({
        code: 401,
        message: "User doesn't exist",
      });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({
        code: 401,
        message: "Password incorrect",
      });
    }

    if (user.status !== 1) {
      // Usuario inhabilitado
      return res.status(401).send({
        code: 401,
        message: "Disabled user",
      });
    }

    // Crear token JWT
    jwt.sign(
      { user },
      process.env.SECRET_KEY,
      { expiresIn: "8h" },
      (err, token) => {
        if (err) {
          return res.status(500).send("Error creating token");
        }
        // Usuario encontrado y contraseña correcta
        return res.status(200).send({
          code: 200,
          message: "Successful login",
          token,
          user: {
            ...user,
            password: undefined, // Omitir la contraseña del objeto de usuario
          },
        });
      }
    );
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  loginUser,
  getAllUsers,
  getAllRoles,
};
