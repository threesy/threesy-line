const fs = require("fs");
const gulp = require("gulp");
const sass = require("gulp-sass");
const mkdirp = require("mkdirp");
const rollup = require("rollup");
const babel = require("rollup-plugin-babel");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");
const nodeResolve = require("rollup-plugin-node-resolve");

mkdirp("dist");

gulp.task("compile:js", () => {
  let rollupOpts = {
    entry: "src/js/threesy-line.js",
    plugins: [babel(), nodeResolve({jsnext: true, main: true})]
  };

  let writeOpts = {
    format: "iife",
    exports: "default",
    moduleName: "ThreesyLine",
    indent: true,
    dest: "dist/threesy-line.js"
  };

  rollup.rollup(rollupOpts).then((bundle) => {
    bundle.write(writeOpts).then(() => {
      gulp.src("dist/threesy-line.js")
          .pipe(uglify())
          .pipe(rename({suffix: ".min"}))
          .pipe(gulp.dest("dist"));
    });
  });
});

gulp.task("compile:sass", () => {
  return gulp.src("src/sass/**/*.scss")
      .pipe(sass())
      .pipe(gulp.dest('dist'));
});

gulp.task("default", ["compile:js", "compile:sass"]);