#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var $ = require('async');
var mkdirp = require('mkdirp');
var execFile = require('child_process').execFile;
var assert = require('assert');
var colorize = require('colorize');
var config = require('./lib/config');
var _ = require('./lib/u');
var log = _.log;

config.readStdinConfig(function(err, C) {
  _.stopOnError(err);

  var isodev = null;
  var badev = null;
  var usrdev = null;
  var rootdir = path.join(C.workdir, 'root');
  var usrdir = path.join(rootdir, 'usr');
  var isodir = path.join(C.workdir, 'iso');
  var isounpackdir = path.join(C.workdir, 'isounpack');
  var bootarchive = path.join(isounpackdir, 'platform', 'i86pc', 'amd64',
    'boot_archive');
  var usrlgz = path.join(rootdir, 'usr.lgz');
  var tmpusrlgz = path.join(C.workdir, 'tmpusr.lgz');
  var outputiso = path.join(C.workdir, 'output.iso');

  $.waterfall([
    // make the work directory:
    $.apply(_.makeNewDir, C.workdir),

    // extract the ISO:
    $.apply(_.lofiadm, { action: 'add', file: C.inputiso }),
    function(dev, next) {
      isodev = dev;
      _.fstyp(isodev, next);
    },
    function(typ, next) {
      assert.equal(typ, 'hsfs', 'expected an iso');
      _.makeNewDir(isodir, next);
    },
    function(next) {
      _.mount({ fstyp: 'hsfs', special: isodev, options: [ 'ro' ],
        mountpoint: isodir }, next);
    },
    $.apply(_.cp, { recursive: true, from: isodir, to: isounpackdir }),
    $.apply(_.umount, isodir),
    $.apply(fs.rmdir, isodir),
    function(next) {
      _.lofiadm({ action: 'remove', device: isodev }, next);
    },

    // mount the boot_archive:
    $.apply(_.lofiadm, { action: 'add', file: bootarchive }),
    function(dev, next) {
      badev = dev;
      _.fstyp(badev, next);
    },
    function(typ, next) {
      assert.equal(typ, 'ufs', 'expected a ufs boot_archive');
      _.makeNewDir(rootdir, next);
    },
    function(next) {
      _.fsck(badev, next);
    },
    function(next) {
      _.mount({ fstyp: 'ufs', special: badev, mountpoint: rootdir,
        options: [ 'rw', 'nologging' ] }, next);
    },

    // extract the compressed /usr lofi image
    $.apply(_.mv, { from: usrlgz, to: tmpusrlgz }),
    $.apply(_.lofiadm, { action: 'uncompress', file: tmpusrlgz }),

    // mount the /usr image
    $.apply(_.lofiadm, { action: 'add', file: tmpusrlgz }),
    function(dev, next) {
      usrdev = dev;
      _.fstyp(usrdev, next);
    },
    function(typ, next) {
      assert.equal(typ, 'ufs', 'expected a ufs usr.lgz');
      next();
    },
    function(next) {
      _.fsck(usrdev, next);
    },
    function(next) {
      _.mount({ fstyp: 'ufs', special: usrdev, mountpoint: usrdir,
        options: [ 'rw', 'nologging' ] }, next);
    },

    // XXX MERGE FILES!

    $.apply(_.umount, usrdir),
    function(next) {
      _.fsck(usrdev, next);
    },
    function(next) {
      _.lofiadm({ action: 'remove', device: usrdev }, next);
    },
    $.apply(_.lofiadm, { action: 'compress', file: tmpusrlgz }),
    $.apply(_.mv, { from: tmpusrlgz, to: usrlgz }),
    $.apply(_.umount, rootdir),
    function(next) {
      _.fsck(badev, next);
    },
    function(next) {
      _.lofiadm({ action: 'remove', device: badev }, next);
    },
    $.apply(fs.rmdir, rootdir),

    $.apply(_.mkisofs, { isofile: outputiso, srcdir: isounpackdir + '/' })
  ],
  function(err) {
    _.stopOnError(err);
    log(' * #green[done]');
  });
});
