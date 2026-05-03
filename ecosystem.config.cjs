module.exports = {
  apps: [
    {
      name: "natetodos-api",
      script: "bun",
      args: "server.ts",
      cwd: ".",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "natetodos-web",
      script: "bun",
      args: "run preview -- --host 127.0.0.1 --port 4173",
      cwd: ".",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
