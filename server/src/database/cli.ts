// pnpm's hoisted layout leaves no server/node_modules/typeorm, so scripts cannot point at
// ./node_modules/typeorm/cli.js. This shim lets `tsx src/database/cli.ts <command>` run the
// TypeORM CLI with TypeScript support for data-source.ts and the entities.
import 'typeorm/cli.js';
