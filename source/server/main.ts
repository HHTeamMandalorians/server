/* Node.js imports */

import { createServer as createHTTPServer } from "http";
import { parseArgs } from "util";
//import { createWriteStream } from "fs";
//import { readFile, watch } from "fs/promises";

/* External module imports */

import kolor from "@spacingbat3/kolor";

/* Type imports */

import type { IncomingMessage, ServerResponse } from "http";

type protocolVersion = 1;

type endpoints = "vote";

type Request<T> = T extends "vote" ? {
  candidate: number;
} : never;

type EncodedBuffer<T> = T extends BufferEncoding ? string : Buffer;

let hosts: Record<string,number> = {};

// Set default encoding for STDOUT and STDERR to UTF-8
process.stdout.setDefaultEncoding("utf8");
process.stderr.setDefaultEncoding("utf8");

/** Used for message groups and types in `console.*` functions. */
const logger = Object.freeze({
  server: kolor.purple(kolor.bold("[SERVER]")),
  handler: kolor.yellow(kolor.bold("[HANDLER]")),
  log: kolor.bgBlue(kolor.white(kolor.bold(" i ")))+" %s "+"%s",
  warn: kolor.bgYellowBright(kolor.black(kolor.bold(" ! ")))+" %s "+kolor.yellow("%s"),
  error: kolor.bgRed(kolor.white(kolor.bold(" — ")))+" %s "+kolor.red("%s")
});

// TODO: Use `satisfies` operator when TypeScript 3.9+ will get mature enough
const argvOptions = Object.freeze({
  port: {
    type: "string",
    short: "p"
  }
} as const);

const argv = parseArgs({options: argvOptions});
const rateLimit = 10;

let port = 8080;

if(typeof argv.values.port === "string")
  port = parseInt(argv.values.port);

if(isNaN(port)) {
  console.error(logger.error, logger.server, "Invalid value of the 'port', should be an integer.");
  console.warn(logger.warn, logger.server, "Using default port (8080) instead…")
  port = 8080;
}

function isRequest<T extends endpoints>(type:T, object:unknown): object is Request<T> {
  if(typeof object !== "object" || object === null)
    return false;
  switch(type) {
    case "vote":
      if("candidate" in object && typeof (object as {candidate:unknown}).candidate === "number")
        return true;
      return false;
  }
  return false;
}

async function parseBody<T extends BufferEncoding|undefined>(request:IncomingMessage, encoding?:T) {
  let chunkArray: number[] = [];
  const listener = (chunk: Buffer) => {
    // TODO: Show chunk hash, detect UTF-8 data.
    console.log(logger.log+" (%s)", logger.handler, "Received a chunk of data", encoding ? encoding+":"+chunk.toString(encoding) : "base64:"+chunk.toString("base64"));
    chunkArray.push(...chunk);
  }
  // Gather chunks to the `chunkArray`.
  request.on("data", listener);
  return new Promise<EncodedBuffer<T>>((resolve, reject:(reason:Error)=>void) => {
    request.once("error", (error) => reject(error));
    request.once("end", () => {
      const rawData =  Buffer.from(chunkArray);
      if(encoding)
        resolve(rawData.toString(encoding) as EncodedBuffer<T>);
      else
        resolve(rawData as EncodedBuffer<T>);
    });
  });
}

async function requestHandler(request:IncomingMessage, response: ServerResponse, protocolVersion: protocolVersion) {
  const client = request.socket.address();
  if("address" in client) {
    const rate = hosts[client.address] = (hosts[client.address]??0)+1;
    if(rate > rateLimit) {
      response.writeHead(429);
      response.end();
      return;
    }
    if(rate === rateLimit)
      setTimeout(() => hosts[client.address] = 0,1000*60*2);
    response.setHeader("X-Rate-Limit",rateLimit-(hosts[client.address]??0));
  } else {
    response.writeHead(429);
    response.end();
    return;
  }
  // Handle unknown server errors
  request.on("error", (error) => {
    response.setHeader("Content-Type","application/json");
    response.writeHead(500,"Internal server error.");
    response.write(JSON.stringify({
      error: {
        name: error.name,
        description: error.message
      }
    }));
  });
  // Set response MIME type to JSON for API requests.
  if(request.url?.startsWith("/api/") === true) {
    response.setHeader("Content-Type","application/json");
    if(request.headers.authorization === undefined) {
      response.writeHead(401, "Please authenticate with USB voting card.")
      response.write(JSON.stringify({
        status: "Client is unauthorized, please set 'AUTHORIZE' header to a valid value."
      }));
      response.end();
      return; 
    }
  }
  // Handle `/api/v1 requests.
  switch(request.url) {
    case `/api/v${protocolVersion}/candidates`:
      if(request.method !== "GET") {
        response.writeHead(405,"Method not allowed, use 'GET' instead.");
        response.write(JSON.stringify({
          status: `The current URL path does not accept '${request.method??"UNKNOWN"}' method. 'GET' should be used instead.`
        }));
        response.end();
        return;
      }
      // TODO: Reading and validating data from the specific file.
      response.writeHead(200);
      response.write(JSON.stringify([]));
      response.end();
      break;
    case `/api/v${protocolVersion}/vote`:
      if(request.method !== "POST") {
        response.writeHead(405,"Method not allowed, use 'POST' instead.");
        response.write(JSON.stringify({
          status: `The current URL path does not accept '${request.method??"UNKNOWN"}' method. 'POST' should be used instead.`
        }))
        response.end();
        return;
      }
      try {
        const body = JSON.parse(await parseBody(request,"utf8"))
        if(isRequest("vote", body)) {
          response.writeHead(200,"Vote has been \"given\"!");
          response.write(JSON.stringify({status: `Vote has been \"given\" on candidate '${body.candidate}'!`}));
          response.end();
        }
      } catch {
        response.writeHead(400, "Bad request");
        response.write(JSON.stringify({status: "Invalid structure of the body in the message."}));
        response.end();
        return;
      }
      break;
    default:
      response.writeHead(404, "Not found");
      response.write(JSON.stringify({status: `Not found anything on ${request.url??"/"}, please check if URL is correct.`}));
      response.end();
      return;
  }
}

function createServer(protocol: protocolVersion, port: number) {
  // Check parameter types
  if(typeof protocol !== "number")
    throw new TypeError("The specified protocol version is not of the type 'number'.")
  if(typeof port !== "number")
    throw new TypeError("The server port is of invalid type (should be a 'number' in range: 0-65536)");
  
  // Check parameter ranges
  if(port < 0 && port > 65536)
    throw new RangeError(`Port '${port}' outside of allowed range 0-65536.`);
  if(protocol !== 1)
    throw new RangeError(`Server implementation of protocol version 'v${(protocol as number).toString()}' is currently unsupported!`);
  
  // Start server
  console.log(logger.log, logger.server, "Setting up a server of protocol version v"+protocol+".");
  const server = createHTTPServer((req,res) => requestHandler(req,res,protocol));
  server.listen(port);
  server.on("listening", () => console.log(logger.log+" %s.", logger.server, "Listening at", kolor.blue(kolor.underline(port.toString()))));
  return server;
}

createServer(1,port);