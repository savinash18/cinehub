require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const session = require("express-session");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const path = require("path");

const app = express();


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: "cinehub-secret",
        resave: false,
        saveUninitialized: false
    })
);

app.use(express.static("Public"));


// ==================================================
// REGISTER HTML FIX
// ==================================================

app.get("/register.html/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "Public", "register.html")
    );
});


// ==================================================
// EMAIL
// ==================================================

const resend = new Resend(process.env.RESEND_API_KEY);

// ==================================================
// MYSQL
// ==================================================

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});


// ==================================================
// MYSQL CONNECT
// ==================================================

db.connect((err) => {

    if (err) {
        console.log("MySQL connection failed!");
        console.log(err);
        return;
    }

    console.log("MySQL connected successfully!");

    setupDatabase();

});


// ==================================================
// DATABASE SETUP
// ==================================================

function setupDatabase() {

    // ==================================================
    // USERS
    // ==================================================

    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
        )
    `, (err) => {

        if (err) {
            console.log("Users table error:", err);
        } else {
            console.log("Users table ready!");
        }

    });


    // ==================================================
    // MOVIES
    // ==================================================

    db.query(`
        CREATE TABLE IF NOT EXISTS movies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            poster VARCHAR(500),
            genre VARCHAR(100)
        )
    `, (err) => {

        if (err) {
            console.log("Movies table error:", err);
        } else {
            console.log("Movies table ready!");
            console.log("Using existing movies from database.");
        }

    });


    // ==================================================
    // THEATRES / SCREENS
    // ==================================================

    db.query(`
        CREATE TABLE IF NOT EXISTS theatres (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL,
            city VARCHAR(100) NOT NULL
        )
    `, (err) => {

        if (err) {

            console.log(
                "Theatres table error:",
                err
            );

        } else {

            console.log(
                "Theatres table ready!"
            );

            addScreens();

        }

    });


    // ==================================================
    // SHOWS
    // ==================================================

    db.query(`
        CREATE TABLE IF NOT EXISTS shows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            theatre_id INT NOT NULL,
            show_date DATE NULL,
            show_time VARCHAR(20) NOT NULL,
            variation VARCHAR(10) NOT NULL DEFAULT '2D',

            FOREIGN KEY (movie_id)
                REFERENCES movies(id)
                ON DELETE CASCADE,

            FOREIGN KEY (theatre_id)
                REFERENCES theatres(id)
                ON DELETE CASCADE
        )
    `, (err) => {

        if (err) {

            console.log(
                "Shows table error:",
                err
            );

        } else {

            console.log(
                "Shows table ready!"
            );

            addShowDateColumn();
            addVariationColumn();

        }

    });


    // ==================================================
    // SEATS
    // ==================================================

    db.query(`
        CREATE TABLE IF NOT EXISTS seats (
            id INT AUTO_INCREMENT PRIMARY KEY,

            theatre_id INT NOT NULL,

            seat_row CHAR(1) NOT NULL,

            seat_number INT NOT NULL,

            seat_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR',

            FOREIGN KEY (theatre_id)
                REFERENCES theatres(id)
                ON DELETE CASCADE,

            UNIQUE KEY unique_theatre_seat
                (theatre_id, seat_row, seat_number)
        )
    `, (err) => {

        if (err) {

            console.log(
                "Seats table error:",
                err
            );

        } else {

            console.log(
                "Seats table ready!"
            );

            createSeatsForScreens();

        }

    });


    // ==================================================
    // BOOKINGS
    // ==================================================

    db.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,

            booking_reference VARCHAR(50) NOT NULL,

            user_id INT NULL,

            show_id INT NOT NULL,

            seat_id INT NOT NULL,

            amount DECIMAL(10,2) NOT NULL,

            payment_method VARCHAR(20) NOT NULL,

            payment_status VARCHAR(20)
                NOT NULL DEFAULT 'SUCCESS',

            booked_at DATETIME
                NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (show_id)
                REFERENCES shows(id)
                ON DELETE CASCADE,

            FOREIGN KEY (seat_id)
                REFERENCES seats(id)
                ON DELETE CASCADE,

            UNIQUE KEY unique_show_seat
                (show_id, seat_id)
        )
    `, (err) => {

        if (err) {

            console.log(
                "Bookings table error:",
                err
            );

        } else {

            console.log(
                "Bookings table ready!"
            );

        }

    });

}


// ==================================================
// ADD SHOW DATE COLUMN
// ==================================================

