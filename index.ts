import { Console, Effect, pipe } from "effect";
import { Hono } from "hono";
import { Database } from "bun:sqlite";

interface Note {
  id: number;
  content: string;
}

const db = new Database();
db.query(
  "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, content TEXT UNIQUE)"
).all();

const app = new Hono();

app.post("/notes", async (c) => {
  return Effect.runPromise(
    pipe(
      Effect.tryPromise(() => c.req.json<{ content: string }>()),
      Effect.tryMap({
        try: ({ content }) => {
          return db.query("INSERT INTO notes (content) VALUES ($content)").all({
            $content: content,
          });
        },
        catch: (e) => {
          return pipe(Console.log(e), Effect.fail);
        },
      }),
      Effect.tryMap({
        try: () => {
          return db.query("SELECT * FROM notes").all();
        },
        catch: (e) => {
          return pipe(Console.log(e), Effect.fail);
        },
      }),
      Effect.match({
        onSuccess: (result) => {
          c.status(201);
          return c.json(result);
        },
        onFailure: () => {
          c.status(500);
          return c.text("Error creating note");
        },
      })
    )
  );
});

app.get("/notes", async (c) => {
  return Effect.runPromise(
    pipe(
      Effect.try(() => {
        return db.query("SELECT * FROM notes").all() as Note[];
      }),
      Effect.match({
        onSuccess: (result) => {
          c.status(200);
          return c.json(result);
        },
        onFailure: (e) => {
          Effect.runFork(Console.error(e));
          c.status(500);
          return c.text("Error getting notes");
        },
      })
    )
  );
});

app.delete("/notes", async (c) => {
  return Effect.runPromise(
    pipe(
      Effect.try(() => {
        return db.query("DELETE FROM notes").all();
      }),
      Effect.match({
        onSuccess: () => {
          c.status(200);
          return c.text("Notes deleted successfully");
        },
        onFailure: (e) => {
          Effect.runFork(Console.error(e));
          c.status(500);
          return c.text("Error deleting notes");
        },
      })
    )
  );
});

app.get("/notes/:id", async (c) => {
  return Effect.runPromise(
    pipe(
      Effect.try(() => c.req.param("id")),
      Effect.map((id) => {
        return db
          .query("SELECT * FROM notes where notes.id = $id LIMIT 1")
          .all({ $id: id }) as Note[];
      }),
      Effect.match({
        onSuccess: (result) => {
          c.status(200);
          return c.json(result);
        },
        onFailure: (e) => {
          Effect.runFork(Console.error(e));
          c.status(500);
          return c.text("Error getting note");
        },
      })
    )
  );
});

app.delete("/notes/:id", async (c) => {
  return Effect.runPromise(
    pipe(
      Effect.try(() => {
        return db
          .query("DELETE FROM notes where id = $id")
          .all({ $id: c.req.param("id") });
      }),
      Effect.match({
        onSuccess: () => {
          c.status(200);
          return c.text("Notes deleted successfully");
        },
        onFailure: (e) => {
          Effect.runFork(Console.error(e));
          c.status(500);
          return c.text("Error deleting notes");
        },
      })
    )
  );
});

export default app;
