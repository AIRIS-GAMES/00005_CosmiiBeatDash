// Capacitor on Windows writes backslashes into Swift local-package paths.
// Keep generated manifests valid Swift and portable to the Mac build machine.
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../ios/App/CapApp-SPM/Package.swift');
const before=fs.readFileSync(file,'utf8');
const after=before.replace(/path: "([^"\r\n]+)"/g,(_,value)=>'path: "'+value.replace(/\\/g,'/')+'"');
if(after!==before)fs.writeFileSync(file,after);
console.log('iOS SPM local dependency paths normalized.');
