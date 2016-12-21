const fs = require("fs");
const gulp = require("gulp");
const sass = require("gulp-sass");
const mkdirp = require("mkdirp");
const rollup = require("rollup");
const babel = require("rollup-plugin-babel");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");
const nodeResolve = require("rollup-plugin-node-resolve");

mkdirp("build");

gulp.task("compile:js", () => {
  let rollupOpts = {
    entry: "js/threesy-line.js",
    plugins: [babel(), nodeResolve({jsnext: true, main: true})]
  };

  let writeOpts = {
    format: "iife",
    exports: "default",
    moduleName: "ThreesyLine",
    indent: true,
    dest: "build/threesy-line.js"
  };

  rollup.rollup(rollupOpts).then((bundle) => {
    bundle.write(writeOpts).then(() => {
      gulp.src("build/threesy-line.js")
          .pipe(uglify())
          .pipe(rename({suffix: ".min"}))
          .pipe(gulp.dest("build"));
    });
  });
});

gulp.task("compile:sass", () => {
  return gulp.src("sass/**/*.scss")
      .pipe(sass())
      .pipe(gulp.dest('build'));
});

gulp.task("default", ["compile:js", "compile:sass"]);