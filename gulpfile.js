const fs = require("fs");
const gulp = require("gulp");
const sass = require("gulp-sass");
const mkdirp = require("mkdirp");
const uglify = require("gulp-uglify");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const browserify = require("browserify");

mkdirp("dist");

gulp.task("compile:js", () => {
    return browserify("src/js/threesy-line.js", {debug: true, standalone: "ThreesyLine"})
        .transform("babelify")
        .bundle()
        .pipe(source("threesy-line.js"))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});

gulp.task("compile:sass", () => {
    return gulp.src("src/sass/**/*.scss")
        .pipe(sass())
        .pipe(gulp.dest('dist'));
});

gulp.task("default", ["compile:js", "compile:sass"]);