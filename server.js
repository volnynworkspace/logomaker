process.chdir(__dirname);
process.env.NODE_ENV = "production";
require("next/dist/bin/next-start");
