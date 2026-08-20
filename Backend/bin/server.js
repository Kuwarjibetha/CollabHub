const cluster = require("cluster");
const os = require("os");
const totalcpu = os.cpus().length
console.log(totalcpu); 