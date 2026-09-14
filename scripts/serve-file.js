const fs=require('node:fs');
module.exports=(req,res,file)=>{
 const size=fs.statSync(file).size;res.setHeader('Accept-Ranges','bytes');
 const range=req.headers.range;
 if(range){
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  let start=match&&match[1]?Number(match[1]):0,end=match&&match[2]?Number(match[2]):size-1;
  if(match&&!match[1]&&match[2]){start=Math.max(0,size-Number(match[2]));end=size-1;}
  if(!match||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
  end=Math.min(end,size-1);res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
 }else{res.setHeader('Content-Length',size);if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);}
};
