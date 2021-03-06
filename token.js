import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function token({ user_id, username, email }) {
  const user = { user_id, username, email };
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
    expiresIn: "20h",
  });
  return { accessToken };
}

export { token };
