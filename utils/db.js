import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.dbName = process.env.DB_DATABASE || 'files_manager';
    this.connectToClient();
  }

  async connectToClient() {
    await new MongoClient(`mongodb://${this.host}:${this.port}`, { useUnifiedTopology: true })
      .connect()
      .then((client) => {
        this.client = client;
        this.db = this.client.db(this.dbName);
        this.files = this.db.collection('files');
        this.users = this.db.collection('users');
      })
      .catch(console.error);
  }

  isAlive() { return this.client.isConnected(); }

  async nbUsers() { return this.users.countDocuments(); }

  async nbFiles() { return this.files.countDocuments(); }
}

const dbClient = new DBClient();
export default dbClient;
