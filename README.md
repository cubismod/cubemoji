# cubemoji
A Discord emoji bot, written in Node JS!.
---
This bot uses TypeScript and Node.JS to perform fun image effects. Type / in chat to get an idea of the commands available. Browse here for source code.

Environment Setup
-----------------
- We use [NVM](https://github.com/nvm-sh/nvm) for version management. Type `nvm use` to use the correct version of Node. [.nvmrc](https://gitlab.com/cubismod/cubemoji/-/blob/main/.nvmrc) includes the latest version of Node.js we are targeting. I use [vsc-nvm](https://marketplace.visualstudio.com/items?itemName=henrynguyen5-vsc.vsc-nvm) in VSCode to auto load the correct version of Node in new terminals.
- Yarn is used for package management. Type `corepack enable` to get yarn working. 
- [Canvas](https://www.npmjs.com/package/canvas) may require additional system dependencies, please see that linked page for more information.

Execution
---------
- `npm run build` to build the JS from TypeScript in the `build/` subdirectory
- `npm start` to run the built JS files
- `npm run test` to run through unit tests
- `npm run dev` to use the [tsc-watch](https://www.npmjs.com/package/tsc-watch) package to rebuild the software in real-time while testing features.

Fly.io
-------
Cubemoji uses https://fly.io/ for cheap hosting.

Backend Storage
---------------
Cubemoji uses [Keyv](https://www.npmjs.com/package/keyv) w/ the [keyv-file](https://github.com/zaaack/keyv-file) adapter for persistent storage as well as the built-in sqlite storage. These files are saved to data/ subdirectory which can then be mapped to an external folder in Docker-Compose.

Secrets
-------
The bot utilizes environment variables for secrets. An example can be found at example.env
