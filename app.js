require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const sequelize = require('./src/config/database');
const routes = require('./src/routes');

class App {
  constructor() {
    this.app = express();
    this.port = parseInt(process.env.APP_PORT, 10) || 3002;

    this.configureMiddleware();
    this.configureRoutes();
    this.connectToDatabase();
  }

  configureMiddleware() {
    this.app.use(cors({ origin: '*', credentials: true }));
    this.app.use('/public', express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  configureRoutes() {
    this.app.use(routes);
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  async connectToDatabase() {
    try {
      await sequelize.sync();
      this.app.listen(this.port, '0.0.0.0', () => {
        console.log(` > Server is running on http://${this.getLocalIP()}:${this.port}`);
      });

    } catch (error) {
      console.error(' > Error connecting to the database:', error.message);
    }
  }
}

new App();