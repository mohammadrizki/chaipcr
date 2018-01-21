var requireDir = require('require-dir');
var tasks = requireDir('./frontend/tasks');

// start angular 2 tasks

const gulp = require('gulp')
const { exec } = require('child_process')
const del = require('del')

gulp.task('ng2:debug', (done) => {
  process.chdir('./ng2')
  exec('./node_modules/.bin/ng build --no-progress', (err, stdout, stderr) => {
    console.log(err)
    console.log(stdout)
    console.log(stderr)
    process.chdir('..')
    done()
  })
})

gulp.task('ng2:deploy', (done) => {
  process.chdir('./ng2')
  exec('./node_modules/.bin/ng build --target=production --no-progress', (err, stdout, stderr) => {
    console.log(err)
    console.log(stdout)
    console.log(stderr)
    process.chdir('..')
    done()
  })
})

