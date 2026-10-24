const mysql = require("mysql2/promise");
const fs = require("fs");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter Railway MySQL password: ", async (password) => {
    rl.close();

    try {
        console.log("Connecting to Railway MySQL...");

        const connection = await mysql.createConnection({
            host: "yamanote.proxy.rlwy.net",
	    port: 34241,
            user: "root",
            password: password,
            database: "railway",
            multipleStatements: true
        });

        console.log("Connected successfully!");

        const sql = fs.readFileSync(
            "C:\\MovieBooking\\movie_booking.sql",
            "utf8"
        );

        console.log("Importing database...");

        await connection.query(sql);

        console.log("================================");
        console.log("DATABASE IMPORT SUCCESSFUL!");
        console.log("================================");

        await connection.end();

    } catch (error) {
        console.error("IMPORT FAILED:");
        console.error(error.message);
    }
});