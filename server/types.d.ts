// Extend express-session SessionData to include passport
import "express-session";

declare module "express-session" {
  interface SessionData {
    passport?: {
      user: any;
    };
    [key: string]: any;
  }
}

declare module "connect-pg-simple" {
  import session from "express-session";

  interface PgSessionOptions {
    pool?: any;
    tableName?: string;
    createTableIfMissing?: boolean;
    schemaName?: string;
    pruneSessionInterval?: number | false;
    errorLog?: (...args: any[]) => void;
  }

  function connectPgSimple(
    session: typeof import("express-session"),
  ): new (options?: PgSessionOptions) => any;

  export = connectPgSimple;
}

declare module "nodemailer" {
  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  }

  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
  }

  export interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<any>;
  }

  export function createTransport(options: TransportOptions): Transporter;
}

declare module "multer" {
  import { RequestHandler } from "express";

  interface StorageEngine {
    _handleFile(req: any, file: any, callback: any): void;
    _removeFile(req: any, file: any, callback: any): void;
  }

  interface Options {
    dest?: string;
    storage?: StorageEngine;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    fileFilter?(req: any, file: any, callback: any): void;
  }

  interface DiskStorageOptions {
    destination?: string | ((req: any, file: any, callback: any) => void);
    filename?(req: any, file: any, callback: any): void;
  }

  interface Field {
    name: string;
    maxCount?: number;
  }

  interface Multer {
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: Field[]): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  }

  function multer(options?: Options): Multer;

  namespace multer {
    function diskStorage(options: DiskStorageOptions): StorageEngine;
    function memoryStorage(): StorageEngine;
    type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;
  }

  export = multer;
}

declare module "web-push" {
  export interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface RequestOptions {
    headers?: Record<string, string>;
    gcmAPIKey?: string;
    vapidDetails?: {
      subject: string;
      publicKey: string;
      privateKey: string;
    };
    TTL?: number;
    contentEncoding?: string;
    proxy?: string;
    agent?: any;
    timeout?: number;
  }

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function generateVAPIDKeys(): VapidKeys;
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: RequestOptions,
  ): Promise<any>;
}

// Extend Express Request to include session and file
declare global {
  namespace Express {
    interface Request {
      session: import("express-session").Session;
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }

    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}
