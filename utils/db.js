const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.PORT || 27017;
    const dbName = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.client.connect((err) => {
      if (err === null) {
        this.db = this.client.db(dbName);
        // this.client.close();
      }
    });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const collection = this.db.collection('users');
    const resArray = await collection.find({}).toArray();
    return resArray.length;
  }

  async nbFiles() {
    const collection = this.db.collection('files');
    const resArray = await collection.find({}).toArray();
    return resArray.length;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