function addShowDateColumn() {

    db.query(`
        ALTER TABLE shows
        ADD COLUMN show_date DATE NULL
    `, (err) => {

        if (err) {

            if (
                err.message.toLowerCase().includes(
                    "duplicate column"
                )
            ) {

                console.log(
                    "Show date column already exists!"
                );

            } else {

                console.log(
                    "Show date column check:",
                    err.message
                );

            }

        } else {

            console.log(
                "Show date column added!"
            );

        }

        setDefaultShowDates();

    });

}


// ==================================================
// ADD VARIATION COLUMN
// ==================================================

function addVariationColumn() {

    db.query(`
        ALTER TABLE shows
        ADD COLUMN variation VARCHAR(10)
        NOT NULL DEFAULT '2D'
    `, (err) => {

        if (err) {

            if (
                err.message.toLowerCase().includes(
                    "duplicate column"
                )
            ) {

                console.log(
                    "Variation column already exists!"
                );

            } else {

                console.log(
                    "Variation column check:",
                    err.message
                );

            }

        } else {

            console.log(
                "Variation column added!"
            );

        }

    });

}


// ==================================================
// ADD SCREENS
// ==================================================

function addScreens() {

    const screens = [

        {
            name: "Screen 1",
            location: "CineHub Theatre",
            city: "Tadepalligudem"
        },

        {
            name: "Screen 2",
            location: "CineHub Theatre",
            city: "Tadepalligudem"
        },

        {
            name: "Screen 3",
            location: "CineHub Theatre",
            city: "Tadepalligudem"
        },

        {
            name: "Screen 4",
            location: "CineHub Theatre",
            city: "Tadepalligudem"
        },

        {
            name: "Screen 5",
            location: "CineHub Theatre",
            city: "Tadepalligudem"
        }

    ];


    screens.forEach((screen) => {

        db.query(
            `
            INSERT INTO theatres
                (name, location, city)

            SELECT ?, ?, ?

            WHERE NOT EXISTS (

                SELECT 1
                FROM theatres
                WHERE name = ?

            )
            `,
            [
                screen.name,
                screen.location,
                screen.city,
                screen.name
            ],
            (err) => {

                if (err) {

                    console.log(
                        "Screen insert error:",
                        err
                    );

                }

            }
        );

    });

}


// ==================================================
// SET DEFAULT SHOW DATES
// ==================================================
// ==================================================
// SET SHOW DATES FOR NEXT 7 DAYS
// ==================================================

function setDefaultShowDates() {

    // Assign today's date to existing shows
    // that don't have a date
    const updateSql = `
        UPDATE shows
        SET show_date = CURDATE()
        WHERE show_date IS NULL
    `;

    db.query(updateSql, (err) => {

        if (err) {
            console.log(
                "Show date update error:",
                err
            );
            return;
        }

        console.log(
            "Existing show dates updated."
        );

        // Create the same shows for the
        // next 6 days.
        //
        // Today + 6 days = 7 dates total
        //
        // Example:
        // Sept 8
        // Sept 9
        // Sept 10
        // Sept 11
        // Sept 12
        // Sept 13
        // Sept 14

        const createDatesSql = `
            INSERT INTO shows
            (
                movie_id,
                theatre_id,
                show_date,
                show_time,
                variation
            )

            SELECT
                s.movie_id,
                s.theatre_id,
                DATE_ADD(
                    CURDATE(),
                    INTERVAL d.day DAY
                ),
                s.show_time,
                s.variation

            FROM shows s

            CROSS JOIN (
                SELECT 1 AS day
                UNION ALL
                SELECT 2
                UNION ALL
                SELECT 3
                UNION ALL
                SELECT 4
                UNION ALL
                SELECT 5
                UNION ALL
                SELECT 6
            ) d

            WHERE s.show_date = CURDATE()

            AND NOT EXISTS (
                SELECT 1
                FROM shows existing

                WHERE existing.movie_id =
                    s.movie_id

                AND existing.theatre_id =
                    s.theatre_id

                AND existing.show_date =
                    DATE_ADD(
                        CURDATE(),
                        INTERVAL d.day DAY
                    )

                AND existing.show_time =
                    s.show_time

                AND existing.variation =
                    s.variation
            )
        `;

        db.query(
            createDatesSql,
            (dateErr, result) => {

                if (dateErr) {

                    console.log(
                        "Future show dates error:",
                        dateErr
                    );

                    return;
                }

                console.log(
                    "Future show dates created:",
                    result.affectedRows
                );
            }
        );
    });
}


// ==================================================
// CREATE SEATS FOR ALL SCREENS
// ==================================================

