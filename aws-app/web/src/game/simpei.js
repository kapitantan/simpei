// Keep the AWS front end on the same rules implementation as the main app.
// Vite bundles this module into static assets, so the deployed site has no
// runtime dependency on the repository layout.
export * from "../../../../src/game/simpei.js";
