require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const v1Routes = require('./routes/v1');    // Saare v1 routes (jisme auth bhi hai) ek jagah se le aaye



const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', v1Routes);   // Saare v1 routes ke liye prefix '/api/v1' lagaye


async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected...');

    await sequelize.sync();
    console.log('Database synced...');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
  }
}

start().catch((err) => {
  console.error('Error starting the server:', err);
});

