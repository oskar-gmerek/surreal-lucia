# SurrealDB Adapter for Lucia

This adapter seamlessly integrates SurrealDB with Lucia, providing a robust and easy-to-use authentication solution for modern applications.

## Modern Technology

### SurrealDB
- [SurrealDB Official Website](https://surrealdb.com)
    - [SurrealDB Documentation](https://docs.surrealdb.com)
- [SurrealDB Github Repository](https://github.com/surrealdb/surrealdb)
    - [SurrealDB Javascript SDK Repository](https://github.com/surrealdb/surrealdb.js)

### Lucia auth
- [Lucia Documentation](https://lucia-auth.com)
 - [Lucia Github Repository](https://github.com/lucia-auth/lucia)

## Requirements
> [!NOTE]  
> Package installation examples use bun as the package manager, but you can replace bun with npm, yarn, pnpm, or deno.

- [SurrealDB](https://surrealdb.com) `^1.4.2`
- [SurrealDB Javascript SDK](https://github.com/surrealdb/surrealdb.js) `^1.0.0-beta.9`
  ```bash
  bun add surrealdb.js
  ```
- [Lucia](https://lucia-auth.com) `~3.2.0`
  ```bash
  bun add lucia
  ```
- [Typescript](https://www.typescriptlang.org) `^5.5.2`
  ```bash
  bun add typescript
  ```

## Installation

> [!NOTE]  
> Depending on your package manager, you can replace bunx with npx, yarn dlx, pnpm dlx, or use deno add.

```bash
bunx jsr add @oskargmerek/surreal-lucia
```

## Setup Example

> [!IMPORTANT]  
> This example shows how to implement a SurrealDB adapter for Lucia. It is not an example of the full authentication, nor authorization setup. You should be familiar with the Lucia documentation, which contains a framework-specific guides. Read the [Lucia Documentation](https://lucia-auth.com/getting-started/) for more information.

```typescript
import { Lucia } from "lucia";
import { SurrealDBLuciaAdapter } from "@oskargmerek/surreal-lucia";

// initialize SurrealDB
const db = new Surreal(); 

// initialize adapter
const adapter = new SurrealDBLuciaAdapter(db, {
  sessionTableName: 'sessions', 
  userTableName: 'users', 
}); 

// initialize Lucia with SurrealDB adapter
export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: process.env.NODE_ENV === "production"
		}
	}
});

// IMPORTANT!
declare module "lucia" {
    interface Register {
      DatabaseUserAttributes: {
        username: string; // example of an additional optional attribute
      },
      DatabaseSessionAttributes: {
        device: string // example of an additional optional attribute
    }
  }
}

```

## Documentation

- [Documentation | SurrealDB Adapter for Lucia](https://jsr.io/@oskargmerek/surreal-lucia/doc)


## License
This adapter is distributed under the `MIT License`. Please refer to the `LICENSE` file for more information.