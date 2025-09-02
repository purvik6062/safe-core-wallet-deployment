import { MongoClient, Db, MongoClientOptions } from "mongodb";
import logger from "./logger.js";

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: MongoClient | null = null;
  private database: Db | null = null;
  private connectionUri: string;
  private databaseName: string;

  private constructor() {
    this.connectionUri =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/safe-deployment-service";
    // Extract database name from URI or use default
    const uriParts = this.connectionUri.split("/");
    this.databaseName =
      uriParts[uriParts.length - 1] || "safe-deployment-service";
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      const options: MongoClientOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
      };

      this.client = new MongoClient(this.connectionUri, options);
      await this.client.connect();
      this.database = this.client.db(this.databaseName);

      logger.info("Connected to MongoDB");

      // Create indexes after connection
      await this.createIndexes();
    } catch (error) {
      logger.error("MongoDB connection error:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.database = null;
      logger.info("Disconnected from MongoDB");
    }
  }

  public getDatabase(): Db {
    if (!this.database) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.database;
  }

  public getClient(): MongoClient {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }
    return this.client;
  }

  public isConnected(): boolean {
    return this.client !== null && this.database !== null;
  }

  public async ping(): Promise<boolean> {
    try {
      if (!this.database) return false;
      await this.database.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async createIndexes(): Promise<void> {
    try {
      if (!this.database) return;

      const safesCollection = this.database.collection("safes");

      // Create indexes for better query performance
      await safesCollection.createIndex({ "userInfo.userId": 1 });
      await safesCollection.createIndex({ "userInfo.walletAddress": 1 });
      await safesCollection.createIndex({ "deployments.address": 1 });
      await safesCollection.createIndex({ status: 1 });
      await safesCollection.createIndex({ "metadata.createdAt": -1 });
      await safesCollection.createIndex({ safeId: 1 }, { unique: true });

      logger.info("Database indexes created successfully");
    } catch (error) {
      logger.error("Error creating database indexes:", error);
      // Don't throw here as the application can still work without indexes
    }
  }
}

export default DatabaseConnection;
