# smartos-isomerge: Unpack, Add Files and Repack a SmartOS ISO

## Introduction

If you want to add (or replace) a few files in a SmartOS ISO, this utility will
unpack the ISO, merge files and repack the ISO automatically.  It should work
on any illumos system, provided you have `root` access in a zone that enables
the use of `lofiadm(1M)`, `ufs(7FS)` and `hsfs(7FS)`.

## Usage

First, create a JSON file to provide a working directory, and ISO and a list of
files to the utility.  e.g.

```javascript
{
  "workdir": "/var/tmp/ISOMERG",
  "inputiso": "/sysmgr/apps/smartos/releases/smartos-20120223T221136Z.iso",
  "mergefiles": {
    "/etc/issue": { "owner": "root", "group": "sys", "perms": "0444",
                     "src": "/tmp/newissue" }
  }
}
```

Then, invoke the utility:

```
# ./merge.js < input.json
 * mkdir /var/tmp/ISOMERG
 * lofi add /sysmgr/apps/smartos/releases/smartos-20120223T221136Z.iso
    - device: /dev/lofi/1
 * fstyp /dev/lofi/1
    - type: hsfs
 * mkdir /var/tmp/ISOMERG/iso
....
...
..
 * mkisofs /var/tmp/ISOMERG/output.iso
 * done
```