function createSeatsForScreens() {

    db.query(
        `
        SELECT id
        FROM theatres
        WHERE name IN
        ('Screen 1',
         'Screen 2',
         'Screen 3',
         'Screen 4',
         'Screen 5')
        ORDER BY id
        `,
        (err, screens) => {

            if (err) {

                console.log(
                    "Screen lookup error:",
                    err
                );

                return;
            }


            screens.forEach((screen) => {

                const rows = [
                    "A",
                    "B",
                    "C",
                    "D",
                    "E",
                    "F",
                    "G",
                    "H",
                    "I",
                    "J",
                    "K"
                ];


                rows.forEach((row) => {

                    for (
                        let number = 1;
                        number <= 20;
                        number++
                    ) {

                        const seatType =
                            (
                                row === "A" ||
                                row === "K"
                            )
                                ? "RECLINER"
                                : "REGULAR";


                        db.query(
                            `
                            INSERT INTO seats
                                (
                                    theatre_id,
                                    seat_row,
                                    seat_number,
                                    seat_type
                                )

                            VALUES (?, ?, ?, ?)

                            ON DUPLICATE KEY UPDATE
                                seat_type = VALUES(seat_type)
                            `,
                            [
                                screen.id,
                                row,
                                number,
                                seatType
                            ],
                            (seatErr) => {

                                if (seatErr) {

                                    console.log(
                                        "Seat insert error:",
                                        seatErr
                                    );

                                }

                            }
                        );

                    }

                });

            });

        }
    );

}


// ==================================================
// CHECK LOGIN
// ==================================================

app.get(
    "/api/check-login",
    (req, res) => {

        if (req.session.user) {

            res.json({
                loggedIn: true
            });

        } else {

            res.json({
                loggedIn: false
            });

        }

    }
);


// ==================================================
// REGISTER
// ==================================================

app.post(
    "/register",
    async (req, res) => {

        const {
            name,
            email,
            password
        } = req.body;


        if (
            !name ||
            !email ||
            !password
        ) {

            return res.send(
                "Please fill all fields"
            );

        }


        try {

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const sql = `
                INSERT INTO users
                    (name, email, password)
                VALUES
                    (?, ?, ?)
            `;


            db.query(
                sql,
                [
                    name,
                    email,
                    hashedPassword
                ],
                (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect(
                            "/register.html?error=email"
                        );

                    }


                    res.redirect(
                        "/register.html?success=1"
                    );

                }
            );

        } catch (error) {

            console.log(error);

            res.send(
                "Registration error"
            );

        }

    }
);


// ==================================================
// LOGIN
// ==================================================

app.post(
    "/login",
    (req, res) => {

        const {
            email,
            password
        } = req.body;


        const sql =
            "SELECT * FROM users WHERE email = ?";


        db.query(
            sql,
            [email],
            async (err, results) => {

                if (err) {

                    console.log(err);

                    return res.send(
                        "Database error"
                    );

                }


                if (
                    results.length === 0
                ) {

                    return res.redirect(
                        "/login.html?error=1"
                    );

                }


                const user =
                    results[0];


                try {

                    const match =
                        await bcrypt.compare(
                            password,
                            user.password
                        );


                    if (!match) {

                        return res.redirect(
                            "/login.html?error=1"
                        );

                    }


                    req.session.user = {

                        id:
                            user.id,

                        name:
                            user.name,

                        email:
                            user.email

                    };


                    res.redirect(
                        "/index.html"
                    );

                } catch (error) {

                    console.log(error);

                    res.send(
                        "Login error"
                    );

                }

            }
        );

    }
);


// ==================================================
// FORGOT PASSWORD
// ==================================================

