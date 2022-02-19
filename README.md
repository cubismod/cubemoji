# cubemoji
A Discord emoji bot, written in Node JS!.
---
This bot uses TypeScript and Node.JS to perform fun image effects. Type / in chat to get an idea of the commands available. Browse here for source code.

Execution
---------
- `npm run build` to build the JS from TypeScript in the `build/` subdirectory
- `npm start` to run the built JS files
- `npm run test` to run through unit tests
- `npm run dev` to use the [tsc-watch](https://www.npmjs.com/package/tsc-watch) package to rebuild the software in real-time while testing features.
- Docker
  - This bot is intended to be run using Docker. My own docker-compose.yml file is included which is what I use to execute the bot on my Pi.

Backend Storage
---------------
Cubemoji uses [Keyv](https://www.npmjs.com/package/keyv) w/ the [keyv-file](https://github.com/zaaack/keyv-file) adapter for persistent storage. These files are saved to data/ subdirectory which can then be mapped to an external folder in Docker-Compose.

Secrets
-------
The bot utilizes environment variables for secrets. An example can be found at example.env