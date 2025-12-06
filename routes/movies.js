const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Movie = require("../models/Movie");
const requireLogin = require("../middleware/requireLogin");


router.use(requireLogin);


async function checkOwner(req, res, next) {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.redirect("/movies");
  if (movie.addedBy.toString() !== req.session.userId)
    return res.redirect("/movies");
  next();
}

router.get("/", async (req, res) => {
  const movies = await Movie.find();
  res.render("movielist", { movies });
});

router.get("/add", (req, res) => res.render("addmovie"));

router.post("/add", [
  check("title").notEmpty(),
  check("description").notEmpty(),
  check("year").isInt({ min: 1800 }),
  check("genres").notEmpty(),
  check("rating").isFloat({ min: 0, max: 10 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.render("addmovie", { errors: errors.array() });

  const { title, description, year, genres, rating } = req.body;

  await Movie.create({
    title,
    description,
    year,
    genres: genres.split(","),
    rating,
    addedBy: req.session.userId,
  });

  res.redirect("/movies");
});

router.get("/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.redirect("/movies");
  res.render("moviedetails", { movie });
});

router.get("/edit/:id", checkOwner, async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  res.render("editmovie", { movie });
});

router.post("/edit/:id",
  checkOwner,
  [
    check("title").notEmpty(),
    check("description").notEmpty(),
    check("year").isInt({ min: 1800 }),
    check("genres").notEmpty(),
    check("rating").isFloat({ min: 0, max: 10 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const movie = await Movie.findById(req.params.id);
      return res.render("editmovie", { movie, errors: errors.array() });
    }

    const { title, description, year, genres, rating } = req.body;

    await Movie.findByIdAndUpdate(req.params.id, {
      title,
      description,
      year,
      genres: genres.split(","),
      rating,
    });

    res.redirect("/movies");
  }
);

router.post("/delete/:id", checkOwner, async (req, res) => {
  await Movie.findByIdAndDelete(req.params.id);
  res.redirect("/movies");
});

module.exports = router;
