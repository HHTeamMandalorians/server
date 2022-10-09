// Node.js imports
import { createServer as createHTTPServer } from "http";
// External module imports
import kolor from "@spacingbat3/kolor";
// Type imports
import type { IncomingMessage, ServerResponse } from "http";

type protocolVersion = 1;

/** Used for message groups in `console.log`. */
const logger = {
  server: kolor.purple(kolor.bold("[SERVER]")),
  handler: kolor.yellow(kolor.bold("[HANDLER]"))
}

function teapotError(res:ServerResponse) {
  res.writeHead(418,"I'm a teapot!");
  res.write(JSON.stringify({status: "Cannot brew ☕️ with a 🫖️!"}));
  res.end();
}

function requestHandler(request:IncomingMessage, response: ServerResponse, protocolVersion: protocolVersion) {
  // Set response MIME type to JSON.
  response.setHeader("Content-Type","application/json");
  // Handle `/api/v1/send` requests.
  if(request.method === "POST" && request.url === `/api/v${protocolVersion}/send`) {
    let chunkArray: number[] = [];
    // Gather chunks to the `chunkArray`.
    request.on("data", (chunk: Buffer) => {
      // TODO: Show chunk hash, detect UTF-8 data.
      console.log("%s Received a chunk of data (0x%s).", logger.handler, chunk.toString("hex"));
      chunkArray.push(...chunk);
    });
    // Handle request once message has been fully sent.
    request.on("end", () => {
      try {
        // Parse chunk array to JSON
        const parsedChunk:Record<string,string|number|undefined> = JSON.parse(Buffer.from(chunkArray).toString());
        // Get values from JSON record
        const {candidate} = parsedChunk;
        // Verify types
        if(typeof candidate !== "number")
          throw new TypeError("Invalid body type!");
        // Proceed with the voting
        response.writeHead(201,"Vote has been given!");
        response.write(JSON.stringify({status: `Vote has been given on candidate '${candidate}'!`}));
        response.end();
      } catch {
        // TODO: Error for invalid messages
        teapotError(response);
      }
    });
    // Teapot error!
    request.on("error", () => teapotError(response));
  } else {
    // TODO: Error for invalid URIs
    teapotError(response);
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
  console.log("%s Setting up a server of protocol version v%s.", logger.server, protocol);
  const server = createHTTPServer((req,res) => requestHandler(req,res,protocol));
  server.listen(port);
  server.on("listening", () => console.log("%s Listening at %s.", logger.server, kolor.blue(kolor.underline(port.toString()))));
  return server;
}

createServer(1,8080);