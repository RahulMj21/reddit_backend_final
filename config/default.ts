export default {
  port: process.env.PORT,
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  __prod__: process.env.NODE_ENV === "production",
};
