import path from 'node:path';
import { config } from '../config.js';
import { JsonDb } from './jsonStore.js';

let connection = null;

function serializeDoc(doc) {
  if (!doc) return doc;
  const copy = { ...doc };
  if (copy._id && typeof copy._id !== 'string') copy._id = copy._id.toString();
  return copy;
}

async function createMongoDb() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const database = client.db(config.mongoDb);

  return {
    kind: 'mongodb',
    collection(name) {
      const collection = database.collection(name);
      return {
        name,
        find(filter = {}) {
          let cursor = collection.find(filter);
          const api = {
            sort(spec = {}) {
              cursor = cursor.sort(spec && Object.keys(spec).length ? spec : { _id: -1 });
              return api;
            },
            skip(count) {
              cursor = cursor.skip(Number(count) || 0);
              return api;
            },
            limit(count) {
              if (count) cursor = cursor.limit(Number(count));
              return api;
            },
            async toArray() {
              const docs = await cursor.toArray();
              return docs.map(serializeDoc);
            },
          };
          return api;
        },
        async findOne(filter = {}) {
          return serializeDoc(await collection.findOne(filter));
        },
        async insertOne(doc) {
          const result = await collection.insertOne(doc);
          return { insertedId: result.insertedId?.toString?.() || doc._id, acknowledged: result.acknowledged };
        },
        async insertMany(docs) {
          const result = await collection.insertMany(docs);
          return { insertedCount: result.insertedCount, acknowledged: result.acknowledged };
        },
        async updateOne(filter, update) {
          const result = await collection.updateOne(filter, update);
          return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
        },
        async deleteOne(filter) {
          const result = await collection.deleteOne(filter);
          return { deletedCount: result.deletedCount };
        },
        async countDocuments(filter = {}) {
          return collection.countDocuments(filter);
        },
        async distinct(field) {
          return collection.distinct(field);
        },
      };
    },
    async replaceCollection(name, docs) {
      await database.collection(name).deleteMany({});
      if (docs.length) await database.collection(name).insertMany(docs);
    },
    async close() {
      await client.close();
    },
  };
}

export async function getDb() {
  if (connection) return connection;
  if (config.mongoUri) {
    try {
      connection = await createMongoDb();
      console.log('[db] connected to MongoDB');
    } catch (error) {
      console.error('[db] MongoDB connection failed, falling back to local data store:', error.message);
      connection = null;
    }
  }
  if (!connection) {
    connection = new JsonDb(path.join(config.rootDir, 'data', 'db.json'));
    console.log('[db] using local JSON data store (server/data/db.json)');
  }
  return connection;
}

export function resetDbConnection() {
  connection = null;
}
