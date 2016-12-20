const fs = require("fs");
const gulp = require("gulp");
const sass = require("gulp-sass");
const mkdirp = require("mkdirp");
const browserify = require("browserify");

mkdirp("dist");

gulp.task("compile:js", () => {
    return browserify("src/js/threesy-line.js", {debug: true, standalone: "ThreesyLine"})
        .transform("babelify")
        .bundle()
        .pipe(fs.createWriteStream("dist/threesy-line.js"));
});

gulp.task("compile:sass", () => {
    return gulp.src("src/sass/**/*.scss")
        .pipe(sass())
        .pipe(gulp.dest('dist'));
});

gulp.task("default", ["compile:js", "compile:sass"]);