import express, { json } from "express";
import loginRoutes from "./routes/login.js";
import cors from "cors";
import UserRoutes from "./routes/users.js";
import campaignRoutes from "./routes/campaigns.js";

const app = express();

// handle cors errors
const corsOptions = {
  credentials: true,
  origin: process.env.URL || "*",
};

app.use(cors(corsOptions));
app.use(json());

app.get("/", (req, res) => {
  res.redirect("/users");
});
app.use("/users", UserRoutes);
app.use("/login", loginRoutes);
app.use("/campaigns", campaignRoutes);

let PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`server has started on http://localhost:${PORT}`)
);
