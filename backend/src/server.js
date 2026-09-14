const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

// Charger les routes
app.use("/categories", require("./routes/categoryRoutes"));
app.use("/products", require("./routes/productRoutes"));
app.use("/stock", require("./routes/stockRoutes"));
app.use("/sales", require("./routes/salesRoutes"));
app.use("/dashboard", require("./routes/dashboardRoutes"));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur KAMS Stock démarré sur le port ${PORT}`);
});