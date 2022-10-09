// Node.js imports
import { createServer as createHTTPServer } from "http";
// External module imports
import kolor from "@spacingbat3/kolor";
// Type imports
import type { IncomingMessage, ServerResponse } from "http";

type protocolVersion = 1;

const logger = {
  server: kolor.purple(kolor.bold("[SERVER]"))
}

function requestHandler(request:IncomingMessage, response: ServerResponse, protocolVersion: protocolVersion) {
  response.setHeader("Content-Type","application/json");
  if(request.method === "POST" && request.url === `/api/v${protocolVersion}/send`) {
    response.writeHead(201,"Vote has been given on nobody!");
    response.write(JSON.stringify({message:"Hello world!"}));
  } else {
    response.writeHead(418,"I'm a teapot!");
    response.write(JSON.stringify({message:"Cannot brew ☕️ with a 🫖️!"}));
  }
  response.end();
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
  console.log("%s Setting up a server of protocol version v%s.", logger.server, protocol);
  const server = createHTTPServer((req,res) => requestHandler(req,res,protocol));
  server.listen(port);
  server.on("listening", () => console.log("%s Listening at %s.", logger.server, kolor.blue(kolor.underline(port.toString()))));
  return server;
}

createServer(1,8080);