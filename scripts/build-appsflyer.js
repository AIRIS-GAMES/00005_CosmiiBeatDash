const path = require('node:path');
require('esbuild').buildSync({
  entryPoints:[path.join(__dirname,'appsflyer-entry.mjs')],
  outfile:path.join(__dirname,'../cosmii-appsflyer.js'),
  bundle:true, format:'iife', platform:'browser', target:'safari15',
  minify:true, legalComments:'eof',
});
