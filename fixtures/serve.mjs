import http from "node:http";
import { fileURLToPath } from "node:url";

// 1x1 68-byte transparent PNG for image responses
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

export function createServer4101() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <link rel="icon" href="data:,">
  <script src="http://127.0.0.1:4199/plqa-dead.js"></script>
  <script>
    console.error("PLQA_CANARY_CONSOLE");
  </script>
</head>
<body>
  <h1>V1 Vulnerable Fixture</h1>
  <img src="/plqa-img1.png">
  <img src="/plqa-img2.png">
  <img src="/plqa-missing.png" alt="missing asset">
  <form>
    <input type="text" name="unlabelled_field">
  </form>
  <nav>
    <a href="#">Dead 1</a>
    <a href="">Dead 2</a>
    <a href="javascript:void(0)">Dead 3</a>
  </nav>
</body>
</html>`);
      return;
    }

    if (url.pathname === "/status-500") {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <link rel="icon" href="data:,">
  <title>500 Internal Server Error</title>
</head>
<body>
  <h1>Server Error 500</h1>
</body>
</html>`);
      return;
    }

    if (url.pathname === "/plqa-img1.png" || url.pathname === "/plqa-img2.png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(PNG_1X1);
      return;
    }

    if (url.pathname === "/plqa-missing.png") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  });
}

export function createServer4102() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clean Fixture Page C1</title>
  <meta name="description" content="This is a clean page fixture with zero bugs and zero needs_review.">
  <link rel="icon" href="data:,">
</head>
<body>
  <h1>Clean Page</h1>
  <img src="/clean-logo.png" alt="Clean Company Logo">
  <form>
    <label for="clean-field">Clean Field</label>
    <input type="text" id="clean-field" name="clean_field">
  </form>
  <p>
    <a href="/clean-target">Valid Link</a>
  </p>
</body>
</html>`);
      return;
    }

    if (url.pathname === "/clean-logo.png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(PNG_1X1);
      return;
    }

    if (url.pathname === "/clean-target") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clean Target</title>
  <link rel="icon" href="data:,">
</head>
<body>
  <h1>Valid Destination</h1>
</body>
</html>`);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  });
}

export async function startServers() {
  const s4101 = createServer4101();
  const s4102 = createServer4102();

  await Promise.all([
    new Promise((resolve) => s4101.listen(4101, "127.0.0.1", resolve)),
    new Promise((resolve) => s4102.listen(4102, "127.0.0.1", resolve)),
  ]);

  return {
    server4101: s4101,
    server4102: s4102,
    close: async () => {
      await Promise.all([
        new Promise((resolve) => s4101.close(resolve)),
        new Promise((resolve) => s4102.close(resolve)),
      ]);
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const servers = await startServers();
  console.log("Fixture servers running on http://127.0.0.1:4101 and http://127.0.0.1:4102");
  process.on("SIGINT", async () => {
    await servers.close();
    process.exit(0);
  });
}
