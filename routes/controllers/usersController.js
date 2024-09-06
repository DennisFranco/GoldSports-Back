const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    const roles = await db.collection("roles").find().toArray();

    if (users) {
      const roleFilter = req.query.role;

      // Filtrar usuarios por rol si se proporciona un parámetro de consulta de rol
      const filteredUsers = roleFilter
        ? users.filter((user) => String(user.role) === roleFilter)
        : users;

      // Combinar los usuarios con sus roles y excluir la contraseña
      const usersWithRoles = filteredUsers.map((user) => {
        const rol = roles.find((rol) => rol._id.equals(user.role));
        const { password, ...userWithoutPassword } = user; // Excluir la contraseña
        return {
          ...userWithoutPassword,
          nameRole: rol ? rol.name : "Rol no encontrado",
        };
      });

      res.status(200).send({
        code: 200,
        message: "Usuarios obtenidos exitosamente",
        data: usersWithRoles,
      });
    } else {
      return res.status(500).send("Error al obtener usuarios");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener todos los roles
const getAllRoles = async (req, res) => {
  try {
    const db = getDB();
    const roles = await db.collection("roles").find().toArray();

    if (roles) {
      res.status(200).send({
        code: 200,
        message: "Roles obtenidos exitosamente",
        data: roles,
      });
    } else {
      return res.status(500).send("Error al obtener roles");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Iniciar sesión
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).send({
        code: 401,
        message: "El usuario no existe",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({
        code: 401,
        message: "Contraseña incorrecta",
      });
    }

    if (user.status !== "66da868c3167557912b2bc51e") {
      return res.status(401).send({
        code: 401,
        message: "Usuario deshabilitado",
      });
    }

    jwt.sign(
      { user },
      process.env.SECRET_KEY,
      { expiresIn: "8h" },
      (err, token) => {
        if (err) {
          return res.status(500).send("Error al crear el token");
        }
        return res.status(200).send({
          code: 200,
          message: "Inicio de sesión exitoso",
          token,
          user: {
            ...user,
            password: undefined, // Omitir la contraseña
          },
        });
      }
    );
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear un nuevo usuario
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, status, phoneNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).send({
        code: 400,
        message:
          "Nombre, correo electrónico, contraseña y rol son obligatorios",
      });
    }

    const db = getDB();
    const roles = await db.collection("roles").find().toArray();

    const validRole = roles.find((r) => r._id.equals(new ObjectId(role)));
    if (!validRole) {
      return res.status(400).send({
        code: 400,
        message: "Rol inválido",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role:  new ObjectId(role),
      status: status || "66dab91fa45789574acff51e", // Activo por defecto
      phoneNumber: phoneNumber || "",
    };

    await db.collection("users").insertOne(newUser);

    res.status(200).send({
      code: 200,
      message: "Usuario creado exitosamente",
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Editar un usuario existente
const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, phoneNumber } = req.body;

    const db = getDB();
    const roles = await db.collection("roles").find().toArray();
    const user = await db.collection("users").findOne({ _id:  new ObjectId(id) });

    if (!user) {
      return res.status(404).send({
        code: 404,
        message: "Usuario no encontrado",
      });
    }

    if (role) {
      const validRole = roles.find((r) => r._id.equals(new ObjectId(role)));
      if (!validRole) {
        return res.status(400).send({
          code: 400,
          message: "Rol inválido",
        });
      }
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedUser = {
      ...user,
      name: name || user.name,
      email: email || user.email,
      password: hashedPassword || user.password,
      role: role ? new ObjectId(role) : user.role,
      status: status !== undefined ? status : user.status,
      phoneNumber: phoneNumber || user.phoneNumber,
    };

    await db
      .collection("users")
      .updateOne({ _id:  new ObjectId(id) }, { $set: updatedUser });

    res.status(200).send({
      code: 200,
      message: "Usuario actualizado exitosamente",
      data: { ...updatedUser, password: undefined },
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  loginUser,
  getAllUsers,
  getAllRoles,
  createUser,
  editUser,
};
