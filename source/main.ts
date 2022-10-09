import type { IncomingMessage, ServerResponse } from "http";
import { createServer as createHTTPServer } from "http";

const protocolVersion = 1;

function requestHandler(request:IncomingMessage, response: ServerResponse) {
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

function createServer(port: number) {
  const server = createHTTPServer(requestHandler);
  server.listen(port);
  return server;
}

createServer(8080);