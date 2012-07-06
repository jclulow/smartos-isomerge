#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var $ = require('async');
var mkdirp = require('mkdirp');
var execFile = require('child_process').execFile;
var assert = require('assert');
var colorize = require('colorize');

function stopOnError(err)
{
  if (err) {
    log('ERROR: ' + err.message);
    process.exit(1);
  }
}

function log()
{
  colorize.console.log.apply(colorize.console, arguments);
}

function makeNewDir(dir, callback)
{
  log(' * #cyan[mkdir] ' + dir);
  $.series([
    function(next) {
      path.exists(dir, function(exists) {
        var err = !exists ? null :
          new Error('work dir (' + dir + ') exists already');
        next(err);
      });
    },
    $.apply(mkdirp, dir)
  ], function(err) { callback(err); });
}

var lofilog = {};
function lofiadm(options, callback)
{
  var args = [];
  var output = false;
  assert(options.action);
  var action = options.action.toUpperCase();
  switch (action) {
  case 'ADD':
    log(' * #cyan[lofi add] ' + options.file);
    assert(options.file);
    args = ['-a', options.file];
    output = true;
    break;
  case 'REMOVE':
    log(' * #cyan[lofi remove] ' + options.device);
    assert(options.device);
    args = ['-d', options.device];
    break;
  case 'UNCOMPRESS':
    log(' * #cyan[lofi uncompress] ' + options.file);
    assert(options.file);
    args = ['-U', options.file];
    break;
  case 'COMPRESS':
    log(' * #cyan[lofi compress] ' + options.file);
    assert(options.file);
    args = ['-C', 'gzip', options.file];
    break;
  default:
    assert(false, 'unexpected action ' + options.action);
  }
  execFile('/usr/sbin/lofiadm', args, function(err, stdout, stderr) {
    if (err) return callback(err);
    var out = stdout.trim();
    switch (action) {
    case 'ADD':
      log('    - #green[device:] ' + out);
      lofilog[out] = options.file;
      break;
    case 'REMOVE':
      delete lofilog[options.device];
      break;
    }
    if (output) return callback(null, out);
    return callback();
  });
}

function fstyp(device, callback)
{
  assert(device);
  log(' * #cyan[fstyp] ' + device);
  execFile('/usr/sbin/fstyp', [ device ], function(err, stdout, stderr) {
    if (err) return callback(err);
    var out = stdout.trim();
    log('    - #green[type:] ' + out);
    return callback(null, out);
  });
}

function umount(point, callback)
{
  assert(point);
  log(' * #cyan[umount] ' + point);
  execFile('/sbin/umount', [ point ], function(err, stdout, stderr) {
    if (err) return callback(err);
    return callback(null);
  });
}

function mv(options, callback)
{
  assert(options.from);
  assert(options.to);
  log(' * #cyan[mv from] ' + options.from);
  log('   #cyan[     to] ' + options.to);
  var args = [options.from, options.to];
  execFile('/bin/mv', args, function(err, stdout, stderr) {
    if (err) return callback(err);
    return callback(null);
  });
}

function cp(options, callback)
{
  assert(options.from);
  assert(options.to);
  log(' * #cyan[cp from] ' + options.from);
  log('   #cyan[     to] ' + options.to);
  var args = [options.from, options.to];
  if (options.recursive)
    args.unshift('-r');
  execFile('/bin/cp', args, function(err, stdout, stderr) {
    if (err) return callback(err);
    return callback(null);
  });
}

function mount(options, callback)
{
  assert(options.fstyp);
  assert(options.special);
  assert(options.mountpoint);
  log(' * #cyan[mount ' + options.fstyp + '] ' + options.special);
  log('       #cyan[on] ' + options.mountpoint);
  var args = ['-F', options.fstyp];
  if (options.options) {
    args.push('-o');
    args.push(options.options.join(','));
    log('     #cyan[opts] ' + options.options.join(' '));
  }
  args.push(options.special);
  args.push(options.mountpoint);
  execFile('/sbin/mount', args, function(err, stdout, stderr) {
    if (err) return callback(err);
    return callback(null);
  });
}

function fsck(device, callback)
{
  assert(device);
  log(' * #cyan[fsck] ' + device);
  var args = ['-y', device];
  execFile('/usr/sbin/fsck', args, function(err, stdout, stderr) {
    if (err) return callback(err);
    return callback();
  });
}

function mkisofs(options, callback)
{
  assert(options.isofile);
  assert(options.srcdir);
  log(' * #cyan[mkisofs] ' + options.isofile);
  var args = ['-R', '-b', 'boot/grub/stage2_eltorito', '-no-emul-boot',
    '-boot-load-size', '4', '-boot-info-table', '-quiet',
    '-o', options.isofile, options.srcdir];
  execFile('mkisofs', args, function(err, stdout, stderr) {
    if (err) return callback(err);
    return callback();
  });
}

module.exports.stopOnError = stopOnError;
module.exports.log = log;
module.exports.makeNewDir = makeNewDir;
module.exports.lofiadm = lofiadm;
module.exports.mkisofs = mkisofs;
module.exports.fstyp = fstyp;
module.exports.fsck = fsck;
module.exports.mount = mount;
module.exports.umount = umount;
module.exports.cp = cp;
module.exports.mv = mv;
