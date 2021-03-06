'use strict'

const babelify = require('babelify')
const browserify = require('browserify')
const del = require('del')
const gulp = require('gulp')
const merge2 = require('merge2')
const uglify = require('gulp-uglify')
const path = require('path')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const fs = require('fs')

function bundle (indexFile, dir, deps, useUglify, cb) {
  let chain = browserify(indexFile, { debug: true })
    .transform(babelify)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())

  if (useUglify) {
    chain = chain.pipe(uglify())
  }

  chain = chain.pipe(gulp.dest(dir))

  let stream = merge2(chain)

  for (let key in deps) {
    stream.add(
      gulp.src(key)
        .pipe(gulp.dest(path.join(dir, deps[key])))
    )
  }

  stream.on('queueDrain', cb)
}

function createTasks (name, uglify = true) {
  gulp.task(`clean-${name}`, (done) => {
    return del(`./build/${name}`, { force: true })
  })

  gulp.task(`build-${name}`, (cb) => {
    bundle('./src/shared/index.js', `./build/${name}`, {
      [`./src/${name}/manifest.json`]: '',
      './src/shared/images/*': 'images',
      './src/shared/popup/*': 'popup'
    }, uglify, cb)
  })

  gulp.task(`manifest-${name}`, (done) => {
    let manifestFile = `./build/${name}/manifest.json`
    let manifest = require(manifestFile)
    let sources = require('./src/shared/sources.json')
    let permissions = manifest['permissions']
    for (let x in sources['sources']) {
      let urls = sources['sources'][x]['urls']
      for (let y in urls) {
        permissions.push(urls[y])
      }
    }
    let jsonOutput = JSON.stringify(manifest, null, 2)
    fs.writeFileSync(manifestFile, jsonOutput, 'utf8')
    done()
  })


  gulp.task(name, gulp.series(`clean-${name}`, `build-${name}`, `manifest-${name}`))
}

createTasks('firefox')

createTasks('chrome', false)