app.post(
    "/forgot-password",
    (req, res) => {

        const {
            email
        } = req.body;


        if (!email) {

            return res.send(
                "Please enter your email"
            );

        }


        const sql =
            "SELECT * FROM users WHERE email = ?";


        db.query(
            sql,
            [email],
            async (err, results) => {

                if (err) {

                    console.log(err);

                    return res.send(
                        "Database error"
                    );

                }


                if (
                    results.length === 0
                ) {

                    return res.redirect(
                        "/forgot-password.html?error=1"
                    );

                }


                const otp =
                    Math.floor(
                        100000 +
                        Math.random() *
                        900000
                    ).toString();


                req.session.resetEmail =
                    email;

                req.session.resetOTP =
                    otp;

                req.session.otpExpires =
                    Date.now() +
                    10 * 60 * 1000;


                const mailOptions = {

                    from:
                        process.env.EMAIL_USER,

                    to:
                        email,

                    subject:
                        "CineHub Password Reset Code",

                    text:
                        `Your CineHub password reset verification code is: ${otp}\n\n` +
                        `This code will expire in 10 minutes.`

                };


               try {
    const { data, error } = await resend.emails.send({
        from: "CineHub <onboarding@resend.dev>",
        to: email,
        subject: "CineHub Password Reset Code",
        text:
            `Your CineHub password reset verification code is: ${otp}\n\n` +
            `This code will expire in 10 minutes.`
    });

    if (error) {
        console.log("Resend email error:");
        console.log(error);

        return res.send("Unable to send verification email");
    }

    console.log("OTP sent to:", email);
    console.log("Email ID:", data.id);

    res.redirect("/forgot-password.html?sent=1");

} catch (error) {
    console.log("Resend email error:");
    console.log(error);

    res.send("Unable to send verification email");
}

            }
        );

    }
);


// ==================================================
// VERIFY OTP
// ==================================================

app.post(
    "/verify-otp",
    (req, res) => {

        const {
            otp
        } = req.body;


        if (
            !req.session.resetOTP
        ) {

            return res.redirect(
                "/forgot-password.html?error=nootp"
            );

        }


        if (
            Date.now() >
            req.session.otpExpires
        ) {

            delete req.session.resetOTP;
            delete req.session.otpExpires;

            return res.redirect(
                "/forgot-password.html?error=expired"
            );

        }


        if (
            otp !==
            req.session.resetOTP
        ) {

            return res.redirect(
                "/forgot-password.html?error=wrongotp"
            );

        }


        req.session.otpVerified =
            true;

        delete req.session.resetOTP;
        delete req.session.otpExpires;


        res.redirect(
            "/forgot-password.html?verified=1"
        );

    }
);


// ==================================================
// RESET PASSWORD
// ==================================================

app.post(
    "/reset-password",
    async (req, res) => {

        const {
            password,
            confirmPassword
        } = req.body;


        if (
            !req.session.otpVerified ||
            !req.session.resetEmail
        ) {

            return res.redirect(
                "/forgot-password.html?error=notverified"
            );

        }


        if (
            !password ||
            !confirmPassword
        ) {

            return res.redirect(
                "/forgot-password.html?error=empty"
            );

        }


        if (
            password !==
            confirmPassword
        ) {

            return res.redirect(
                "/forgot-password.html?error=mismatch"
            );

        }


        if (
            password.length < 6
        ) {

            return res.redirect(
                "/forgot-password.html?error=short"
            );

        }


        try {

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const sql = `
                UPDATE users

                SET password = ?

                WHERE email = ?
            `;


            db.query(
                sql,
                [
                    hashedPassword,
                    req.session.resetEmail
                ],
                (err, result) => {

                    if (err) {

                        console.log(err);

                        return res.send(
                            "Database error while resetting password"
                        );

                    }


                    if (
                        result.affectedRows === 0
                    ) {

                        return res.send(
                            "Unable to update password"
                        );

                    }


                    delete req.session.resetEmail;
                    delete req.session.otpVerified;


                    res.redirect(
                        "/login.html?reset=1"
                    );

                }
            );

        } catch (error) {

            console.log(error);

            res.send(
                "Password reset error"
            );

        }

    }
);


// ==================================================
// USER INFORMATION
// ==================================================

app.get(
    "/user",
    (req, res) => {

        if (req.session.user) {

            res.json({
                loggedIn: true,
                user:
                    req.session.user
            });

        } else {

            res.json({
                loggedIn: false
            });

        }

    }
);


// ==================================================
// LOGOUT
// ==================================================

app.get(
    "/logout",
    (req, res) => {

        req.session.destroy(() => {

            res.redirect(
                "/login.html"
            );

        });

    }
);


// ==================================================
// GET ALL MOVIES
// ==================================================

