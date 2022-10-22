# LibreVote server

A simple server implementation for LibreVote voting system. Designed in mind to support multiple protocol versions in the future
(and keep the backwards compatibility whenever it is possible). Currently experimental and not fully prepared for production
enviroments

Server currently uses a future-proof APIs of Node like `util.parseArgs`, therefore it is advised to use the current release of Node
rather than LTS.

## Communication with the client

### Web protocols used for the communication.

For communication, we currently use HTTP. We have chosen it over HTTPS to make testing our software easier, without the need of
setting up the certificates (either by self-signing or by CA). For production enviroments, it would be prepared to use HTTPS
instead.

### API endpoints

All of the endpoints requires from the client to pass the correct `Authorization` header (TODO). As of the API enpoints, these
endpoints are currently supported on the server:

- **GET: `/api/{version}/candidate`**

This endpoint is used by clients to retrieve the information about the *candidates* – anything or anyone being voted on. The
information send back to client is an array of strings – a name of the thing currently being voted on. The message is included
in the `BODY` of the HTTP packet.

The plans are (for API version `v2`) that returned information will be an array of objects, to be able to include the description
as well as any additional information (outside of the name) about thing or a person being voted on. There are also a few concepts
about a message formatting – we haven't decided yet in which format string should be formatted, but I myself would propose the
use of Markdown or eventually HTML (with some tags being blacklisted, using XSS sanitizer like `DOMPurify` on both client and server
sides) for that purpose.

- **POST: `/api/{version}/vote`**

This endpoint is used to vote on something or someone by the client. Returns the status as both HTTP status and inside of the
body.

Example body structure:
```json
{
  "candidate" : 0
}
```
