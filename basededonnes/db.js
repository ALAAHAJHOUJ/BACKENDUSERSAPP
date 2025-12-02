require('dotenv').config();
const mysql=require("mysql");

const connection = mysql.createConnection({
  host:process.env.DB_SERVICE,
  user:process.env.DB_USER,
  password: process.env.DB_PASS,
  database:process.env.DB_NOM
});




connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :'+err.stack);
    process.exit(1);
  }
  console.log('Connecté à la base de données MySQL avec l’ID', connection.threadId);
});

module.exports = connection;