app.get(
    "/api/movies",
    (req, res) => {

        const sql = `
            SELECT *
            FROM movies
            WHERE id IN (5, 6, 7, 8)
            ORDER BY id
        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Error getting movies:",
                        err
                    );

                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to get movies"
                        });

                }


                res.json(results);

            }
        );

    }
);


// ==================================================
// GET MOVIE SHOWS
// ==================================================

app.get(
    "/api/movies/:id/shows",
    (req, res) => {

        const movieId =
            req.params.id;


        const sql = `
            SELECT
                movies.id AS movie_id,
                movies.title,
                movies.description,
                movies.poster,
                movies.genre,

                shows.id AS show_id,
                shows.variation,

                theatres.id AS screen_id,
                theatres.name AS screen_name,
                theatres.city,

                shows.show_time,
                shows.show_date

            FROM movies

            JOIN shows
                ON movies.id = shows.movie_id

            JOIN theatres
                ON shows.theatre_id = theatres.id

            WHERE
                movies.id = ?

                AND
                (
                    shows.show_date > CURDATE()

                    OR

                    (
                        shows.show_date = CURDATE()

                        AND

                        STR_TO_DATE(
                            shows.show_time,
                            '%h:%i %p'
                        ) > CURTIME()
                    )
                )

            ORDER BY
                shows.show_date,
                shows.variation,
                theatres.id,
                STR_TO_DATE(
                    shows.show_time,
                    '%h:%i %p'
                )

        `;


        db.query(
            sql,
            [movieId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Shows error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to get shows",
                            error:
                                err.message
                        });

                }


                if (
                    results.length === 0
                ) {

                    return res
                        .status(404)
                        .json({
                            message:
                                "No shows found"
                        });

                }


                res.json(results);

            }
        );

    }
);


// ==================================================
// GET MOVIE THEATRES / SCREENS
// ==================================================

app.get(
    "/api/movies/:id/theatres",
    (req, res) => {

        const movieId =
            req.params.id;


        const sql = `
            SELECT
                theatres.id
                    AS theatre_id,

                theatres.name,

                theatres.location,

                theatres.city,

                shows.id
                    AS show_id,

                DATE_FORMAT(
                    shows.show_date,
                    '%Y-%m-%d'
                )
                    AS show_date,

                shows.show_time,

                shows.variation

            FROM shows

            JOIN theatres
                ON shows.theatre_id =
                   theatres.id

            WHERE
                shows.movie_id = ?

            ORDER BY
                shows.show_date,
                shows.variation,
                theatres.id,
                STR_TO_DATE(
                    shows.show_time,
                    '%h:%i %p'
                )

        `;


        db.query(
            sql,
            [movieId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Theatre error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to get theatres"
                        });

                }


                res.json(results);

            }
        );

    }
);


// ==================================================
// GET SEATS FOR A SHOW
// ==================================================

app.get(
    "/api/shows/:showId/seats",
    (req, res) => {

        const showId =
            req.params.showId;


        const sql = `
            SELECT
                seats.id,

                seats.theatre_id,

                seats.seat_row,

                seats.seat_number,

                seats.seat_type,

                CONCAT(
                    seats.seat_row,
                    seats.seat_number
                )
                    AS seat_name,

                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM bookings

                        WHERE
                            bookings.show_id =
                                shows.id

                            AND

                            bookings.seat_id =
                                seats.id

                            AND

                            bookings.payment_status =
                                'SUCCESS'
                    )
                    THEN 1

                    ELSE 0

                END
                    AS booked

            FROM seats

            JOIN shows
                ON shows.theatre_id =
                   seats.theatre_id

            WHERE
                shows.id = ?

            ORDER BY
                seats.seat_row,
                seats.seat_number

        `;


        db.query(
            sql,
            [showId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Seats error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to get seats",
                            error:
                                err.message
                        });

                }


                if (
                    results.length === 0
                ) {

                    return res
                        .status(404)
                        .json({
                            message:
                                "No seats found for this show"
                        });

                }


                res.json(results);

            }
        );

    }
);


// ==================================================
// CREATE BOOKING
// ==================================================

app.post(
    "/api/bookings",
    (req, res) => {

        const {
            show_id,
            seats,
            amount,
            payment_method
        } = req.body;


        // ------------------------------------------
        // BASIC VALIDATION
        // ------------------------------------------

        if (
            !show_id ||
            !Array.isArray(seats) ||
            seats.length === 0 ||
            !amount ||
            !payment_method
        ) {

            return res
                .status(400)
                .json({
                    message:
                        "Invalid booking details"
                });

        }


        const allowedMethods = [
            "UPI",
            "CARD",
            "NETBANKING"
        ];


        if (
            !allowedMethods.includes(
                payment_method
            )
        ) {

            return res
                .status(400)
                .json({
                    message:
                        "Invalid payment method"
                });

        }


        // ------------------------------------------
        // CHECK SHOW
        // ------------------------------------------

        const showSql = `

            SELECT
                id,
                show_date,
                show_time

            FROM shows

            WHERE id = ?

        `;


        db.query(
            showSql,
            [show_id],
            (showErr, showResults) => {

                if (showErr) {

                    console.log(
                        "Show booking error:",
                        showErr
                    );

                    return res
                        .status(500)
                        .json({
                            message:
                                "Database error"
                        });

                }


                if (
                    showResults.length === 0
                ) {

                    return res
                        .status(404)
                        .json({
                            message:
                                "Show not found"
                        });

                }


                const show =
                    showResults[0];


                // ---------------------------------
                // SHOW TIME
                // ---------------------------------

                const showDate =
                    new Date(show.show_date);


                const [
                    timePart,
                    ampm
                ] =
                    show.show_time
                        .trim()
                        .split(" ");


                const [
                    hoursPart,
                    minutesPart
                ] =
                    timePart
                        .split(":");


                let hours =
                    Number(hoursPart);

                const minutes =
                    Number(minutesPart);


                if (
                    ampm.toUpperCase() === "PM" &&
                    hours !== 12
                ) {

                    hours += 12;

                }


                if (
                    ampm.toUpperCase() === "AM" &&
                    hours === 12
                ) {

                    hours = 0;

                }


                showDate.setHours(
                    hours,
                    minutes,
                    0,
                    0
                );


                // ---------------------------------
                // CURRENT INDIA TIME
                // ---------------------------------

                const now =
                    new Date(
                        new Date().toLocaleString(
                            "en-US",
                            {
                                timeZone:
                                    "Asia/Kolkata"
                            }
                        )
                    );


                const currentTime =
                    now.getTime();

                const showTime =
                    showDate.getTime();

                const difference =
                    showTime -
                    currentTime;


                // ---------------------------------
                // SHOW ALREADY STARTED
                // ---------------------------------

                if (
                    difference <= 0
                ) {

                    return res
                        .status(400)
                        .json({
                            message:
                                "This show has already started."
                        });

                }


                // ---------------------------------
                // 10 MINUTE CUTOFF
                // ---------------------------------

                if (
                    difference <
                    10 * 60 * 1000
                ) {

                    return res
                        .status(400)
                        .json({
                            message:
                                "Booking is closed 10 minutes before the show."
                        });

                }


                // ---------------------------------
                // CHECK SELECTED SEATS
                // ---------------------------------

                const seatPlaceholders =
                    seats
                        .map(() => "?")
                        .join(",");


                const bookedSql = `

                    SELECT
                        bookings.seat_id

                    FROM bookings

                    WHERE
                        bookings.show_id = ?

                        AND

                        bookings.seat_id
                        IN (${seatPlaceholders})

                        AND

                        bookings.payment_status =
                            'SUCCESS'

                `;


                db.query(
                    bookedSql,
                    [
                        show_id,
                        ...seats
                    ],
                    (bookErr, bookedRows) => {

                        if (bookErr) {

                            console.log(
                                "Booked seat check error:",
                                bookErr
                            );

                            return res
                                .status(500)
                                .json({
                                    message:
                                        "Unable to check seat availability"
                                });

                        }


                        if (
                            bookedRows.length > 0
                        ) {

                            return res
                                .status(409)
                                .json({
                                    message:
                                        "One or more selected seats are already booked."
                                });

                        }


                        // ---------------------------------
                        // BOOKING REFERENCE
                        // ---------------------------------

                        const bookingReference =
                            "CH" +
                            Date.now()
                                .toString()
                                .slice(-8);


                        // ---------------------------------
                        // USER
                        // ---------------------------------

                        const userId =
                            req.session.user
                                ? req.session.user.id
                                : null;


                        // ---------------------------------
                        // INSERT SEATS
                        // ---------------------------------

                        const insertSeat = (
                            index
                        ) => {

                            // ==========================================
                            // ALL SEATS INSERTED
                            // ==========================================

                            if (
                                index >=
                                seats.length
                            ) {

                                // ==========================================
                                // SEND BOOKING SUCCESS RESPONSE ONLY ONCE
                                // ==========================================

                                res.json({
                                    success: true,
                                    booking_reference:
                                        bookingReference,
                                    message:
                                        "Booking successful"
                                });


                                // ==========================================
                                // SEND BOOKING CONFIRMATION EMAIL
                                // ==========================================

                                const userEmail =
                                    req.session.user
                                        ? req.session.user.email
                                        : null;


                                const userName =
                                    req.session.user
                                        ? req.session.user.name
                                        : "Customer";


                                if (userEmail) {

                                    const emailSql = `

                                        SELECT

                                            movies.title AS movie_title,

                                            shows.show_date,

                                            shows.show_time,

                                            shows.variation,

                                            theatres.name AS screen_name

                                        FROM shows

                                        JOIN movies
                                            ON shows.movie_id =
                                               movies.id

                                        JOIN theatres
                                            ON shows.theatre_id =
                                               theatres.id

                                        WHERE shows.id = ?

                                    `;


                                    db.query(
                                        emailSql,
                                        [show_id],
                                        (
                                            emailErr,
                                            emailResults
                                        ) => {

                                            if (
                                                emailErr
                                            ) {

                                                console.log(
                                                    "Email booking details error:",
                                                    emailErr
                                                );

                                                return;

                                            }


                                            if (
                                                !emailResults ||
                                                emailResults.length === 0
                                            ) {

                                                console.log(
                                                    "Booking email details not found."
                                                );

                                                return;

                                            }


                                            const showDetails =
                                                emailResults[0];


                                            // ==========================================
                                            // GET SELECTED SEAT NAMES
                                            // ==========================================

                                            const seatSql = `

                                                SELECT

                                                    CONCAT(
                                                        seats.seat_row,
                                                        seats.seat_number
                                                    ) AS seat_name

                                                FROM bookings

                                                JOIN seats
                                                    ON bookings.seat_id =
                                                       seats.id

                                                WHERE
                                                    bookings.booking_reference = ?

                                            `;


                                            db.query(
                                                seatSql,
                                                [bookingReference],
                                                async (
                                                    seatErr,
                                                    seatResults
                                                ) => {

                                                    if (
                                                        seatErr
                                                    ) {

                                                        console.log(
                                                            "Email seat error:",
                                                            seatErr
                                                        );

                                                    }


                                                    const seatNames =
                                                        !seatErr &&
                                                        seatResults

                                                            ? seatResults
                                                                .map(
                                                                    seat =>
                                                                        seat.seat_name
                                                                )
                                                                .join(", ")

                                                            : seats.join(", ");


                                                    // ==========================================
                                                    // EMAIL
                                                    // ==========================================

                                                    const mailOptions = {

                                                        from:
                                                            process.env.EMAIL_USER,

                                                        to:
                                                            userEmail,

                                                        subject:
                                                            "CineHub - Booking Confirmed 🎬",

                                                        html: `

                                                            <div style="
                                                                font-family: Arial, sans-serif;
                                                                max-width: 600px;
                                                                margin: auto;
                                                                padding: 25px;
                                                                background: #171129;
                                                                color: #f7f1e8;
                                                                border-radius: 15px;
                                                            ">

                                                                <h1 style="
                                                                    color: #F4C43D;
                                                                    text-align: center;
                                                                ">
                                                                    🎬 CineHub
                                                                </h1>


                                                                <h2 style="
                                                                    text-align: center;
                                                                    color: #F4C43D;
                                                                ">
                                                                    Booking Confirmed!
                                                                </h2>


                                                                <p>
                                                                    Hello
                                                                    <strong>
                                                                        ${userName}
                                                                    </strong>,
                                                                </p>


                                                                <p>
                                                                    Your movie tickets have been
                                                                    successfully booked.
                                                                </p>


                                                                <hr>


                                                                <p>
                                                                    <strong>Movie:</strong>
                                                                    ${showDetails.movie_title}
                                                                </p>


                                                                <p>
                                                                    <strong>Date:</strong>
                                                                    ${showDetails.show_date}
                                                                </p>


                                                                <p>
                                                                    <strong>Time:</strong>
                                                                    ${showDetails.show_time}
                                                                </p>


                                                                <p>
                                                                    <strong>Screen:</strong>
                                                                    ${showDetails.screen_name}
                                                                </p>


                                                                <p>
                                                                    <strong>Format:</strong>
                                                                    ${showDetails.variation}
                                                                </p>


                                                                <p>
                                                                    <strong>Seats:</strong>
                                                                    ${seatNames}
                                                                </p>


                                                                <p>
                                                                    <strong>Booking ID:</strong>
                                                                    ${bookingReference}
                                                                </p>


                                                                <p>
                                                                    <strong>Amount Paid:</strong>
                                                                    ₹${Number(amount).toFixed(2)}
                                                                </p>


                                                                <p>
                                                                    <strong>Payment Method:</strong>
                                                                    ${payment_method}
                                                                </p>


                                                                <hr>


                                                                <p style="
                                                                    text-align: center;
                                                                    color: #F4C43D;
                                                                ">
                                                                    Thank you for booking with CineHub!
                                                                </p>

                                                            </div>

                                                        `

                                                    };


                                                    // ==========================================
                                                    // SEND EMAIL
                                                    // ==========================================

                                                    try {
    const { data, error } = await resend.emails.send({
        from: "CineHub <onboarding@resend.dev>",
        to: userEmail,
        subject: mailOptions.subject,
        html: mailOptions.html
    });

    if (error) {
        console.log("Resend booking email error:");
        console.log(error);
    } else {
        console.log(
            "Booking confirmation email sent to:",
            userEmail
        );
        console.log("Email ID:", data.id);
    }

} catch (emailError) {
    console.log(
        "Resend booking email error:",
        emailError
    );
}

                                                }
                                            );

                                        }
                                    );

                                }


                                // ==========================================
                                // VERY IMPORTANT
                                // ==========================================
                                // Do NOT send another res.json()
                                // after this point.

                                return;

                            }


                            // ==========================================
                            // INSERT BOOKING
                            // ==========================================

                            const insertSql = `

                                INSERT INTO bookings

                                (
                                    booking_reference,
                                    user_id,
                                    show_id,
                                    seat_id,
                                    amount,
                                    payment_method,
                                    payment_status
                                )

                                VALUES
                                (?, ?, ?, ?, ?, ?, 'SUCCESS')

                            `;


                            const seatAmount =
                                Number(amount) /
                                seats.length;


                            db.query(
                                insertSql,
                                [
                                    bookingReference,
                                    userId,
                                    show_id,
                                    seats[index],
                                    seatAmount,
                                    payment_method
                                ],
                                (insertErr) => {

                                    if (insertErr) {

                                        console.log(
                                            "Booking insert error:",
                                            insertErr
                                        );


                                        if (
                                            insertErr.code ===
                                            "ER_DUP_ENTRY"
                                        ) {

                                            return res
                                                .status(409)
                                                .json({
                                                    message:
                                                        "One of the selected seats was just booked by another user."
                                                });

                                        }


                                        return res
                                            .status(500)
                                            .json({
                                                message:
                                                    "Failed to create booking"
                                            });

                                    }


                                    insertSeat(
                                        index + 1
                                    );

                                }
                            );

                        };


                        insertSeat(0);

                    }
                );

            }
        );

    }
);


// ==================================================
// ROOT PAGE
// ==================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            "index.html",
            {
                root: "Public"
            }
        );

    }
);


// ==================================================
// GET MY BOOKINGS
// ==================================================

app.get(
    "/api/my-bookings",
    (req, res) => {

        // User must be logged in

        if (!req.session.user) {

            return res
                .status(401)
                .json({
                    message:
                        "Please login first."
                });

        }


        const userId =
            req.session.user.id;


        const sql = `

            SELECT

                bookings.id,

                bookings.booking_reference,

                bookings.show_id,

                bookings.seat_id,

                bookings.amount,

                bookings.payment_method,

                bookings.payment_status,

                bookings.booked_at,


                movies.title AS movie_title,


                DATE_FORMAT(
                    shows.show_date,
                    '%Y-%m-%d'
                ) AS show_date,


                shows.show_time,

                shows.variation,


                theatres.name AS screen_name,


                seats.seat_row,

                seats.seat_number,

                seats.seat_type


            FROM bookings


            JOIN shows
                ON bookings.show_id =
                   shows.id


            JOIN movies
                ON shows.movie_id =
                   movies.id


            JOIN theatres
                ON shows.theatre_id =
                   theatres.id


            JOIN seats
                ON bookings.seat_id =
                   seats.id


            WHERE

                bookings.user_id = ?


                AND bookings.payment_status =
                    'SUCCESS'


                AND TIMESTAMP(

                    shows.show_date,

                    STR_TO_DATE(
                        shows.show_time,
                        '%h:%i %p'
                    )

                ) + INTERVAL 3 HOUR > NOW()


            ORDER BY

                bookings.booked_at DESC,

                bookings.id DESC

        `;


        db.query(
            sql,
            [userId],
            (err, results) => {

                if (err) {

                    console.log(
                        "My bookings error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({
                            message:
                                "Failed to load bookings"
                        });

                }


                res.json(results);

            }
        );

    }
);


// ==================================================
// START SERVER
// ==================================================

app.listen(
    process.env.PORT || 3000,
    () => {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            "CineHub server running!"
        );

        console.log(
    `Server running on port ${process.env.PORT || 3000}`
);

        console.log(
            "================================"
        );

        console.log("");

    }
);
